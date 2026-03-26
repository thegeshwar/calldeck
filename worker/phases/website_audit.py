"""Phase 1a: Website audit — tech stack, speed, SEO, mobile responsiveness."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    website = lead.get("website", "") or ""

    if not website.strip():
        empty = {
            "tech_stack": [],
            "page_speed_score": None,
            "is_mobile_responsive": None,
            "seo_issues": [],
            "website_quality": 1,
        }
        update_lead(lead_id, empty)
        return empty

    prompt = f"""Use the Bash tool to audit this website: {website}

Steps:
1. curl -L -s -o /tmp/site_body.html -w "%{{http_code}} %{{time_total}} %{{size_download}}" --max-time 15 "{website}"
2. Read /tmp/site_body.html and inspect the HTML source for:
   - Tech stack signatures: WordPress (wp-content, wp-includes), Shopify (cdn.shopify.com), Wix (wix.com/static), Squarespace (squarespace.com/static), Webflow (webflow.io), custom/other
   - Mobile viewport: <meta name="viewport">
   - SEO issues: missing <title>, missing <meta name="description">, missing canonical, missing Open Graph tags
3. curl -s --max-time 10 "{website}/robots.txt" to check robots.txt existence
4. curl -s --max-time 10 "{website}/sitemap.xml" to check sitemap existence
5. Check if site uses HTTPS (starts with https://)
6. Estimate page_speed_score 1-100 based on load time and page size (fast < 2s = 80+, medium 2-5s = 50-79, slow > 5s = below 50)
7. Score website_quality 1-5: 1=no site/broken, 2=very basic, 3=functional, 4=good, 5=excellent

Return ONLY this JSON, no markdown, no explanation, use null for unknown fields:
{{
  "tech_stack": [],
  "page_speed_score": null,
  "is_mobile_responsive": null,
  "seo_issues": [],
  "website_quality": null
}}"""

    result = run_claude(prompt)

    data = {
        "tech_stack": result.get("tech_stack") or [],
        "page_speed_score": result.get("page_speed_score"),
        "is_mobile_responsive": result.get("is_mobile_responsive"),
        "seo_issues": result.get("seo_issues") or [],
        "website_quality": result.get("website_quality"),
    }

    update_lead(lead_id, data)
    return data
