"""Phase 2b: Business intelligence — news, job postings, competitors."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    lead_id = lead["id"]
    company_name = lead.get("company_name", "") or ""
    city = lead.get("city", "") or ""
    state = lead.get("state", "") or ""
    industry = lead.get("industry", "") or ""

    location = f"{city}, {state}".strip(", ")
    news_query = f"{company_name} {location}".replace(" ", "+")
    jobs_query = f"{company_name} jobs hiring".replace(" ", "+")
    competitor_query = f"{industry} companies {location} competitors".replace(" ", "+")

    prompt = f"""Use the Bash tool to research business intelligence for this company:
Company: {company_name}
Location: {location}
Industry: {industry}

Steps:

1. Search for recent news:
   curl -s --max-time 15 -A "Mozilla/5.0" "https://news.google.com/rss/search?q={news_query}&hl=en-US&gl=US&ceid=US:en" -o /tmp/news.xml
   Parse /tmp/news.xml for the top 3 news items. Extract title, link/url, pubDate, and a one-sentence description from each item's <title> and <description> tags.

2. Search for job postings:
   curl -s --max-time 15 -A "Mozilla/5.0" "https://www.indeed.com/jobs?q={jobs_query}&l={location.replace(', ', '+').replace(' ', '+')}" -o /tmp/jobs.html
   Parse /tmp/jobs.html for job titles and posting dates. Extract up to 3 current job postings.
   Also check: curl -s --max-time 15 -A "Mozilla/5.0" "https://www.google.com/search?q={jobs_query}" -o /tmp/jobs_google.html
   Parse /tmp/jobs_google.html for job-related results.

3. Search for competitors:
   curl -s --max-time 15 -A "Mozilla/5.0" "https://www.google.com/search?q={competitor_query}" -o /tmp/competitors.html
   Parse /tmp/competitors.html for competitor company names in the same industry and location. Extract up to 5 competitor names.

Return ONLY this JSON, no markdown, no explanation, use null for unknown fields:
{{
  "news": [
    {{"title": null, "url": null, "date": null, "summary": null}}
  ],
  "job_postings": [
    {{"title": null, "url": null, "posted": null}}
  ],
  "competitors": []
}}"""

    result = run_claude(prompt)

    news = result.get("news") or []
    job_postings = result.get("job_postings") or []
    competitors = result.get("competitors") or []

    research_data = {
        "news": news,
        "job_postings": job_postings,
    }

    update_lead(lead_id, {
        "competitors": competitors,
        "research_data": research_data,
    })

    return {
        "news": news,
        "job_postings": job_postings,
        "competitors": competitors,
    }
