# CallDeck Lead Research Worker — Design Spec

## Overview

One-click "Research" button that spawns parallel Claude CLI workers on the Mac to build a complete intelligence dossier on any lead. Results stream back to the UI in real-time as each research phase completes.

**Goal:** Give the caller/marketer the best possible intel to sell AI automation, search optimization, and web development services to SMBs and chains.

## Architecture

```
Browser (Queue/Detail page)
  → POST /api/research/start { leadId }
  → Insert row into research_jobs table (status: pending)
  → SSE endpoint /api/research/stream pushes job to Mac

Mac Worker (launchd daemon, always running)
  → Listens to SSE stream
  → Claims job
  → Spawns 3 parallel Claude CLI processes (Phase 1)
  → Each phase writes results to Supabase via API
  → Phase 2 fires after Phase 1 (2 parallel processes)
  → Phase 3 synthesizes brief
  → Marks job complete

Supabase Realtime
  → UI subscribes to leads table changes
  → As each phase writes results, UI updates live
```

## Database Changes

### New columns on `leads` table

```sql
-- Website audit
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tech_stack TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS page_speed_score INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS seo_issues TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_mobile_responsive BOOLEAN;

-- Chain/franchise detection
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_chain BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS parent_company TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hq_location TEXT;

-- Reviews
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_summary JSONB;
-- Structure: { yelp_rating, bbb_rating, sentiment, review_count, notable_complaints }

-- Competitors
ALTER TABLE leads ADD COLUMN IF NOT EXISTS competitors TEXT[];

-- Research catch-all + output
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_data JSONB;
-- Structure: { news: [], job_postings: [], misc: {} }
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_brief TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_status TEXT;
-- Values: null | pending | running | done | failed
ALTER TABLE leads ADD COLUMN IF NOT EXISTS researched_at TIMESTAMPTZ;
```

### New table: `research_jobs`

```sql
CREATE TABLE research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: pending | claimed | running | done | failed
  phase TEXT,
  -- Current phase name for progress display
  phases_completed INT DEFAULT 0,
  total_phases INT DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  worker_id TEXT
);

CREATE INDEX idx_research_jobs_status ON research_jobs(status);
CREATE INDEX idx_research_jobs_lead_id ON research_jobs(lead_id);

ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do anything" ON research_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE research_jobs;
```

### Existing tables reused

- `contacts` — decision makers found during LinkedIn lookup are upserted here
- `social_profiles` — social media accounts found during social scan are upserted here

## Research Phases

### Phase 1 — Parallel (3 concurrent Claude CLI processes)

All fire simultaneously when job is claimed.

#### 1a. Website Audit
- **Input:** `lead.website`
- **Actions:** Fetch site, detect tech stack (WordPress/Shopify/Wix/Squarespace/custom), check mobile responsiveness, estimate page speed, identify SEO issues (missing meta tags, no SSL, no sitemap, poor structure)
- **Updates:** `tech_stack`, `page_speed_score`, `seo_issues`, `is_mobile_responsive`, `website_quality`
- **Skip if:** `lead.website` is null
- **Claude tools:** `Bash` (curl, lighthouse CLI if available)

#### 1b. Reviews & Reputation
- **Input:** `lead.company_name`, `lead.city`, `lead.state`
- **Actions:** Search Google for reviews, check Yelp, check BBB, assess sentiment
- **Updates:** `review_summary` JSONB
- **Claude tools:** `Bash` (curl, web scraping)

#### 1c. Social Media Scan
- **Input:** `lead.company_name`, `lead.website`
- **Actions:** Find Facebook, Instagram, Twitter/X, YouTube, TikTok, LinkedIn company pages. Get follower counts and activity level.
- **Updates:** Rows in `social_profiles` table
- **Claude tools:** `Bash` (curl, web scraping)

### Phase 2 — Parallel (2 concurrent processes, after Phase 1 completes)

Needs Phase 1 results to know if business is a chain/franchise (affects LinkedIn strategy).

#### 2a. LinkedIn Company Lookup (V1)
- **Input:** `lead.company_name`, `is_chain` from Phase 1
- **Actions:**
  - Open Chrome with Profile 2 (thejeshwa@gmail.com) via osascript
  - Navigate to LinkedIn search
  - Find company page
  - Extract: key people (names, titles), HQ location, employee count, company description
  - **If chain detected:** Find parent company page, identify corporate decision makers (VP/Director of Operations, IT, Digital)
  - **If SMB:** Find owner/manager
- **Updates:** `contacts` table (upsert), `is_chain`, `parent_company`, `hq_location`
- **Claude tools:** `Bash` (osascript for Chrome control, curl)
- **Chrome profile:** `open -na "Google Chrome" --args --profile-directory="Profile 2"` then osascript to navigate/scrape
- **V2 tracked separately:** Deep individual profile scraping (GitHub issue)

