"""Phase 2a: Decision maker lookup via web search (Google + company website).

V1: Uses curl + Google search to find decision makers without Chrome.
V2 (future): Deep LinkedIn profile scraping via Chrome/osascript.
"""

import urllib.parse

from worker.phases.base import run_claude
from worker.supabase_client import update_lead, upsert_contact


def run(lead: dict, is_chain: bool = False) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    city = lead.get("city", "") or ""
    state = lead.get("state", "") or ""
    website = lead.get("website", "") or ""
    is_chain = bool(lead.get("is_chain", False))

    location = f"{city}, {state}".strip(", ")

    if is_chain:
        strategy = """This is a CHAIN/FRANCHISE business. Your goal:
1. Find the PARENT COMPANY (corporate HQ)
2. Find corporate decision makers: VP of Marketing, Director of Digital, Director of Operations, or Regional Manager
3. Get the HQ location
4. These are the people who would approve AI automation or web dev for the whole chain"""
    else:
        strategy = """This is a LOCAL SMB. Your goal:
1. Find the OWNER, General Manager, or Marketing Manager
2. This is the person who makes buying decisions for the business
3. Focus on finding their full name, title, and LinkedIn URL"""

    # Build the search queries
    company_encoded = urllib.parse.quote(company_name)
    location_encoded = urllib.parse.quote(location)

    prompt = f"""You are a sales researcher. Find the DECISION MAKER at this business — the person who would buy AI automation, web development, or SEO services.

Company: {company_name}
Location: {location}
Website: {website or "none"}
{strategy}

Use these search strategies IN ORDER (stop once you find good results):

**Strategy 1: Google for LinkedIn profiles**
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "https://www.google.com/search?q=%22{company_encoded}%22+%22{location_encoded}%22+owner+OR+manager+OR+director+site%3Alinkedin.com" -o /tmp/dm_search.html
cat /tmp/dm_search.html | grep -oP '(?<=<a href="/url\\?q=)[^"&]+linkedin[^"&]+' | head -10
cat /tmp/dm_search.html | grep -oP '[A-Z][a-z]+ [A-Z][a-z]+' | head -20

**Strategy 2: Google for company leadership**
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "https://www.google.com/search?q=%22{company_encoded}%22+owner+OR+%22general+manager%22+OR+founder+%22{location_encoded}%22" -o /tmp/dm_google.html
Read /tmp/dm_google.html for names and titles.

**Strategy 3: Company website team/about page**
{"curl -sL -A 'Mozilla/5.0' '" + website + "/about' -o /tmp/about.html && cat /tmp/about.html | grep -iP 'owner|manager|director|founder|ceo|president' | head -10" if website else "# No website — skip this step"}

**Strategy 4: Check if this is a chain**
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "https://www.google.com/search?q=%22{company_encoded}%22+franchise+OR+chain+OR+%22corporate+headquarters%22" -o /tmp/chain_check.html
Read /tmp/chain_check.html to determine if this is a franchise/chain. If so, find the parent company name and HQ location.

IMPORTANT:
- Find REAL names and titles, not generic descriptions
- If you find LinkedIn URLs, include them
- If you can identify whether this is a chain/franchise, set is_chain accordingly
- The decision maker for an SMB is typically the owner or GM
- The decision maker for a chain is typically a VP or Director at corporate

Return ONLY this JSON, no markdown, no explanation:
{{
  "company_found": true,
  "linkedin_url": null,
  "is_chain": false,
  "parent_company": null,
  "hq_location": null,
  "decision_makers": [
    {{"name": "John Smith", "title": "Owner", "linkedin_url": "https://linkedin.com/in/...", "is_primary": true}}
  ]
}}

Use null for fields you cannot find. decision_makers can be empty [] if nobody found."""

    result = run_claude(prompt)

    # Update lead with chain info
    lead_update = {}
    if result.get("is_chain") is not None:
        lead_update["is_chain"] = result["is_chain"]
    if result.get("parent_company"):
        lead_update["parent_company"] = result["parent_company"]
    if result.get("hq_location"):
        lead_update["hq_location"] = result["hq_location"]

    if lead_update:
        update_lead(lead_id, lead_update)

    # Upsert each decision maker contact
    decision_makers = result.get("decision_makers") or []
    for dm in decision_makers:
        name = dm.get("name")
        if not name:
            continue
        upsert_contact(
            lead_id=lead_id,
            name=name,
            title=dm.get("title"),
            linkedin=dm.get("linkedin_url"),
            is_primary=bool(dm.get("is_primary", False)),
        )

    return result
