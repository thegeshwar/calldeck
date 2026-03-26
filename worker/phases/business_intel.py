"""Phase 2b: Business intelligence — news, job postings, competitors."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    city = lead.get("city", "") or ""
    state = lead.get("state", "") or ""
    industry = lead.get("industry", "") or ""

    location = f"{city}, {state}".strip(", ")

    prompt = f"""Research business intelligence for: {company_name} in {location} (industry: {industry or "unknown"})

Find:
1. Recent news about this company (last 6 months)
2. Job postings (signals growth or pain points)
3. Top 3-5 local competitors in the same industry

Return ONLY this JSON:
{{
  "news": [
    {{"title": "...", "url": "...", "date": "2026-03-01", "summary": "one sentence"}}
  ],
  "job_postings": [
    {{"title": "...", "url": "...", "posted": "2026-03-01"}}
  ],
  "competitors": ["Competitor A", "Competitor B"]
}}

Use empty arrays if nothing found."""

    result = run_claude(prompt, allowed_tools="Bash,WebSearch,WebFetch")

    news = result.get("news") or []
    job_postings = result.get("job_postings") or []
    competitors = result.get("competitors") or []

    research_data = {
        "news": news,
        "job_postings": job_postings,
    }

    update_lead(lead_id, {
        "competitors": competitors,
        "research_data": research_data,
    })

    return {
        "news": news,
        "job_postings": job_postings,
        "competitors": competitors,
    }
