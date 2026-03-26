"""Phase 2a: LinkedIn company and decision-maker lookup via Chrome/osascript."""

import urllib.parse

from worker.phases.base import run_claude
from worker.supabase_client import update_lead, upsert_contact
from worker.config import LINKEDIN_CHROME_PROFILE

LINKEDIN_TIMEOUT = 180


def run(lead: dict, is_chain: bool = False) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    city = lead.get("city", "") or ""
    state = lead.get("state", "") or ""
    is_chain = bool(lead.get("is_chain", False))

    location = f"{city} {state}".strip()

    if is_chain:
        search_query = urllib.parse.quote(f"{company_name} corporate headquarters LinkedIn")
        decision_maker_titles = "VP OR Director OR 'Regional Manager' OR 'Marketing Director' OR 'VP Marketing' OR 'Director of Marketing'"
        dm_search_query = urllib.parse.quote(f"{company_name} {decision_maker_titles} site:linkedin.com")
        strategy_note = (
            "This is a CHAIN business. Focus on:\n"
            "- Finding the corporate/parent company LinkedIn page\n"
            "- Finding corporate decision makers: VP Marketing, Director of Marketing, Regional Manager\n"
            "- Finding HQ location\n"
            "Set is_chain=true and populate parent_company and hq_location if found."
        )
    else:
        search_query = urllib.parse.quote(f"{company_name} {location} LinkedIn")
        dm_search_query = urllib.parse.quote(f"{company_name} owner OR manager OR president site:linkedin.com")
        strategy_note = (
            "This is a LOCAL SMB. Focus on:\n"
            "- Finding the business owner or general manager\n"
            "- Set is_chain=false, parent_company=null, hq_location=null"
        )

    prompt = f"""Use the Bash tool to look up LinkedIn information for this business:
Company: {company_name}
Location: {location}
Strategy: {strategy_note}

Steps (use bash commands exactly as shown):

1. Open Chrome with the correct profile:
   bash -c 'open -na "Google Chrome" --args --profile-directory="{LINKEDIN_CHROME_PROFILE}"'
   bash -c 'sleep 2'

2. Navigate to LinkedIn company search:
   osascript -e 'tell application "Google Chrome" to tell active tab of front window to set URL to "https://www.linkedin.com/search/results/companies/?keywords={search_query}"'
   bash -c 'sleep 3'

3. Get the page content:
   osascript -e 'tell application "Google Chrome" to tell active tab of front window to execute javascript "document.body.innerText"' > /tmp/li_company.txt 2>&1

4. Read /tmp/li_company.txt and find the company LinkedIn URL and any available info.

5. Search for decision makers:
   osascript -e 'tell application "Google Chrome" to tell active tab of front window to set URL to "https://www.google.com/search?q={dm_search_query}"'
   bash -c 'sleep 3'
   osascript -e 'tell application "Google Chrome" to tell active tab of front window to execute javascript "document.body.innerText"' > /tmp/li_people.txt 2>&1

6. Read /tmp/li_people.txt and extract up to 3 decision maker names and titles.

7. Close the Chrome window when done:
   osascript -e 'tell application "Google Chrome" to close front window'

Return ONLY this JSON, no markdown, no explanation, use null for unknown fields:
{{
  "company_found": false,
  "linkedin_url": null,
  "is_chain": {str(is_chain).lower()},
  "parent_company": null,
  "hq_location": null,
  "decision_makers": [
    {{"name": null, "title": null, "linkedin_url": null, "is_primary": true}}
  ]
}}"""

    result = run_claude(prompt, timeout=LINKEDIN_TIMEOUT)

    # Build lead update payload
    lead_update = {
        "linkedin_url": result.get("linkedin_url"),
    }
    if is_chain:
        lead_update["parent_company"] = result.get("parent_company")
        lead_update["hq_location"] = result.get("hq_location")

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
