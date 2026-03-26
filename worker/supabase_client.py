"""Minimal Supabase REST client for the CallDeck worker."""

import httpx
from worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY


def _headers(prefer: str = "return=minimal") -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def _clean(data: dict) -> dict:
    """Remove None values from a dict."""
    return {k: v for k, v in data.items() if v is not None}


def update_lead(lead_id: str, data: dict) -> None:
    """PATCH /rest/v1/leads?id=eq.{lead_id}"""
    url = f"{SUPABASE_URL}/rest/v1/leads"
    params = {"id": f"eq.{lead_id}"}
    with httpx.Client() as client:
        resp = client.patch(url, headers=_headers(), params=params, json=_clean(data))
        resp.raise_for_status()


def upsert_contact(
    lead_id: str,
    name: str,
    title: str | None = None,
    email: str | None = None,
    linkedin: str | None = None,
    direct_phone: str | None = None,
    is_primary: bool = False,
) -> None:
    """Check if contact exists by lead_id+name, update or insert."""
    url = f"{SUPABASE_URL}/rest/v1/contacts"
    params = {"lead_id": f"eq.{lead_id}", "name": f"eq.{name}"}

    with httpx.Client() as client:
        # Check existence
        resp = client.get(url, headers=_headers(prefer="return=representation"), params=params)
        resp.raise_for_status()
        existing = resp.json()

        payload = _clean({
            "lead_id": lead_id,
            "name": name,
            "title": title,
            "email": email,
            "linkedin": linkedin,
            "direct_phone": direct_phone,
            "is_primary": is_primary,
        })

        if existing:
            # Update existing record
            contact_id = existing[0]["id"]
            client.patch(
                url,
                headers=_headers(),
                params={"id": f"eq.{contact_id}"},
                json=payload,
            ).raise_for_status()
        else:
            # Insert new record
            client.post(url, headers=_headers(), json=payload).raise_for_status()


def upsert_social_profile(
    lead_id: str,
    platform: str,
    url: str | None = None,
    followers: int | None = None,
    notes: str | None = None,
) -> None:
    """Check if profile exists by lead_id+platform, update or insert."""
    endpoint = f"{SUPABASE_URL}/rest/v1/social_profiles"
    params = {"lead_id": f"eq.{lead_id}", "platform": f"eq.{platform}"}

    with httpx.Client() as client:
        # Check existence
        resp = client.get(endpoint, headers=_headers(prefer="return=representation"), params=params)
        resp.raise_for_status()
        existing = resp.json()

        payload = _clean({
            "lead_id": lead_id,
            "platform": platform,
            "url": url,
            "followers": followers,
            "notes": notes,
        })

        if existing:
            profile_id = existing[0]["id"]
            client.patch(
                endpoint,
                headers=_headers(),
                params={"id": f"eq.{profile_id}"},
                json=payload,
            ).raise_for_status()
        else:
            client.post(endpoint, headers=_headers(), json=payload).raise_for_status()