#### 2b. Business Intel
- **Input:** `lead.company_name`, `lead.city`, `lead.industry`
- **Actions:** Search for recent news, press releases, job postings (signals growth/pain points), identify local competitors
- **Updates:** `research_data.news`, `research_data.job_postings`, `competitors`
- **Claude tools:** `Bash` (curl, web scraping)

### Phase 3 — Sequential (after all above complete)

#### 3. Synthesis
- **Input:** All data collected in phases 1-2, read from Supabase
- **Actions:** Analyze everything, write a concise "here's your angle" brief tailored to selling:
  - AI automation workflows
  - AI search optimization (SEO/GBP/local search)
  - Website development/redesign
- **Brief structure:**
  - One-line hook (the strongest opening line for the call)
  - Key pain points identified (2-3 bullets)
  - Recommended services to pitch (with reasoning)
  - Decision maker to ask for (name + title)
  - Objection anticipation (what they might push back on)
- **Updates:** `research_brief`, `research_status` → `done`, `researched_at`

## API Routes

All under `/api/research/`.

### `POST /api/research/start`
- **Auth:** Supabase session (browser)
- **Body:** `{ leadId: string }`
- **Action:** Creates `research_jobs` row, sets `leads.research_status = 'pending'`
- **Returns:** `{ jobId: string }`

### `GET /api/research/stream`
- **Auth:** Bearer token (`CALLDECK_WORKER_KEY` env var)
- **Response:** SSE stream
- **Events:** `data: { job_id, lead_id, type: "research" }`
- **Keepalive:** `: keepalive\n\n` every 30 seconds

### `POST /api/research/job/[id]/claim`
- **Auth:** Bearer token
- **Action:** Sets status → `claimed`, `claimed_at` → now
- **409** if already claimed

### `POST /api/research/job/[id]/progress`
- **Auth:** Bearer token
- **Body:** `{ phase: string, phases_completed: number }`
- **Action:** Updates job progress for UI display

### `POST /api/research/job/[id]/complete`
- **Auth:** Bearer token
- **Action:** Sets status → `done`, `completed_at` → now, sets `leads.research_status = 'done'`

### `POST /api/research/job/[id]/fail`
- **Auth:** Bearer token
- **Body:** `{ error: string }`
- **Action:** Sets status → `failed`, sets `leads.research_status = 'failed'`

### `GET /api/research/job/[id]`
- **Auth:** Supabase session
- **Returns:** Job status + lead data (for UI polling fallback)

## Worker Structure

Lives in `calldeck/worker/` inside the repo.

```
worker/
  worker.py                   -- SSE listener, job lifecycle manager
  config.py                   -- Supabase URL/key, worker key, timeouts
  supabase_client.py          -- REST wrapper for writing results to Supabase
  phases/
    __init__.py
    base.py                   -- Base phase class with run_claude_cli() helper
    website_audit.py           -- Phase 1a
    reviews.py                 -- Phase 1b
    social_scan.py             -- Phase 1c
    linkedin_lookup.py         -- Phase 2a
    business_intel.py          -- Phase 2b
    synthesis.py               -- Phase 3
  prompts/
    website_audit.txt          -- Prompt template for 1a
    reviews.txt                -- Prompt template for 1b
    social_scan.txt            -- Prompt template for 1c
    linkedin_lookup.txt        -- Prompt template for 2a (SMB variant)
    linkedin_lookup_chain.txt  -- Prompt template for 2a (chain variant)
    business_intel.txt         -- Prompt template for 2b
    synthesis.txt              -- Prompt template for 3
  com.calldeck.worker.plist   -- launchd config for Mac daemon
  requirements.txt            -- httpx
```

### Worker Flow (worker.py)

```python
# Pseudocode
def execute_research(lead_data, job_id):
    # Phase 1 — parallel
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [
            pool.submit(website_audit.run, lead_data),
            pool.submit(reviews.run, lead_data),
            pool.submit(social_scan.run, lead_data),
        ]
        phase1_results = [f.result() for f in futures]
        report_progress(job_id, phase="phase1_complete", completed=3)

    # Phase 2 — parallel, uses Phase 1 results
    is_chain = phase1_results[...]  # or read from Supabase
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(linkedin_lookup.run, lead_data, is_chain),
            pool.submit(business_intel.run, lead_data),
        ]
        phase2_results = [f.result() for f in futures]
        report_progress(job_id, phase="phase2_complete", completed=5)

    # Phase 3 — sequential synthesis
    synthesis.run(lead_data)
    report_progress(job_id, phase="done", completed=6)
```

### Phase Module Pattern (base.py)

