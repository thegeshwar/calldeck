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

    prompt = f"""Use the Bash tool to find social media profiles for this business:
Company: {company_name}
Website: {website}

Steps:
1. If website is provided, fetch it and look for social media links in the HTML:
   curl -s --max-time 15 -L "{website}" -o /tmp/social_site.html 2>/dev/null
   Search /tmp/social_site.html for links containing: facebook.com, instagram.com, linkedin.com, twitter.com, x.com, youtube.com, tiktok.com

2. For each platform NOT found on the website, try a direct URL guess:
   - Facebook: curl -s --max-time 10 -o /dev/null -w "%{{http_code}}" "https://www.facebook.com/{company_name.replace(' ', '')}"
   - Instagram: curl -s --max-time 10 -o /dev/null -w "%{{http_code}}" "https://www.instagram.com/{company_name.replace(' ', '').lower()}"

3. For any profile URL found, try to get follower counts from the page HTML (look for follower/like count patterns).

Return ONLY this JSON, no markdown, no explanation. For followers use null if unknown:
{{
  "profiles": [
    {{"platform": "facebook", "url": null, "followers": null}},
    {{"platform": "instagram", "url": null, "followers": null}},
    {{"platform": "linkedin", "url": null, "followers": null}},
    {{"platform": "twitter", "url": null, "followers": null}},
    {{"platform": "youtube", "url": null, "followers": null}},
    {{"platform": "tiktok", "url": null, "followers": null}}
  ]
}}"""

    result = run_claude(prompt)
    profiles = result.get("profiles") or []

    saved = []
    for profile in profiles:
        raw_platform = profile.get("platform") or ""
        url = profile.get("url")
        followers = profile.get("followers")

        # Only save profiles where we actually found a URL
        if not url:
            continue

        platform = _normalize_platform(raw_platform)
        upsert_social_profile(lead_id, platform=platform, url=url, followers=followers)
        saved.append({"platform": platform, "url": url, "followers": followers})

    return {"profiles": saved}
