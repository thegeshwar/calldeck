"""Phase 3: Synthesize all research into a caller brief.

Intelligence rules:
- Website quality >= 4: DO NOT pitch website/SEO. Pitch AI workflows instead.
- Website quality <= 2: Lead with website rebuild.
- Website quality 3: Pitch SEO only if there are real issues. Otherwise workflows.
- Always consider industry-specific automation opportunities.
- Never use the same objection template twice in a row.
"""

import json

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


# Industry → workflow opportunities mapping
INDUSTRY_WORKFLOWS = {
    "accounting": "automated document intake, tax prep workflows, client onboarding portals, AI bookkeeping categorization",
    "cpa": "automated document intake, tax prep workflows, client onboarding portals, AI bookkeeping categorization",
    "real estate": "automated listing alerts, AI property matching, virtual tour scheduling, lead capture chatbots, CRM automation",
    "hospitality": "AI booking assistant, automated check-in/checkout, guest communication workflows, review response automation, staff scheduling",
    "hotel": "AI booking assistant, automated check-in/checkout, guest communication workflows, review response automation, staff scheduling",
    "restaurant": "online ordering automation, reservation management, AI menu optimization, review response, inventory alerts",
    "food": "online ordering automation, reservation management, AI menu optimization, review response, inventory alerts",
    "healthcare": "patient intake automation, appointment scheduling AI, follow-up reminders, insurance verification workflows",
    "dental": "patient intake automation, appointment scheduling AI, follow-up reminders, insurance verification workflows",
    "legal": "client intake forms, document automation, case status portals, AI contract review, appointment scheduling",
    "law": "client intake forms, document automation, case status portals, AI contract review, appointment scheduling",
    "insurance": "quote automation, claims intake workflows, policy renewal reminders, AI lead qualification",
    "lending": "loan application automation, document collection workflows, status update portals, AI pre-qualification",
    "mortgage": "loan application automation, document collection workflows, status update portals, AI pre-qualification",
    "automotive": "service appointment scheduling, automated reminders, AI estimate generation, customer follow-up workflows",
    "construction": "project status portals, automated invoicing, permit tracking workflows, AI bid estimation",
    "education": "enrollment automation, parent communication portals, event registration, AI tutoring assistants",
    "church": "member communication automation, event registration, volunteer coordination, donation workflows, prayer request intake",
    "religious": "member communication automation, event registration, volunteer coordination, donation workflows",
    "retail": "inventory alerts, customer loyalty automation, AI product recommendations, order tracking",
    "cleaning": "booking automation, schedule optimization, customer follow-up, AI quote generation",
    "landscaping": "booking automation, schedule optimization, customer follow-up, AI quote generation",
    "plumbing": "service call scheduling, automated dispatch, customer follow-up, AI diagnosis chatbot",
    "hvac": "service call scheduling, automated dispatch, customer follow-up, seasonal maintenance reminders",
    "salon": "appointment booking AI, automated reminders, customer loyalty workflows, review solicitation",
    "fitness": "class booking automation, member onboarding, payment reminders, AI workout recommendations",
}


def _get_workflow_suggestions(industry: str) -> str:
    """Get industry-specific AI workflow suggestions."""
    if not industry:
        return "general business process automation, customer intake, appointment scheduling, follow-up workflows"
    industry_lower = industry.lower()
    for key, workflows in INDUSTRY_WORKFLOWS.items():
        if key in industry_lower:
            return workflows
    return "customer intake automation, appointment scheduling, follow-up workflows, AI chatbot for common questions"


def _determine_pitch_strategy(lead: dict) -> str:
    """Determine what to pitch based on website quality and industry."""
    quality = lead.get("website_quality") or 0
    seo_issues = lead.get("seo_issues") or []
    is_mobile = lead.get("is_mobile_responsive")
    industry = lead.get("industry", "") or ""
    workflows = _get_workflow_suggestions(industry)

    if quality <= 2:
        return f"""PITCH STRATEGY: Lead with WEBSITE REBUILD. Their site is broken/terrible (quality {quality}/5).
After the website conversation, mention AI workflow opportunities: {workflows}"""

    if quality == 3:
        if len(seo_issues) >= 3 or is_mobile is False:
            return f"""PITCH STRATEGY: Lead with SEO/WEBSITE FIXES (quality {quality}/5, {len(seo_issues)} issues found).
But ALSO pitch AI workflows as the bigger opportunity: {workflows}"""
        else:
            return f"""PITCH STRATEGY: Their website is acceptable ({quality}/5). DO NOT lead with website fixes.
Lead with AI WORKFLOW AUTOMATION instead: {workflows}
Only mention website improvements as a secondary add-on if relevant."""

    # quality >= 4
    return f"""PITCH STRATEGY: Their website is GOOD ({quality}/5). DO NOT pitch website or SEO.
Lead with AI WORKFLOW AUTOMATION. This is a business with a solid web presence that needs operational efficiency.
Specific workflow opportunities for their industry: {workflows}
Think about: What manual processes does this type of business do every day that could be automated?"""