Each phase:
1. Builds prompt from template + lead data
2. Runs `subprocess.run(["claude", "-p", prompt, "--allowedTools", "Bash"], capture_output=True, timeout=120)`
3. Parses JSON output from Claude
4. Writes structured results to Supabase via REST API (`PATCH /rest/v1/leads?id=eq.{lead_id}`)
5. Returns results dict for downstream phases

### LinkedIn Phase Specifics

Uses osascript to control Chrome (Profile 2 — thejeshwa@gmail.com):
```bash
# Open Chrome with correct profile
open -na "Google Chrome" --args --profile-directory="Profile 2"

# Navigate via osascript
osascript -e 'tell application "Google Chrome"
  tell active tab of front window
    set URL to "https://www.linkedin.com/search/results/companies/?keywords=COMPANY_NAME"
  end tell
end tell'

# Read page content via osascript
osascript -e 'tell application "Google Chrome"
  tell active tab of front window
    execute javascript "document.body.innerText"
  end tell
end tell'
```

Claude CLI gets `Bash` tool access to run these osascript commands.

### launchd Plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.calldeck.worker</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>-u</string>
        <string>-m</string>
        <string>worker.worker</string>
        <string>--url</string>
        <string>https://calldeck.thegeshwar.com</string>
        <string>--key</string>
        <string>WORKER_KEY_HERE</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/thegeshwar/calldeck</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/thegeshwar/calldeck/worker/logs/worker_stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/thegeshwar/calldeck/worker/logs/worker_stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>SUPABASE_URL</key>
        <string>https://api.qms.thegeshwar.com</string>
        <key>SUPABASE_SERVICE_KEY</key>
        <string>SERVICE_KEY_HERE</string>
    </dict>
</dict>
</plist>
```

## UI Changes

### Queue — LeadCard (`src/components/queue/lead-card.tsx`)

Add an **Intel Strip** below the "Why You're Calling" box. Compact, information-dense.

**When no research exists:**
```
[Research ↗] button only
```

**While researching (research_status = 'pending' | 'running'):**
```
[●●●○○○ Researching...] — phase indicator dots
```

**When research is done:**
```
┌─────────────────────────────────────────────────┐
│ INTEL                                            │
│ WordPress · Speed 34/100 · Not mobile responsive │
│ → Ask for: John Smith, Owner                     │
│ "Their site is losing mobile traffic — lead with │
│  a free audit to show what they're missing"      │
└─────────────────────────────────────────────────┘
```

Contents of the intel strip (priority order, space permitting):
1. Tech stack pill (strongest talking point for selling web dev)
2. Website quality/speed indicator
3. Best contact name + title
4. First sentence of research brief (the hook)

### Lead Detail Page (`/leads/[id]/page.tsx`)

New component: `<IntelCard lead={lead} />` — added to the left column below existing cards.

Full dossier display:
- **Website Audit** — tech stack, speed score bar, SEO issues list, mobile status
- **Reviews** — ratings across platforms, sentiment indicator, notable complaints
- **Social Presence** — linked social profiles with follower counts
- **Business Intel** — recent news, job postings, competitors
- **Chain Info** (if applicable) — parent company, HQ, corporate contacts
- **Research Brief** — the full "here's your angle" synthesis
- **"Re-research" button** + "Last researched: {date}" timestamp
- **Research status** — if currently running, show phase progress

### Supabase Realtime for Live Updates

Both the queue and detail page subscribe to `leads` table changes via Supabase Realtime. As each phase writes results, the UI updates without polling.

## GitHub Issues

### Issue #1: "Lead Research Worker — V1"
Labels: `feature`, `worker`
Tracks the full V1 implementation as described in this spec.

### Issue #2: "Lead Research — Deep LinkedIn Profile Scraping (V2)"
Labels: `feature`, `enhancement`, `future`
Description: Extend LinkedIn research phase to visit individual profiles, pull full work history, mutual connections, recent posts. Implement stealth techniques (random delays, human-like scrolling, session rotation). Depends on V1 being stable.
Referenced in V1 issue.

## Security

- `CALLDECK_WORKER_KEY` — static key, stored in `.env.local` on VPS and in launchd plist on Mac
- Supabase service role key on Mac only (for direct DB writes from worker)
- No API keys committed to git
- Claude CLI processes limited to `Bash` tool only
- LinkedIn scraping uses real Chrome profile to appear human
- Research jobs timeout after 5 minutes — phases that hang are killed

## Constraints

- Mac must be running for research to work (launchd keeps worker alive)
- LinkedIn rate limits — one lead at a time for LinkedIn phase (sequential within Phase 2a even if multiple jobs queue up)
- Claude CLI costs — each research run = ~5 parallel claude -p calls
