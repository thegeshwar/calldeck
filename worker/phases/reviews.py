"""Phase 1b: Reviews and reputation — Yelp, BBB, sentiment."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    city = lead.get("city", "") or ""
    state = lead.get("state", "") or ""

    location = f"{city}, {state}".strip(", ")

    prompt = f"""Use the Bash tool to research reviews and reputation for this business:
Company: {company_name}
Location: {location}

Steps:
1. Search Yelp for the business:
   curl -s --max-time 15 -A "Mozilla/5.0" "https://www.yelp.com/search?find_desc={company_name.replace(' ', '+')}&find_loc={location.replace(' ', '+').replace(',', '%2C')}" -o /tmp/yelp.html
   Parse /tmp/yelp.html for ratings (look for "rating" patterns like "4.5 star rating") and review counts.

2. Search BBB for the business:
   curl -s --max-time 15 -A "Mozilla/5.0" "https://www.bbb.org/search?find_country=USA&find_text={company_name.replace(' ', '+')}&find_loc={location.replace(' ', '+').replace(',', '%2C')}" -o /tmp/bbb.html
   Parse /tmp/bbb.html for BBB rating (A+, A, B, etc.) and accreditation status.

3. Based on ratings and any review snippets found, assess:
   - Overall sentiment: "positive", "mixed", or "negative"
   - Notable complaints: list up to 3 common complaint themes found in reviews

Return ONLY this JSON, no markdown, no explanation, use null for unknown fields:
{{
  "yelp_rating": null,
  "bbb_rating": null,
  "review_count": null,
  "sentiment": null,
  "notable_complaints": []
}}"""

    result = run_claude(prompt)

    review_summary = {
        "yelp_rating": result.get("yelp_rating"),
        "bbb_rating": result.get("bbb_rating"),
        "review_count": result.get("review_count"),
        "sentiment": result.get("sentiment"),
        "notable_complaints": result.get("notable_complaints") or [],
    }

    update_lead(lead_id, {"review_summary": review_summary})
    return review_summary
