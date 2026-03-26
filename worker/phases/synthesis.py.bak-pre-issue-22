"""Phase 3: Synthesize all research into a caller brief."""

import json

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def _build_context(lead: dict) -> str:
    """Build a structured context string from all lead fields."""
    lines = []

    # Basic info
    lines.append(f"Company: {lead.get('company_name', 'Unknown')}")
    lines.append(f"Location: {lead.get('city', '')}, {lead.get('state', '')}")
    lines.append(f"Industry: {lead.get('industry', 'Unknown')}")
    lines.append(f"Website: {lead.get('website', 'None')}")
    lines.append(f"Phone: {lead.get('phone', 'Unknown')}")

    # Website quality
    quality = lead.get("website_quality")
    if quality:
        lines.append(f"Website Quality Score: {quality}/5")
    tech_stack = lead.get("tech_stack") or []
    if tech_stack:
        lines.append(f"Tech Stack: {', '.join(tech_stack)}")
    seo_issues = lead.get("seo_issues") or []
    if seo_issues:
        lines.append(f"SEO Issues: {', '.join(seo_issues)}")
    mobile = lead.get("is_mobile_responsive")
    if mobile is not None:
        lines.append(f"Mobile Responsive: {'Yes' if mobile else 'No'}")

    # Reviews
    review_summary = lead.get("review_summary") or {}
    if review_summary:
        yelp = review_summary.get("yelp_rating")
        bbb = review_summary.get("bbb_rating")
        sentiment = review_summary.get("sentiment")
        complaints = review_summary.get("notable_complaints") or []
        if yelp:
            lines.append(f"Yelp Rating: {yelp}")
        if bbb:
            lines.append(f"BBB Rating: {bbb}")
        if sentiment:
            lines.append(f"Review Sentiment: {sentiment}")
        if complaints:
            lines.append(f"Notable Complaints: {', '.join(complaints)}")

    # LinkedIn / contacts
    linkedin_url = lead.get("linkedin_url")
    if linkedin_url:
        lines.append(f"LinkedIn: {linkedin_url}")
    is_chain = lead.get("is_chain")
    if is_chain:
        lines.append(f"Chain Business: Yes")
        parent = lead.get("parent_company")
        if parent:
            lines.append(f"Parent Company: {parent}")
        hq = lead.get("hq_location")
        if hq:
            lines.append(f"HQ: {hq}")

    # Contacts (from Supabase join)
    contacts = lead.get("contacts") or lead.get("_contacts") or []
    if contacts:
        lines.append("Key Contacts:")
        for c in contacts[:3]:
            title = c.get("title", "")
            lines.append(f"  - {c.get('name', 'Unknown')} ({title})")

    # Competitors
    competitors = lead.get("competitors") or []
    if competitors:
        lines.append(f"Known Competitors: {', '.join(str(c) for c in competitors[:5])}")

    # News
    research_data = lead.get("research_data") or {}
    news = research_data.get("news") or []
    if news:
        lines.append("Recent News:")
        for item in news[:2]:
            title = item.get("title", "")
            if title:
                lines.append(f"  - {title}")

    # Job postings signal
    job_postings = research_data.get("job_postings") or []
    if job_postings:
        lines.append(f"Currently Hiring: {len(job_postings)} open roles (e.g. {job_postings[0].get('title', '')})")

    return "\n".join(lines)


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    context = _build_context(lead)

    prompt = f"""You are a sales coach preparing a caller for a cold call to a local business.

Here is the research data gathered on this prospect:

{context}

Write a caller brief with EXACTLY this structure. Do NOT use markdown, asterisks, bold, or any formatting. Use plain uppercase labels followed by a colon:

HOOK: One specific, personalized opening line the caller can use (reference something real from the data — their website issue, a recent news item, their reviews, etc.)

PAIN POINTS:
- Data-backed pain point 1
- Data-backed pain point 2
- Data-backed pain point 3 if available

PITCH: Which of our services to lead with and exactly why based on what we found (be specific — e.g. "Lead with SEO because their site has no meta descriptions and competitors outrank them")

ASK FOR: The specific person name and title to ask for when the call connects (use data if available, otherwise suggest by title like "the owner" or "whoever handles marketing")

OBJECTION PREP: The single most likely pushback this business would give and a one-sentence response

Keep the entire brief under 200 words. Be specific, not generic. Use actual data points from the research above.
Return PLAIN TEXT only — absolutely no markdown, no asterisks, no bold formatting, no JSON, no code blocks."""

    # synthesis returns plain text, not JSON — use run_claude but handle raw_output
    result = run_claude(prompt)
    brief_text = result.get("raw_output") or json.dumps(result)

    update_lead(lead_id, {"research_brief": brief_text})
    return {"research_brief": brief_text}
