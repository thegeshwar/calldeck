"""Phase 1c: Social media profile discovery."""

from worker.phases.base import run_claude
from worker.supabase_client import upsert_social_profile


PLATFORM_MAP = {
    "facebook": "facebook",
    "fb.com": "facebook",
    "instagram": "instagram",
    "instagr.am": "instagram",
    "linkedin": "linkedin",
    "twitter": "twitter",
    "x.com": "twitter",
    "t.co": "twitter",
    "youtube": "youtube",
    "youtu.be": "youtube",
    "tiktok": "tiktok",
}


def _normalize_platform(raw: str) -> str:
    raw_lower = raw.lower()
    for key, val in PLATFORM_MAP.items():
        if key in raw_lower:
            return val
    return raw_lower


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    website = lead.get("website", "") or ""

    website_step = ""
    if website:
        url = website if website.startswith("http") else f"https://{website}"
        website_step = f"First check their website for social links: curl -sL '{url}' and look for facebook.com, instagram.com, linkedin.com, twitter.com, youtube.com, tiktok.com URLs in the HTML."

    prompt = f"""Find social media profiles for: {company_name}
Website: {website or "none"}

{website_step}
Also search the web for their social media presence.

Return ONLY this JSON. Only include platforms where you found a real URL:
{{
  "profiles": [
    {{"platform": "facebook", "url": "https://facebook.com/...", "followers": null}}
  ]
}}"""

    result = run_claude(prompt, allowed_tools="Bash,WebSearch,WebFetch")
    profiles = result.get("profiles") or []

    saved = []
    for profile in profiles:
        raw_platform = profile.get("platform") or ""
        url = profile.get("url")
        followers = profile.get("followers")

        if not url:
            continue

        platform = _normalize_platform(raw_platform)
        upsert_social_profile(lead_id, platform=platform, url=url, followers=followers)
        saved.append({"platform": platform, "url": url, "followers": followers})

    return {"profiles": saved}
