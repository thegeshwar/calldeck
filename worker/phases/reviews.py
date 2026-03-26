"""Phase 1b: Reviews and reputation — Yelp, BBB, Google, sentiment."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    city = lead.get("city", "") or ""
    state = lead.get("state", "") or ""
    google_rating = lead.get("google_rating")
    google_reviews = lead.get("google_reviews")

    location = f"{city}, {state}".strip(", ")

    # If we already have Google data, include it
    google_context = ""
    if google_rating:
        google_context = f"\nAlready known: Google rating {google_rating}/5 ({google_reviews} reviews)"

    prompt = f"""Find reviews and reputation for: {company_name} in {location}
{google_context}
Search for their Yelp rating, BBB rating, and overall sentiment.

Return ONLY this JSON:
{{
  "yelp_rating": null,
  "bbb_rating": null,
  "review_count": null,
  "sentiment": "positive/mixed/negative",
  "notable_complaints": ["complaint 1", "complaint 2"]
}}"""

    result = run_claude(prompt, allowed_tools="Bash,WebSearch,WebFetch")

    review_summary = {
        "yelp_rating": result.get("yelp_rating"),
        "bbb_rating": result.get("bbb_rating"),
        "review_count": result.get("review_count"),
        "sentiment": result.get("sentiment"),
        "notable_complaints": result.get("notable_complaints") or [],
    }

    update_lead(lead_id, {"review_summary": review_summary})
    return review_summary