def _build_context(lead: dict) -> str:
    """Build a structured context string from all lead fields."""
    lines = []

    lines.append(f"Company: {lead.get('company_name', 'Unknown')}")
    lines.append(f"Location: {lead.get('city', '')}, {lead.get('state', '')}")
    lines.append(f"Industry: {lead.get('industry', 'Unknown')}")
    lines.append(f"Website: {lead.get('website', 'None')}")
    lines.append(f"Phone: {lead.get('phone', 'Unknown')}")

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
    speed = lead.get("page_speed_score")
    if speed is not None:
        lines.append(f"Page Speed: {speed}/100")

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
            lines.append(f"Notable Complaints: {', '.join(str(c) for c in complaints)}")

    is_chain = lead.get("is_chain")
    if is_chain:
        lines.append("Chain Business: Yes")
        parent = lead.get("parent_company")
        if parent:
            lines.append(f"Parent Company: {parent}")
        hq = lead.get("hq_location")
        if hq:
            lines.append(f"HQ: {hq}")

    contacts = lead.get("contacts") or lead.get("_contacts") or []
    if contacts:
        lines.append("Key Contacts:")
        for c in contacts[:3]:
            title = c.get("title", "")
            name = c.get("name", "Unknown")
            linkedin = c.get("linkedin", "")
            line = f"  - {name} ({title})"
            if linkedin:
                line += f" — LinkedIn: {linkedin}"
            lines.append(line)

    competitors = lead.get("competitors") or []
    if competitors:
        lines.append(f"Known Competitors: {', '.join(str(c) for c in competitors[:5])}")

    research_data = lead.get("research_data") or {}
    news = research_data.get("news") or []
    if news:
        lines.append("Recent News:")
        for item in news[:2]:
            title = item.get("title", "")
            if title:
                lines.append(f"  - {title}")

    job_postings = research_data.get("job_postings") or []
    if job_postings:
        lines.append(f"Currently Hiring: {len(job_postings)} open roles (e.g. {job_postings[0].get('title', '')})")

    return "\n".join(lines)


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    context = _build_context(lead)
    pitch_strategy = _determine_pitch_strategy(lead)

    prompt = f"""You are a sales strategist preparing a cold call brief. We sell THREE services:
1. AI Workflow Automation (chatbots, intake forms, scheduling, document processing, CRM automation)
2. Website Development / Redesign
3. SEO / Search Optimization

CRITICAL RULES:
- Read the PITCH STRATEGY section carefully. It tells you what to lead with based on their website quality.
- Do NOT default to pitching website/SEO. Many businesses have good enough websites — they need workflow automation.
- The HOOK must be specific to THIS business — reference a real data point, not a generic opener.
- The OBJECTION must be specific to this industry and pitch — do NOT use "when someone Googles you after a referral" unless it genuinely applies.
- Think about what this business does every day manually that could be automated.

RESEARCH DATA:
{context}

{pitch_strategy}

Write the brief with this structure. PLAIN TEXT only, no markdown, no asterisks, no bold:

HOOK: One specific opening line referencing something real about THIS business (a news item, a review, their hiring, their tech stack, a competitor — NOT generic)

PAIN POINTS:
- Pain point 1 backed by specific data
- Pain point 2 backed by specific data
- Pain point 3 if available

PITCH: What to sell them and exactly why, following the pitch strategy above

ASK FOR: Specific person name and title from the contacts data (or suggest by role if no contact found)

OBJECTION PREP: The most likely pushback from THIS specific type of business and a tailored one-sentence response

Keep under 200 words. Every sentence must reference actual data. No filler."""

    result = run_claude(prompt)
    brief_text = result.get("raw_output") or json.dumps(result)

    update_lead(lead_id, {"research_brief": brief_text})
    return {"research_brief": brief_text}
