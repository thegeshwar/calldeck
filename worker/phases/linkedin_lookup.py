"""Phase 2a: Decision maker lookup via WebSearch + company website scraping.

Uses Claude's WebSearch tool for reliable results (no CAPTCHA issues).
Falls back to scraping the company's own website for team/about pages.
"""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead, upsert_contact


def run(lead: dict, is_chain: bool = False) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    city = lead.get("city", "") or ""
    state = lead.get("state", "") or ""
    website = lead.get("website", "") or ""
    industry = lead.get("industry", "") or ""
    is_chain = bool(lead.get("is_chain", False))

    location = f"{city}, {state}".strip(", ")

    if is_chain:
        goal = f"""Find: (1) the FRANCHISE OWNER of this specific {location} location — the person who pays for services, NOT the corporate CEO. (2) The parent company name and HQ. (3) A regional or marketing director at corporate.
Mark the franchise owner as is_primary=true."""
    else:
        goal = """Find the OWNER, FOUNDER, or PRESIDENT of this business — the person who writes checks and makes buying decisions. If no owner found, the General Manager or Marketing Manager works. Mark the top person as is_primary=true."""

    website_step = ""
    if website:
        url = website if website.startswith("http") else f"https://{website}"
        website_step = f"""
ALSO check their website for team/about info:
- curl -sL "{url}" and look for owner/team names in the homepage
- curl -sL "{url}/about" or "{url}/about-us" or "{url}/team" and look for names and titles"""

    prompt = f"""Find the decision maker at this business who would buy AI automation, web dev, or SEO services.

Company: {company_name}
Location: {location}
Industry: {industry or "unknown"}
Website: {website or "none"}

GOAL: {goal}

Search for: "{company_name}" "{location}" owner OR founder OR president OR manager
Also search: "{company_name}" owner site:linkedin.com
{website_step}
Return ONLY this JSON:
{{
  "company_found": true,
  "linkedin_url": null,
  "is_chain": {str(is_chain).lower()},
  "parent_company": null,
  "hq_location": null,
  "decision_makers": [
    {{"name": "Jane Doe", "title": "Owner", "linkedin_url": null, "is_primary": true}}
  ]
}}

Use null for unknown fields. decision_makers can be empty [] if nobody found."""

    # Use WebSearch + Bash so Claude can both search the web and curl websites
    result = run_claude(prompt, allowed_tools="Bash,WebSearch,WebFetch")

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
