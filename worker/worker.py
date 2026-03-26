"""CalldDeck research worker — main SSE listener and job executor."""

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import httpx

from worker.config import (
    CALLDECK_URL,
    CALLDECK_WORKER_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    WORKER_ID,
)
from worker.phases import website_audit, reviews, social_scan, linkedin_lookup, business_intel, synthesis


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def api(base_url: str, key: str, method: str, path: str, body=None) -> dict:
    """HTTP client for CalldDeck API. Uses httpx with 30s timeout."""
    url = f"{base_url}{path}"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=30) as client:
        resp = client.request(method, url, headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


def get_lead_fresh(lead_id: str) -> dict:
    """Fetch current lead from Supabase directly (bypasses CalldDeck API).

    Needed because phases write to Supabase directly, so we need fresh
    data for subsequent phases.
    """
    url = f"{SUPABASE_URL}/rest/v1/leads"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    params = {
        "id": f"eq.{lead_id}",
        "select": "*,contacts(*),social_profiles(*)",
    }
    with httpx.Client(timeout=30) as client:
        resp = client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            raise ValueError(f"Lead {lead_id} not found in Supabase")
        return rows[0]


# ---------------------------------------------------------------------------
# Progress reporting
# ---------------------------------------------------------------------------

def report_progress(base_url: str, key: str, job_id: str, phase: str, completed: int):
    """POST progress update. Non-fatal if it fails."""
    try:
        api(base_url, key, "POST", f"/api/research/job/{job_id}/progress", {
            "phase": phase,
            "completed": completed,
        })
    except Exception as exc:
        print(f"[worker] progress report failed (non-fatal): {exc}", flush=True)


# ---------------------------------------------------------------------------
# Phase runner
# ---------------------------------------------------------------------------

def safe_run(name: str, fn, *args):
    """Run a phase function, catching exceptions. Returns {'error': str} on failure."""
    try:
        return fn(*args)
    except Exception as exc:
        print(f"[worker] phase '{name}' failed: {exc}", flush=True)
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# Research pipeline
# ---------------------------------------------------------------------------

def execute_research(base_url: str, key: str, job_id: str, lead: dict):
    """Main research pipeline: 3 phases with parallel execution in phases 1 & 2."""
    lead_id = lead["id"]

    # --- Phase 1: parallel (3 threads) ---
    print(f"[worker] job={job_id} phase1 start", flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        f_website = pool.submit(safe_run, "website_audit", website_audit.run, lead)
        f_reviews = pool.submit(safe_run, "reviews", reviews.run, lead)
        f_social = pool.submit(safe_run, "social_scan", social_scan.run, lead)
        results_p1 = {
            "website_audit": f_website.result(),
            "reviews": f_reviews.result(),
            "social_scan": f_social.result(),
        }
    print(f"[worker] job={job_id} phase1 done: {list(results_p1)}", flush=True)
    report_progress(base_url, key, job_id, "phase1_complete", 3)

    # Refresh lead from Supabase before phase 2
    lead = get_lead_fresh(lead_id)

    # --- Phase 2: parallel (2 threads) ---
    print(f"[worker] job={job_id} phase2 start", flush=True)
    is_chain = bool(lead.get("is_chain", False))
    with ThreadPoolExecutor(max_workers=2) as pool:
        f_linkedin = pool.submit(safe_run, "linkedin_lookup", linkedin_lookup.run, lead, is_chain)
        f_intel = pool.submit(safe_run, "business_intel", business_intel.run, lead)
        results_p2 = {
            "linkedin_lookup": f_linkedin.result(),
            "business_intel": f_intel.result(),
        }
    print(f"[worker] job={job_id} phase2 done: {list(results_p2)}", flush=True)
    report_progress(base_url, key, job_id, "phase2_complete", 5)

    # Refresh lead from Supabase before phase 3
    lead = get_lead_fresh(lead_id)

    # --- Phase 3: sequential ---
    print(f"[worker] job={job_id} phase3 start", flush=True)
    result_p3 = safe_run("synthesis", synthesis.run, lead)
    print(f"[worker] job={job_id} phase3 done", flush=True)

    return {**results_p1, **results_p2, "synthesis": result_p3}


# ---------------------------------------------------------------------------
# Job processor
# ---------------------------------------------------------------------------

def process_job(base_url: str, key: str, job_id: str):
    """Claim, execute, and complete (or fail) a single research job."""
    print(f"[worker] claiming job={job_id}", flush=True)
    try:
        # 1. Claim
        api(base_url, key, "POST", f"/api/research/job/{job_id}/claim")

        # 2. Get job + lead
        job_data = api(base_url, key, "GET", f"/api/research/job/{job_id}")
        lead = job_data.get("lead") or job_data

        # 3. Execute research pipeline
        execute_research(base_url, key, job_id, lead)

        # 4. Mark complete
        api(base_url, key, "POST", f"/api/research/job/{job_id}/complete")
        print(f"[worker] job={job_id} complete", flush=True)

    except Exception as exc:
        print(f"[worker] job={job_id} failed: {exc}", flush=True)
        try:
            api(base_url, key, "POST", f"/api/research/job/{job_id}/fail", {"error": str(exc)})
        except Exception as fail_exc:
            print(f"[worker] could not mark job={job_id} as failed: {fail_exc}", flush=True)


# ---------------------------------------------------------------------------
# SSE listener
# ---------------------------------------------------------------------------

def listen(base_url: str, key: str):
    """Persistent SSE connection to /api/research/stream. Auto-reconnects on errors."""
    stream_url = f"{base_url}/api/research/stream"
    headers = {
        "Authorization": f"Bearer {key}",
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
    }

    while True:
        try:
            print(f"[worker] connecting to {stream_url}", flush=True)
            with httpx.Client(timeout=None) as client:
                with client.stream("GET", stream_url, headers=headers) as resp:
                    resp.raise_for_status()
                    print("[worker] SSE stream connected", flush=True)
                    for line in resp.iter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[len("data:"):].strip()
                        if not raw:
                            continue
                        try:
                            payload = json.loads(raw)
                        except json.JSONDecodeError as exc:
                            print(f"[worker] bad JSON in SSE: {exc} — raw={raw!r}", flush=True)
                            continue

                        job_id = payload.get("job_id") or payload.get("id")
                        if job_id:
                            process_job(base_url, key, str(job_id))
                        else:
                            print(f"[worker] SSE event (no job_id): {payload}", flush=True)

        except KeyboardInterrupt:
            print("\n[worker] interrupted — exiting", flush=True)
            break

        except (httpx.ReadTimeout, httpx.ConnectError, httpx.RemoteProtocolError) as exc:
            print(f"[worker] connection error: {exc} — reconnecting in 5s", flush=True)
            time.sleep(5)

        except Exception as exc:
            print(f"[worker] unexpected error: {exc} — reconnecting in 10s", flush=True)
            time.sleep(10)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="CalldDeck research worker")
    parser.add_argument("--url", default=CALLDECK_URL, help="CalldDeck server URL")
    parser.add_argument("--key", default=CALLDECK_WORKER_KEY, help="Worker API key")
    args = parser.parse_args()

    key_prefix = args.key[:8] + "..." if len(args.key) > 8 else args.key
    print("=" * 60, flush=True)
    print(f"  CalldDeck Research Worker", flush=True)
    print(f"  Server : {args.url}", flush=True)
    print(f"  Key    : {key_prefix}", flush=True)
    print(f"  Worker : {WORKER_ID}", flush=True)
    print("=" * 60, flush=True)

    listen(args.url, args.key)


if __name__ == "__main__":
    main()
