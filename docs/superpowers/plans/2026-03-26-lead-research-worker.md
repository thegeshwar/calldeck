# Lead Research Worker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "Research" button that spawns parallel Claude CLI workers on the Mac to build intelligence dossiers on leads, streaming results back to the UI in real-time.

**Architecture:** SSE-based job queue (VPS→Mac). Next.js API routes manage jobs and stream events. A Python worker daemon on the Mac listens via SSE, claims jobs, runs parallel Claude CLI processes for each research phase, and writes results directly to Supabase. The UI subscribes to Supabase Realtime for live updates.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4, Supabase (Realtime), Python 3 (worker), Claude CLI, osascript (LinkedIn)

---

## File Structure

### New Files
```
# API routes (VPS / Next.js)
src/app/api/research/start/route.ts        — POST: create research job
src/app/api/research/stream/route.ts        — GET: SSE stream for worker
src/app/api/research/job/[id]/route.ts      — GET: job status
src/app/api/research/job/[id]/claim/route.ts    — POST: worker claims job
src/app/api/research/job/[id]/progress/route.ts — POST: worker reports phase
src/app/api/research/job/[id]/complete/route.ts — POST: worker marks done
src/app/api/research/job/[id]/fail/route.ts     — POST: worker marks failed

# UI components
src/components/research/research-button.tsx     — Button with status states
src/components/research/intel-strip.tsx         — Queue card inline intel
src/components/research/intel-card.tsx          — Detail page full dossier

# Worker (Mac daemon)
worker/worker.py                    — SSE listener + job lifecycle
worker/config.py                    — Env vars, URLs, timeouts
worker/supabase_client.py           — REST wrapper for Supabase writes
worker/phases/__init__.py
worker/phases/base.py               — Base class with run_claude() helper
worker/phases/website_audit.py      — Phase 1a
worker/phases/reviews.py            — Phase 1b
worker/phases/social_scan.py        — Phase 1c
worker/phases/linkedin_lookup.py    — Phase 2a
worker/phases/business_intel.py     — Phase 2b
worker/phases/synthesis.py          — Phase 3
worker/requirements.txt             — httpx
worker/com.calldeck.worker.plist    — launchd config

# DB migration
supabase/migrations/003_research.sql — Schema changes

# Types update
src/lib/types.ts                    — Add research fields to Lead interface
```

### Modified Files
```
src/components/queue/lead-card.tsx              — Add intel strip + research button
src/app/(dashboard)/leads/[id]/page.tsx         — Add intel card
src/lib/actions/leads.ts                        — Add startResearch server action
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/003_research.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/003_research.sql`:

```sql
-- Research fields on leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tech_stack TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS page_speed_score INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS seo_issues TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_mobile_responsive BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_chain BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS parent_company TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hq_location TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_summary JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS competitors TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_brief TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_status TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS researched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_research_status ON leads(research_status);

-- Research jobs table
CREATE TABLE IF NOT EXISTS research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  phase TEXT,
  phases_completed INT DEFAULT 0,
  total_phases INT DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  worker_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_lead_id ON research_jobs(lead_id);

ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do anything" ON research_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE research_jobs;
```

- [ ] **Step 2: Run the migration against Supabase**

```bash
cd /home/ubuntu/calldeck
# Using the Supabase API endpoint directly
psql "$DATABASE_URL" -f supabase/migrations/003_research.sql
```

If `psql` isn't available, run via Supabase SQL editor or the service role key:

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '...'
```

Alternatively, paste the SQL into the Supabase dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_research.sql
git commit -m "feat: add research_jobs table and research columns on leads"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add research fields to Lead interface**

Add these fields to the `Lead` interface in `src/lib/types.ts`, after the `longitude` field:

```typescript
  // Research fields
  tech_stack: string[] | null;
  page_speed_score: number | null;
  seo_issues: string[] | null;
  is_mobile_responsive: boolean | null;
  is_chain: boolean | null;
  parent_company: string | null;
  hq_location: string | null;
  review_summary: {
    yelp_rating?: number;
    bbb_rating?: number;
    sentiment?: string;
    review_count?: number;
    notable_complaints?: string[];
  } | null;
  competitors: string[] | null;
  research_data: {
    news?: { title: string; url: string; date: string; summary: string }[];
    job_postings?: { title: string; url: string; posted: string }[];
  } | null;
  research_brief: string | null;
  research_status: "pending" | "running" | "done" | "failed" | null;
  researched_at: string | null;
```

- [ ] **Step 2: Add ResearchJob type**

Add after the `Import` interface:

```typescript
export interface ResearchJob {
  id: string;
  lead_id: string;
  status: "pending" | "claimed" | "running" | "done" | "failed";
  phase: string | null;
  phases_completed: number;
  total_phases: number;
  created_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  error: string | null;
  worker_id: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add research types to Lead and ResearchJob interfaces"
```

---

## Task 3: API Routes — Job Lifecycle

**Files:**
- Create: `src/app/api/research/start/route.ts`
- Create: `src/app/api/research/stream/route.ts`
- Create: `src/app/api/research/job/[id]/route.ts`
- Create: `src/app/api/research/job/[id]/claim/route.ts`
- Create: `src/app/api/research/job/[id]/progress/route.ts`
- Create: `src/app/api/research/job/[id]/complete/route.ts`
- Create: `src/app/api/research/job/[id]/fail/route.ts`

- [ ] **Step 1: Add CALLDECK_WORKER_KEY to .env.local**

Generate a key and add to `.env.local`:

```bash
echo "CALLDECK_WORKER_KEY=$(openssl rand -hex 24)" >> .env.local
```

- [ ] **Step 2: Create the SSE stream endpoint**

Create `src/app/api/research/stream/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_KEY = process.env.CALLDECK_WORKER_KEY;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${WORKER_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = await createClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send any pending jobs as catchup
      const { data: pending } = await supabase
        .from("research_jobs")
        .select("id, lead_id")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      for (const job of pending || []) {
        const event = JSON.stringify({
          job_id: job.id,
          lead_id: job.lead_id,
          type: "research",
        });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }

      // Subscribe to new research jobs via Supabase Realtime
      const channel = supabase
        .channel("research-jobs-stream")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "research_jobs",
          },
          (payload) => {
            const job = payload.new;
            const event = JSON.stringify({
              job_id: job.id,
              lead_id: job.lead_id,
              type: "research",
            });
            try {
              controller.enqueue(encoder.encode(`data: ${event}\n\n`));
            } catch {
              // Stream closed
              channel.unsubscribe();
            }
          }
        )
        .subscribe();

      // Keepalive every 30s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
          channel.unsubscribe();
        }
      }, 30000);

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        channel.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 3: Create the start endpoint**

Create `src/app/api/research/start/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await request.json();
  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

  // Check lead exists
  const { data: lead } = await supabase
    .from("leads")
    .select("id, research_status")
    .eq("id", leadId)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Don't start if already running
  if (lead.research_status === "pending" || lead.research_status === "running") {
    return NextResponse.json({ error: "Research already in progress" }, { status: 409 });
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from("research_jobs")
    .insert({ lead_id: leadId })
    .select("id")
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  // Update lead status
  await supabase
    .from("leads")
    .update({ research_status: "pending" })
    .eq("id", leadId);

  return NextResponse.json({ jobId: job.id });
}
```

- [ ] **Step 4: Create the job status endpoint**

Create `src/app/api/research/job/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_KEY = process.env.CALLDECK_WORKER_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Allow both session auth and worker key auth
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${WORKER_KEY}`) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { data: job } = await supabase
    .from("research_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Also fetch the lead data for the worker
  const { data: lead } = await supabase
    .from("leads")
    .select("*, contacts(*), social_profiles(*)")
    .eq("id", job.lead_id)
    .single();

  return NextResponse.json({ job, lead });
}
```

- [ ] **Step 5: Create claim endpoint**

Create `src/app/api/research/job/[id]/claim/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_KEY = process.env.CALLDECK_WORKER_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${WORKER_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("research_jobs")
    .select("status, lead_id")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (job.status !== "pending") {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));

  await supabase
    .from("research_jobs")
    .update({
      status: "claimed",
      claimed_at: new Date().toISOString(),
      worker_id: body.worker_id || "mac-1",
    })
    .eq("id", id);

  await supabase
    .from("leads")
    .update({ research_status: "running" })
    .eq("id", job.lead_id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Create progress endpoint**

Create `src/app/api/research/job/[id]/progress/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_KEY = process.env.CALLDECK_WORKER_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${WORKER_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await request.json();

  await supabase
    .from("research_jobs")
    .update({
      status: "running",
      phase: body.phase,
      phases_completed: body.phases_completed,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Create complete endpoint**

Create `src/app/api/research/job/[id]/complete/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_KEY = process.env.CALLDECK_WORKER_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${WORKER_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("research_jobs")
    .select("lead_id")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase
    .from("research_jobs")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      phases_completed: 6,
    })
    .eq("id", id);

  await supabase
    .from("leads")
    .update({
      research_status: "done",
      researched_at: new Date().toISOString(),
    })
    .eq("id", job.lead_id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Create fail endpoint**

Create `src/app/api/research/job/[id]/fail/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_KEY = process.env.CALLDECK_WORKER_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${WORKER_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const { data: job } = await supabase
    .from("research_jobs")
    .select("lead_id")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase
    .from("research_jobs")
    .update({
      status: "failed",
      error: body.error || "Unknown error",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase
    .from("leads")
    .update({ research_status: "failed" })
    .eq("id", job.lead_id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/research/
git commit -m "feat: add research job API routes (start, stream, claim, progress, complete, fail)"
```

---

## Task 4: Server Action for Research Trigger

**Files:**
- Modify: `src/lib/actions/leads.ts`

- [ ] **Step 1: Add startResearch server action**

Add to the end of `src/lib/actions/leads.ts`:

```typescript
export async function startResearch(leadId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : ""}http://localhost:3003/api/research/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to start research");
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/queue");

  return response.json();
}
```

Actually, since this is a server action, we should call Supabase directly instead of going through fetch to our own API. Simpler and avoids the self-request:

```typescript
export async function startResearch(leadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Check not already running
  const { data: lead } = await supabase
    .from("leads")
    .select("research_status")
    .eq("id", leadId)
    .single();

  if (!lead) throw new Error("Lead not found");
  if (lead.research_status === "pending" || lead.research_status === "running") {
    throw new Error("Research already in progress");
  }

  // Create job — this triggers the SSE stream via Supabase Realtime
  const { error: jobError } = await supabase
    .from("research_jobs")
    .insert({ lead_id: leadId });

  if (jobError) throw new Error(jobError.message);

  // Mark lead as pending
  await supabase
    .from("leads")
    .update({ research_status: "pending" })
    .eq("id", leadId);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/queue");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/leads.ts
git commit -m "feat: add startResearch server action"
```

---

## Task 5: Research Button Component

**Files:**
- Create: `src/components/research/research-button.tsx`

- [ ] **Step 1: Create the research button**

Create `src/components/research/research-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startResearch } from "@/lib/actions/leads";

const PHASE_LABELS: Record<string, string> = {
  pending: "Queued",
  running: "Researching",
  website_audit: "Website",
  reviews: "Reviews",
  social_scan: "Socials",
  linkedin_lookup: "LinkedIn",
  business_intel: "Intel",
  synthesis: "Synthesis",
};

export function ResearchButton({
  leadId,
  status,
  phasesCompleted,
  totalPhases,
  className = "",
}: {
  leadId: string;
  status: string | null;
  phasesCompleted?: number;
  totalPhases?: number;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = status === "pending" || status === "running";
  const isDone = status === "done";
  const isFailed = status === "failed";

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await startResearch(leadId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (isActive) {
    const completed = phasesCompleted || 0;
    const total = totalPhases || 6;
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex gap-0.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < completed ? "bg-green" : "bg-border-bright"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-purple uppercase tracking-wider">
          Researching...
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        variant="ghost"
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 ${
          isFailed ? "border-red text-red" : "border-purple text-purple hover:border-purple hover:bg-purple-dim"
        }`}
      >
        <Radar size={12} className={loading ? "animate-spin" : ""} />
        {loading ? "Starting..." : isDone ? "Re-research" : isFailed ? "Retry Research" : "Research"}
      </Button>
      {error && (
        <div className="text-[10px] text-red mt-1 font-[family-name:var(--font-mono)]">{error}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/research/research-button.tsx
git commit -m "feat: add ResearchButton component with status states"
```

---

## Task 6: Intel Strip for Queue Card

**Files:**
- Create: `src/components/research/intel-strip.tsx`
- Modify: `src/components/queue/lead-card.tsx`

- [ ] **Step 1: Create the intel strip component**

Create `src/components/research/intel-strip.tsx`:

```tsx
import { Lead, Contact } from "@/lib/types";
import { Cpu, User, Zap, AlertTriangle } from "lucide-react";
import { ResearchButton } from "./research-button";

export function IntelStrip({
  lead,
  primaryContact,
}: {
  lead: Lead;
  primaryContact?: Contact | null;
}) {
  const hasResearch = lead.research_status === "done";
  const isResearching =
    lead.research_status === "pending" || lead.research_status === "running";

  // If no research done and not running, just show the button
  if (!hasResearch && !isResearching) {
    return (
      <ResearchButton leadId={lead.id} status={lead.research_status} />
    );
  }

  // While researching, show progress
  if (isResearching) {
    return (
      <ResearchButton leadId={lead.id} status={lead.research_status} />
    );
  }

  // Research done — show actionable intel
  const techLabel = lead.tech_stack?.length
    ? lead.tech_stack[0]
    : lead.website
      ? "Unknown stack"
      : "No website";

  const speedColor =
    (lead.page_speed_score || 0) < 50
      ? "text-red"
      : (lead.page_speed_score || 0) < 80
        ? "text-amber"
        : "text-green";

  const briefHook = lead.research_brief
    ? lead.research_brief.split("\n")[0].slice(0, 120)
    : null;

  // Find the best contact from research (primary with title)
  const bestContact = primaryContact?.name && primaryContact?.title
    ? `${primaryContact.name}, ${primaryContact.title}`
    : primaryContact?.name || null;

  return (
    <div className="border-2 border-purple-border bg-purple-dim rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-purple">
          Intel
        </div>
        <ResearchButton
          leadId={lead.id}
          status={lead.research_status}
          className="scale-90 origin-right"
        />
      </div>

      {/* Tech + speed row */}
      <div className="flex items-center gap-3 text-[10px] font-[family-name:var(--font-mono)]">
        <span className="flex items-center gap-1 text-cyan">
          <Cpu size={10} /> {techLabel}
        </span>
        {lead.page_speed_score != null && (
          <span className={`flex items-center gap-1 ${speedColor}`}>
            <Zap size={10} /> {lead.page_speed_score}/100
          </span>
        )}
        {lead.is_mobile_responsive === false && (
          <span className="flex items-center gap-1 text-red">
            <AlertTriangle size={10} /> No mobile
          </span>
        )}
        {lead.is_chain && lead.parent_company && (
          <span className="text-amber">Chain: {lead.parent_company}</span>
        )}
      </div>

      {/* Best contact */}
      {bestContact && (
        <div className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-text-secondary">
          <User size={10} className="text-green" /> Ask for: {bestContact}
        </div>
      )}

      {/* Brief hook */}
      {briefHook && (
        <p className="text-[11px] text-text-primary leading-relaxed italic">
          &ldquo;{briefHook}&rdquo;
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add IntelStrip to LeadCard**

In `src/components/queue/lead-card.tsx`, add the import at the top:

```typescript
import { IntelStrip } from "@/components/research/intel-strip";
```

Then add the IntelStrip right after the "Why You're Calling" block and before the action buttons:

```tsx
      {/* Intel */}
      <IntelStrip lead={lead} primaryContact={primaryContact} />
```

Place this between the closing `)}` of the `callContext &&` block and the `{/* Action buttons */}` comment.

- [ ] **Step 3: Commit**

```bash
git add src/components/research/intel-strip.tsx src/components/queue/lead-card.tsx
git commit -m "feat: add intel strip to queue lead card"
```

---

## Task 7: Intel Card for Lead Detail Page

**Files:**
- Create: `src/components/research/intel-card.tsx`
- Modify: `src/app/(dashboard)/leads/[id]/page.tsx`

- [ ] **Step 1: Create the full intel card**

Create `src/components/research/intel-card.tsx`:

```tsx
"use client";

import { LeadWithRelations } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ResearchButton } from "./research-button";
import {
  Globe, Zap, Search, Smartphone, Building2, Star,
  Newspaper, Briefcase, Users, Clock
} from "lucide-react";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Globe;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
        <Icon size={10} /> {title}
      </div>
      {children}
    </div>
  );
}

export function IntelCard({ lead }: { lead: LeadWithRelations }) {
  const hasResearch = lead.research_status === "done";

  if (!hasResearch) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
            Research Intel
          </div>
          <ResearchButton leadId={lead.id} status={lead.research_status} />
        </div>
        {lead.research_status === "failed" && (
          <p className="text-xs text-red">Research failed. Click retry to try again.</p>
        )}
        {!lead.research_status && (
          <p className="text-xs text-text-muted">
            Click Research to build a dossier on this lead.
          </p>
        )}
      </Card>
    );
  }

  const speedColor =
    (lead.page_speed_score || 0) < 50
      ? "text-red"
      : (lead.page_speed_score || 0) < 80
        ? "text-amber"
        : "text-green";

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
          Research Intel
        </div>
        <div className="flex items-center gap-2">
          {lead.researched_at && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted font-[family-name:var(--font-mono)]">
              <Clock size={10} />
              {new Date(lead.researched_at).toLocaleDateString()}
            </span>
          )}
          <ResearchButton leadId={lead.id} status={lead.research_status} />
        </div>
      </div>

      {/* Research Brief */}
      {lead.research_brief && (
        <div className="border-2 border-green-border bg-green-dim rounded-lg p-3">
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-green mb-1.5">
            Your Angle
          </div>
          <p className="text-xs text-text-primary leading-relaxed whitespace-pre-line">
            {lead.research_brief}
          </p>
        </div>
      )}

      {/* Chain info */}
      {lead.is_chain && (
        <div className="border-2 border-amber-border bg-amber-dim rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-xs text-amber">
            <Building2 size={12} />
            Chain/Franchise — {lead.parent_company || "Parent unknown"}
            {lead.hq_location && ` (HQ: ${lead.hq_location})`}
          </div>
        </div>
      )}

      {/* Website Audit */}
      {(lead.tech_stack || lead.page_speed_score != null || lead.seo_issues) && (
        <Section title="Website Audit" icon={Globe}>
          <div className="space-y-1.5">
            {lead.tech_stack && lead.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lead.tech_stack.map((t) => (
                  <Pill key={t} color="blue" size="sm">{t}</Pill>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs">
              {lead.page_speed_score != null && (
                <span className={`flex items-center gap-1 ${speedColor} font-[family-name:var(--font-mono)]`}>
                  <Zap size={12} /> Speed: {lead.page_speed_score}/100
                </span>
              )}
              {lead.is_mobile_responsive != null && (
                <span className={`flex items-center gap-1 ${lead.is_mobile_responsive ? "text-green" : "text-red"} font-[family-name:var(--font-mono)]`}>
                  <Smartphone size={12} /> {lead.is_mobile_responsive ? "Mobile OK" : "Not Mobile Friendly"}
                </span>
              )}
            </div>
            {lead.seo_issues && lead.seo_issues.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-[10px] text-amber font-[family-name:var(--font-mono)] mb-0.5">
                  <Search size={10} /> SEO Issues
                </div>
                <ul className="text-xs text-text-secondary space-y-0.5 ml-3">
                  {lead.seo_issues.map((issue, i) => (
                    <li key={i} className="list-disc">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Reviews */}
      {lead.review_summary && (
        <Section title="Reviews & Reputation" icon={Star}>
          <div className="flex items-center gap-4 text-xs font-[family-name:var(--font-mono)]">
            {lead.google_rating && (
              <span className="text-amber">Google: {lead.google_rating}/5 ({lead.google_reviews})</span>
            )}
            {lead.review_summary.yelp_rating && (
              <span className="text-red">Yelp: {lead.review_summary.yelp_rating}/5</span>
            )}
            {lead.review_summary.bbb_rating && (
              <span className="text-blue">BBB: {lead.review_summary.bbb_rating}</span>
            )}
          </div>
          {lead.review_summary.sentiment && (
            <p className="text-xs text-text-secondary">{lead.review_summary.sentiment}</p>
          )}
          {lead.review_summary.notable_complaints && lead.review_summary.notable_complaints.length > 0 && (
            <div className="text-xs text-text-muted">
              Complaints: {lead.review_summary.notable_complaints.join(", ")}
            </div>
          )}
        </Section>
      )}

      {/* Competitors */}
      {lead.competitors && lead.competitors.length > 0 && (
        <Section title="Competitors" icon={Users}>
          <div className="flex flex-wrap gap-1">
            {lead.competitors.map((c) => (
              <Pill key={c} color="neutral" size="sm">{c}</Pill>
            ))}
          </div>
        </Section>
      )}

      {/* Business Intel */}
      {lead.research_data?.news && lead.research_data.news.length > 0 && (
        <Section title="Recent News" icon={Newspaper}>
          <div className="space-y-1">
            {lead.research_data.news.slice(0, 3).map((item, i) => (
              <div key={i} className="text-xs">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan hover:underline"
                >
                  {item.title}
                </a>
                <span className="text-text-muted ml-1 font-[family-name:var(--font-mono)]">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {lead.research_data?.job_postings && lead.research_data.job_postings.length > 0 && (
        <Section title="Job Postings" icon={Briefcase}>
          <div className="space-y-1">
            {lead.research_data.job_postings.slice(0, 3).map((item, i) => (
              <div key={i} className="text-xs">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan hover:underline"
                >
                  {item.title}
                </a>
              </div>
            ))}
          </div>
        </Section>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Add IntelCard to lead detail page**

In `src/app/(dashboard)/leads/[id]/page.tsx`:

Add the import at the top:

```typescript
import { IntelCard } from "@/components/research/intel-card";
```

Add `<IntelCard lead={lead} />` at the end of the left column, after `<PipelineInfo>`:

```tsx
          <PipelineInfo lead={lead} profiles={(profiles as Profile[]) || []} />
          <IntelCard lead={lead} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/research/intel-card.tsx src/app/\(dashboard\)/leads/\[id\]/page.tsx
git commit -m "feat: add full intel card to lead detail page"
```

---

## Task 8: Worker — Core Infrastructure

**Files:**
- Create: `worker/config.py`
- Create: `worker/supabase_client.py`
- Create: `worker/phases/__init__.py`
- Create: `worker/phases/base.py`
- Create: `worker/requirements.txt`

- [ ] **Step 1: Create requirements.txt**

Create `worker/requirements.txt`:

```
httpx>=0.27
```

- [ ] **Step 2: Create config.py**

Create `worker/config.py`:

```python
"""Configuration for the CalldDeck research worker."""

import os

# VPS / CalldDeck server
CALLDECK_URL = os.getenv("CALLDECK_URL", "https://calldeck.thegeshwar.com")
CALLDECK_WORKER_KEY = os.getenv("CALLDECK_WORKER_KEY", "")

# Supabase direct access (for writing results)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://api.qms.thegeshwar.com")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Timeouts
PHASE_TIMEOUT = int(os.getenv("PHASE_TIMEOUT", "120"))  # seconds per Claude CLI call
TOTAL_TIMEOUT = int(os.getenv("TOTAL_TIMEOUT", "300"))   # 5 min max per job

# LinkedIn Chrome profile
LINKEDIN_CHROME_PROFILE = "Profile 2"  # thejeshwa@gmail.com

# Worker identity
WORKER_ID = os.getenv("WORKER_ID", "mac-1")
```

- [ ] **Step 3: Create supabase_client.py**

Create `worker/supabase_client.py`:

```python
"""Minimal Supabase REST client for the worker to write results."""

import httpx
from worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY


def _headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def update_lead(lead_id: str, data: dict) -> None:
    """PATCH a lead record."""
    url = f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead_id}"
    with httpx.Client(timeout=15) as client:
        r = client.patch(url, headers=_headers(), json=data)
        r.raise_for_status()


def upsert_contact(lead_id: str, name: str, title: str | None = None,
                    email: str | None = None, linkedin: str | None = None,
                    direct_phone: str | None = None, is_primary: bool = False) -> None:
    """Upsert a contact for a lead. Matches on lead_id + name."""
    # Check if contact exists
    url = f"{SUPABASE_URL}/rest/v1/contacts?lead_id=eq.{lead_id}&name=eq.{name}"
    headers = _headers()
    headers["Prefer"] = "return=representation"
    with httpx.Client(timeout=15) as client:
        r = client.get(url, headers=headers)
        existing = r.json()

        contact_data = {
            "lead_id": lead_id,
            "name": name,
            "title": title,
            "email": email,
            "linkedin": linkedin,
            "direct_phone": direct_phone,
            "is_primary": is_primary,
        }
        # Remove None values
        contact_data = {k: v for k, v in contact_data.items() if v is not None}

        if existing:
            # Update
            cid = existing[0]["id"]
            client.patch(
                f"{SUPABASE_URL}/rest/v1/contacts?id=eq.{cid}",
                headers=_headers(),
                json=contact_data,
            )
        else:
            # Insert
            client.post(
                f"{SUPABASE_URL}/rest/v1/contacts",
                headers=_headers(),
                json=contact_data,
            )


def upsert_social_profile(lead_id: str, platform: str, url: str | None = None,
                           followers: int | None = None, notes: str | None = None) -> None:
    """Upsert a social profile for a lead. Matches on lead_id + platform."""
    check_url = f"{SUPABASE_URL}/rest/v1/social_profiles?lead_id=eq.{lead_id}&platform=eq.{platform}"
    headers = _headers()
    headers["Prefer"] = "return=representation"
    with httpx.Client(timeout=15) as client:
        r = client.get(check_url, headers=headers)
        existing = r.json()

        profile_data = {
            "lead_id": lead_id,
            "platform": platform,
            "url": url,
            "followers": followers,
            "notes": notes,
        }
        profile_data = {k: v for k, v in profile_data.items() if v is not None}

        if existing:
            pid = existing[0]["id"]
            client.patch(
                f"{SUPABASE_URL}/rest/v1/social_profiles?id=eq.{pid}",
                headers=_headers(),
                json=profile_data,
            )
        else:
            client.post(
                f"{SUPABASE_URL}/rest/v1/social_profiles",
                headers=_headers(),
                json=profile_data,
            )
```

- [ ] **Step 4: Create base phase class**

Create `worker/phases/__init__.py`:

```python
```

Create `worker/phases/base.py`:

```python
"""Base class for research phases."""

import json
import re
import subprocess
from worker.config import PHASE_TIMEOUT


def run_claude(prompt: str, allowed_tools: str = "Bash", timeout: int | None = None) -> dict:
    """Run Claude CLI with a prompt. Returns parsed JSON output.

    The prompt must instruct Claude to output JSON. This function extracts
    the first JSON object from Claude's output.
    """
    result = subprocess.run(
        ["claude", "-p", prompt, "--allowedTools", allowed_tools],
        capture_output=True,
        text=True,
        timeout=timeout or PHASE_TIMEOUT,
    )

    if result.returncode != 0:
        error = result.stderr[:500] if result.stderr else "Unknown error"
        raise RuntimeError(f"Claude CLI failed: {error}")

    output = result.stdout.strip()

    # Try direct JSON parse
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        pass

    # Extract JSON from output
    match = re.search(r'\{[\s\S]*\}', output)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Return raw output wrapped
    return {"raw_output": output}
```

- [ ] **Step 5: Commit**

```bash
git add worker/
git commit -m "feat: add worker core infrastructure (config, supabase client, base phase)"
```

---

## Task 9: Worker — Research Phases

**Files:**
- Create: `worker/phases/website_audit.py`
- Create: `worker/phases/reviews.py`
- Create: `worker/phases/social_scan.py`
- Create: `worker/phases/linkedin_lookup.py`
- Create: `worker/phases/business_intel.py`
- Create: `worker/phases/synthesis.py`

- [ ] **Step 1: Create website_audit.py**

Create `worker/phases/website_audit.py`:

```python
"""Phase 1a: Website audit — tech stack, speed, SEO, mobile."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    """Audit the lead's website. Returns results dict."""
    website = lead.get("website")
    if not website:
        update_lead(lead["id"], {"tech_stack": [], "website_quality": 1})
        return {"skipped": True, "reason": "No website"}

    if not website.startswith("http"):
        website = f"https://{website}"

    prompt = f"""You are a web technology analyst. Audit this website: {website}

Research tasks:
1. Detect the tech stack (check meta tags, page source, common signatures for WordPress, Shopify, Wix, Squarespace, React, Next.js, etc.)
2. Check if the site is mobile responsive (viewport meta tag, responsive CSS)
3. Estimate page speed (check total page size, number of requests, render-blocking resources)
4. Identify SEO issues (missing title/meta description, no SSL, no sitemap.xml, no robots.txt, missing alt tags, poor heading structure)
5. Rate overall website quality 1-5 (1=terrible, 5=excellent)

Use curl to fetch the homepage and key files. Do NOT use a browser.

Commands you can use:
- curl -sL -o /dev/null -w "%{{http_code}} %{{size_download}} %{{time_total}}" "{website}" — for speed/size
- curl -sL "{website}" | head -200 — for source inspection
- curl -sI "{website}" — for headers
- curl -sL "{website}/robots.txt" — check robots
- curl -sL "{website}/sitemap.xml" | head -5 — check sitemap

Return ONLY a JSON object with exactly these fields:
{{
  "tech_stack": ["WordPress", "PHP"],
  "page_speed_score": 45,
  "is_mobile_responsive": false,
  "seo_issues": ["Missing meta description", "No sitemap.xml"],
  "website_quality": 2
}}

No explanation, no markdown, just the JSON."""

    result = run_claude(prompt)

    # Write to Supabase
    updates = {}
    if "tech_stack" in result:
        updates["tech_stack"] = result["tech_stack"]
    if "page_speed_score" in result:
        updates["page_speed_score"] = result["page_speed_score"]
    if "is_mobile_responsive" in result:
        updates["is_mobile_responsive"] = result["is_mobile_responsive"]
    if "seo_issues" in result:
        updates["seo_issues"] = result["seo_issues"]
    if "website_quality" in result:
        updates["website_quality"] = result["website_quality"]

    if updates:
        update_lead(lead["id"], updates)

    return result
```

- [ ] **Step 2: Create reviews.py**

Create `worker/phases/reviews.py`:

```python
"""Phase 1b: Reviews & reputation — Google, Yelp, BBB."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    """Research reviews and reputation. Returns results dict."""
    company = lead.get("company_name", "")
    city = lead.get("city", "")
    state = lead.get("state", "")
    location = f"{city}, {state}" if city else ""

    prompt = f"""You are a business reputation researcher. Research the online reputation of:

Company: {company}
Location: {location}

Research tasks:
1. Search for Yelp reviews (curl yelp.com search)
2. Search for BBB listing (curl bbb.org search)
3. Check for any notable complaints or negative press
4. Assess overall sentiment

Use curl and web scraping. Be thorough but fast.

Commands you can use:
- curl -sL "https://www.yelp.com/search?find_desc={company.replace(' ', '+')}&find_loc={location.replace(' ', '+')}" | grep -o 'rating.*' | head -5
- curl -sL "https://www.bbb.org/search?find_text={company.replace(' ', '+')}&find_loc={location.replace(' ', '+')}" | head -100

Return ONLY a JSON object:
{{
  "yelp_rating": 3.5,
  "bbb_rating": "A+",
  "review_count": 42,
  "sentiment": "Generally positive with complaints about slow service",
  "notable_complaints": ["Slow response times", "Pricing concerns"]
}}

Use null for any field you cannot find. No explanation, just JSON."""

    result = run_claude(prompt)

    review_summary = {
        "yelp_rating": result.get("yelp_rating"),
        "bbb_rating": result.get("bbb_rating"),
        "review_count": result.get("review_count"),
        "sentiment": result.get("sentiment"),
        "notable_complaints": result.get("notable_complaints"),
    }

    update_lead(lead["id"], {"review_summary": review_summary})
    return result
```

- [ ] **Step 3: Create social_scan.py**

Create `worker/phases/social_scan.py`:

```python
"""Phase 1c: Social media scan — find all profiles."""

from worker.phases.base import run_claude
from worker.supabase_client import upsert_social_profile


PLATFORM_MAP = {
    "facebook": "facebook",
    "instagram": "instagram",
    "linkedin": "linkedin",
    "twitter": "twitter",
    "x": "twitter",
    "youtube": "youtube",
    "tiktok": "tiktok",
}


def run(lead: dict) -> dict:
    """Find social media profiles. Returns results dict."""
    company = lead.get("company_name", "")
    website = lead.get("website", "")

    prompt = f"""You are a social media researcher. Find all social media profiles for:

Company: {company}
Website: {website or "none"}

Research tasks:
1. If website exists, check the homepage for social media links (curl the site, grep for facebook.com, instagram.com, linkedin.com, twitter.com, x.com, youtube.com, tiktok.com)
2. Search for the company on each platform
3. Note follower/subscriber counts when visible

Use curl to check the website and search platforms.

Return ONLY a JSON object:
{{
  "profiles": [
    {{"platform": "facebook", "url": "https://facebook.com/example", "followers": 1200}},
    {{"platform": "instagram", "url": "https://instagram.com/example", "followers": 850}},
    {{"platform": "linkedin", "url": "https://linkedin.com/company/example", "followers": null}}
  ]
}}

Only include platforms where you actually found a profile. Use null for unknown follower counts. No explanation, just JSON."""

    result = run_claude(prompt)

    profiles = result.get("profiles", [])
    for p in profiles:
        platform_key = PLATFORM_MAP.get(p.get("platform", "").lower())
        if platform_key:
            upsert_social_profile(
                lead["id"],
                platform_key,
                url=p.get("url"),
                followers=p.get("followers"),
            )

    return result
```

- [ ] **Step 4: Create linkedin_lookup.py**

Create `worker/phases/linkedin_lookup.py`:

```python
"""Phase 2a: LinkedIn company lookup via osascript + Chrome (V1: company page only)."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead, upsert_contact
from worker.config import LINKEDIN_CHROME_PROFILE


def run(lead: dict, is_chain: bool = False) -> dict:
    """Look up company on LinkedIn. Returns results dict."""
    company = lead.get("company_name", "")
    city = lead.get("city", "")
    state = lead.get("state", "")

    chain_instructions = ""
    if is_chain:
        chain_instructions = """
This is a CHAIN/FRANCHISE business. Your priority is to:
1. Find the PARENT COMPANY LinkedIn page (not the local branch)
2. Identify corporate decision makers: VP/Director of Operations, IT, Digital, or Technology
3. Get the HQ location
4. Return parent_company and hq_location fields
"""
    else:
        chain_instructions = """
This is a SMALL/MEDIUM business. Your priority is to:
1. Find the owner, manager, or key decision maker
2. Get their name, title, and LinkedIn URL
"""

    prompt = f"""You are a LinkedIn researcher. Look up this company on LinkedIn:

Company: {company}
Location: {city}, {state}
{chain_instructions}

IMPORTANT: You must use osascript to control Google Chrome with Profile 2 (thejeshwa@gmail.com's account which is already logged into LinkedIn).

Step-by-step:
1. First, open Chrome with the right profile:
   open -na "Google Chrome" --args --profile-directory="{LINKEDIN_CHROME_PROFILE}"

2. Wait 2 seconds for Chrome to open:
   sleep 2

3. Navigate to LinkedIn company search:
   osascript -e 'tell application "Google Chrome"
     tell active tab of front window
       set URL to "https://www.linkedin.com/search/results/companies/?keywords={company.replace('"', '').replace("'", "")}"
     end tell
   end tell'

4. Wait 3 seconds for page load:
   sleep 3

5. Read the page content:
   osascript -e 'tell application "Google Chrome"
     tell active tab of front window
       execute javascript "document.body.innerText"
     end tell
   end tell'

6. If you find the company page, navigate to it and read the "People" or "About" section to find key people.

7. After you're done, DO NOT close Chrome.

Return ONLY a JSON object:
{{
  "company_found": true,
  "linkedin_url": "https://linkedin.com/company/example",
  "employee_count_linkedin": 50,
  "description": "Brief company description from LinkedIn",
  "is_chain": false,
  "parent_company": null,
  "hq_location": null,
  "decision_makers": [
    {{
      "name": "John Smith",
      "title": "Owner",
      "linkedin_url": "https://linkedin.com/in/johnsmith",
      "is_primary": true
    }}
  ]
}}

No explanation, just JSON."""

    result = run_claude(prompt, allowed_tools="Bash", timeout=180)

    # Update chain info
    updates = {}
    if result.get("is_chain") is not None:
        updates["is_chain"] = result["is_chain"]
    if result.get("parent_company"):
        updates["parent_company"] = result["parent_company"]
    if result.get("hq_location"):
        updates["hq_location"] = result["hq_location"]

    if updates:
        update_lead(lead["id"], updates)

    # Upsert contacts
    for dm in result.get("decision_makers", []):
        if dm.get("name"):
            upsert_contact(
                lead["id"],
                name=dm["name"],
                title=dm.get("title"),
                linkedin=dm.get("linkedin_url"),
                is_primary=dm.get("is_primary", False),
            )

    return result
```

- [ ] **Step 5: Create business_intel.py**

Create `worker/phases/business_intel.py`:

```python
"""Phase 2b: Business intel — news, job postings, competitors."""

from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    """Research business intel. Returns results dict."""
    company = lead.get("company_name", "")
    city = lead.get("city", "")
    state = lead.get("state", "")
    industry = lead.get("industry", "")

    prompt = f"""You are a business intelligence researcher. Research:

Company: {company}
Location: {city}, {state}
Industry: {industry or "unknown"}

Research tasks:
1. Search for recent news about this company (curl Google News search)
2. Search for job postings (signals growth or pain points) — check Indeed, LinkedIn
3. Identify 3-5 local competitors in the same industry and area

Use curl for web searches. Be resourceful.

Commands:
- curl -sL "https://www.google.com/search?q=%22{company.replace(' ', '+')}%22+{city.replace(' ', '+')}&tbm=nws" | grep -oP 'class="[^"]*">[^<]*' | head -20
- curl -sL "https://www.google.com/search?q=%22{company.replace(' ', '+')}%22+{city.replace(' ', '+')}+competitors" | head -200

Return ONLY a JSON object:
{{
  "news": [
    {{"title": "Article title", "url": "https://...", "date": "2026-03-15", "summary": "Brief summary"}}
  ],
  "job_postings": [
    {{"title": "Web Developer", "url": "https://...", "posted": "2026-03-10"}}
  ],
  "competitors": ["Competitor A", "Competitor B", "Competitor C"]
}}

Use empty arrays if nothing found. No explanation, just JSON."""

    result = run_claude(prompt)

    updates = {}
    if result.get("competitors"):
        updates["competitors"] = result["competitors"]

    research_data = {}
    if result.get("news"):
        research_data["news"] = result["news"]
    if result.get("job_postings"):
        research_data["job_postings"] = result["job_postings"]

    if research_data:
        updates["research_data"] = research_data

    if updates:
        update_lead(lead["id"], updates)

    return result
```

- [ ] **Step 6: Create synthesis.py**

Create `worker/phases/synthesis.py`:

```python
"""Phase 3: Synthesis — combine all research into an actionable brief."""

import json
from worker.phases.base import run_claude
from worker.supabase_client import update_lead


def run(lead: dict) -> dict:
    """Synthesize all research into a caller brief. Returns results dict."""
    # Build context from all the data we've collected
    context_parts = []

    context_parts.append(f"Company: {lead.get('company_name', 'Unknown')}")
    context_parts.append(f"Industry: {lead.get('industry', 'Unknown')}")
    context_parts.append(f"Location: {lead.get('city', '')}, {lead.get('state', '')}")

    if lead.get("website"):
        context_parts.append(f"Website: {lead['website']}")
    if lead.get("tech_stack"):
        context_parts.append(f"Tech stack: {', '.join(lead['tech_stack'])}")
    if lead.get("page_speed_score") is not None:
        context_parts.append(f"Page speed: {lead['page_speed_score']}/100")
    if lead.get("is_mobile_responsive") is not None:
        context_parts.append(f"Mobile responsive: {lead['is_mobile_responsive']}")
    if lead.get("seo_issues"):
        context_parts.append(f"SEO issues: {', '.join(lead['seo_issues'])}")
    if lead.get("website_quality"):
        context_parts.append(f"Website quality: {lead['website_quality']}/5")
    if lead.get("review_summary"):
        context_parts.append(f"Reviews: {json.dumps(lead['review_summary'])}")
    if lead.get("competitors"):
        context_parts.append(f"Competitors: {', '.join(lead['competitors'])}")
    if lead.get("is_chain"):
        context_parts.append(f"Chain/franchise: parent={lead.get('parent_company')}, HQ={lead.get('hq_location')}")
    if lead.get("research_data"):
        rd = lead["research_data"]
        if rd.get("news"):
            context_parts.append(f"Recent news: {json.dumps(rd['news'][:3])}")
        if rd.get("job_postings"):
            context_parts.append(f"Job postings: {json.dumps(rd['job_postings'][:3])}")

    # Include contacts
    contacts = lead.get("contacts", [])
    if contacts:
        for c in contacts:
            context_parts.append(f"Contact: {c.get('name', '?')} — {c.get('title', 'unknown title')}")

    context = "\n".join(context_parts)

    prompt = f"""You are a sales strategist for a company that sells:
1. AI automation workflows (automate repetitive tasks, AI chatbots, internal tools)
2. AI search optimization (SEO, Google Business Profile, local search ranking)
3. Website development and redesign

A caller is about to phone this business. Based on ALL the research below, write a concise, actionable brief.

RESEARCH DATA:
{context}

Write the brief with this EXACT structure:

**HOOK:** One opening line the caller should say that references something specific about this business (NOT generic). Make it feel personal and researched.

**PAIN POINTS:**
- [2-3 specific pain points based on the research, e.g. "Their WordPress site scores 34/100 on speed — they're losing mobile customers"]

**PITCH:**
- [Which of our 3 services to lead with and WHY based on the data]
- [Secondary service to mention]

**ASK FOR:** [Specific person name and title if found, otherwise "the owner" or "whoever handles the website/marketing"]

**OBJECTION PREP:** [One likely pushback and how to handle it]

Keep the entire brief under 200 words. Be specific, not generic. Reference actual data points.

Return ONLY the brief text, no JSON wrapping, no markdown code blocks."""

    result = run_claude(prompt)

    brief = result.get("raw_output", str(result))
    # Clean up any stray JSON wrapping
    if brief.startswith("{") and "raw_output" in brief:
        try:
            brief = json.loads(brief)["raw_output"]
        except (json.JSONDecodeError, KeyError):
            pass

    update_lead(lead["id"], {"research_brief": brief})
    return {"brief": brief}
```

- [ ] **Step 7: Commit**

```bash
git add worker/phases/
git commit -m "feat: add all 6 research phase modules (website, reviews, social, linkedin, intel, synthesis)"
```

---

## Task 10: Worker — Main Loop

**Files:**
- Create: `worker/worker.py`

- [ ] **Step 1: Create the main worker**

Create `worker/worker.py`:

```python
"""
CallDeck Research Worker — listens to VPS SSE stream, runs research jobs.

Usage:
    python3 -m worker.worker --url https://calldeck.thegeshwar.com --key WORKER_KEY

Architecture mirrors the Y Vault (infographic bot) worker:
1. Opens persistent SSE connection to /api/research/stream
2. Claims jobs via POST /api/research/job/{id}/claim
3. Runs parallel Claude CLI phases
4. Reports progress and results
5. Auto-reconnects on disconnect
"""

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import httpx

from worker.config import (
    CALLDECK_URL, CALLDECK_WORKER_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, WORKER_ID,
)
from worker.phases import website_audit, reviews, social_scan
from worker.phases import linkedin_lookup, business_intel, synthesis


def api(base_url: str, key: str, method: str, path: str, body: dict = None) -> dict:
    """Make an authenticated API call to the CalldDeck server."""
    headers = {"Authorization": f"Bearer {key}"}
    with httpx.Client(timeout=30) as client:
        if method == "GET":
            r = client.get(f"{base_url}{path}", headers=headers)
        elif method == "POST":
            r = client.post(f"{base_url}{path}", headers=headers, json=body or {})
        r.raise_for_status()
        return r.json()


def get_lead_fresh(lead_id: str) -> dict:
    """Fetch current lead data directly from Supabase (includes latest phase writes)."""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    with httpx.Client(timeout=15) as client:
        r = client.get(
            f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead_id}&select=*,contacts(*),social_profiles(*)",
            headers=headers,
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if data else {}


def report_progress(base_url: str, key: str, job_id: str, phase: str, completed: int):
    """Report phase progress to VPS."""
    try:
        api(base_url, key, "POST", f"/api/research/job/{job_id}/progress", {
            "phase": phase,
            "phases_completed": completed,
        })
    except Exception as e:
        print(f"  Warning: progress report failed: {e}")


def execute_research(base_url: str, key: str, job_id: str, lead: dict):
    """Run the full research pipeline on a lead."""
    lead_id = lead["id"]
    print(f"  Starting research for: {lead.get('company_name', 'Unknown')}")

    # ─── Phase 1: Parallel (website, reviews, social) ───
    report_progress(base_url, key, job_id, "phase1", 0)

    phase1_results = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        f_website = pool.submit(safe_run, "website_audit", website_audit.run, lead)
        f_reviews = pool.submit(safe_run, "reviews", reviews.run, lead)
        f_social = pool.submit(safe_run, "social_scan", social_scan.run, lead)

        phase1_results["website"] = f_website.result()
        phase1_results["reviews"] = f_reviews.result()
        phase1_results["social"] = f_social.result()

    report_progress(base_url, key, job_id, "phase1_complete", 3)
    print(f"  Phase 1 complete (website, reviews, social)")

    # Refresh lead data (phases wrote directly to Supabase)
    lead = get_lead_fresh(lead_id)

    # Detect chain from website audit or existing data
    is_chain = lead.get("is_chain", False)

    # ─── Phase 2: Parallel (LinkedIn, business intel) ───
    report_progress(base_url, key, job_id, "phase2", 3)

    with ThreadPoolExecutor(max_workers=2) as pool:
        f_linkedin = pool.submit(safe_run, "linkedin", linkedin_lookup.run, lead, is_chain)
        f_intel = pool.submit(safe_run, "business_intel", business_intel.run, lead)

        phase1_results["linkedin"] = f_linkedin.result()
        phase1_results["intel"] = f_intel.result()

    report_progress(base_url, key, job_id, "phase2_complete", 5)
    print(f"  Phase 2 complete (linkedin, business intel)")

    # Refresh lead data again for synthesis
    lead = get_lead_fresh(lead_id)

    # ─── Phase 3: Synthesis ───
    report_progress(base_url, key, job_id, "synthesis", 5)
    safe_run("synthesis", synthesis.run, lead)
    print(f"  Phase 3 complete (synthesis)")


def safe_run(name: str, fn, *args):
    """Run a phase function, catching errors."""
    try:
        return fn(*args)
    except Exception as e:
        print(f"  Phase '{name}' failed: {type(e).__name__}: {e}")
        return {"error": str(e)}


def process_job(base_url: str, key: str, job_id: str):
    """Claim, execute, and report on a single research job."""
    # Claim
    try:
        api(base_url, key, "POST", f"/api/research/job/{job_id}/claim", {"worker_id": WORKER_ID})
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 409:
            print(f"  Job {job_id} already claimed, skipping")
            return
        raise

    # Get job + lead data
    data = api(base_url, key, "GET", f"/api/research/job/{job_id}")
    lead = data["lead"]

    try:
        execute_research(base_url, key, job_id, lead)
        api(base_url, key, "POST", f"/api/research/job/{job_id}/complete")
        print(f"  Job {job_id} completed successfully")
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"  Job {job_id} failed: {error_msg}")
        try:
            api(base_url, key, "POST", f"/api/research/job/{job_id}/fail", {"error": error_msg})
        except Exception:
            print(f"  Could not report failure for job {job_id}")


def listen(base_url: str, key: str):
    """Connect to SSE stream and process jobs as they arrive."""
    headers = {"Authorization": f"Bearer {key}"}
    url = f"{base_url}/api/research/stream"

    while True:
        try:
            print(f"Connecting to {url}...")
            with httpx.Client(timeout=httpx.Timeout(connect=10, read=60, write=10, pool=10)) as client:
                with client.stream("GET", url, headers=headers) as response:
                    response.raise_for_status()
                    print("Connected. Listening for research jobs...")
                    buffer = ""
                    for chunk in response.iter_text():
                        buffer += chunk
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()
                            if not line or line.startswith(":"):
                                continue
                            if line.startswith("data: "):
                                try:
                                    data = json.loads(line[6:])
                                    job_id = data["job_id"]
                                    print(f"\nResearch job received: #{job_id}")
                                    process_job(base_url, key, job_id)
                                except (json.JSONDecodeError, KeyError) as e:
                                    print(f"Bad SSE data: {e}")

        except httpx.ReadTimeout:
            print("Stream timeout, reconnecting...")
        except (httpx.ConnectError, httpx.RemoteProtocolError) as e:
            print(f"Disconnected: {type(e).__name__}. Reconnecting in 5s...")
            time.sleep(5)
        except KeyboardInterrupt:
            print("\nWorker stopped.")
            sys.exit(0)
        except Exception as e:
            print(f"Error: {type(e).__name__}: {e}. Reconnecting in 10s...")
            time.sleep(10)


def main():
    parser = argparse.ArgumentParser(description="CallDeck Research Worker")
    parser.add_argument("--url", default=CALLDECK_URL, help="CalldDeck server URL")
    parser.add_argument("--key", default=CALLDECK_WORKER_KEY, help="Worker API key")
    args = parser.parse_args()

    if not args.key:
        print("Error: --key is required (or set CALLDECK_WORKER_KEY env var)")
        sys.exit(1)

    print(f"CallDeck Research Worker")
    print(f"  Server: {args.url}")
    print(f"  Key: {args.key[:8]}...")
    print(f"  Worker ID: {WORKER_ID}")
    print()

    listen(args.url, args.key)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add worker/worker.py
git commit -m "feat: add main research worker with SSE listener and parallel phase execution"
```

---

## Task 11: Worker — launchd Plist

**Files:**
- Create: `worker/com.calldeck.worker.plist`

- [ ] **Step 1: Create the launchd plist**

Create `worker/com.calldeck.worker.plist`:

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
        <string>/opt/homebrew/bin/python3</string>
        <string>-u</string>
        <string>-m</string>
        <string>worker.worker</string>
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
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>CALLDECK_URL</key>
        <string>https://calldeck.thegeshwar.com</string>
        <key>CALLDECK_WORKER_KEY</key>
        <string>WORKER_KEY_HERE</string>
        <key>SUPABASE_URL</key>
        <string>https://api.qms.thegeshwar.com</string>
        <key>SUPABASE_SERVICE_KEY</key>
        <string>SERVICE_KEY_HERE</string>
    </dict>
</dict>
</plist>
```

Note: The actual keys must be filled in before loading. Do NOT commit real keys.

- [ ] **Step 2: Create logs directory and add .gitignore**

```bash
mkdir -p worker/logs
echo "*" > worker/logs/.gitignore
echo "!.gitignore" >> worker/logs/.gitignore
```

- [ ] **Step 3: Commit**

```bash
git add worker/com.calldeck.worker.plist worker/logs/.gitignore
git commit -m "feat: add launchd plist for research worker daemon"
```

---

## Task 12: GitHub Issues

- [ ] **Step 1: Create V1 implementation issue**

```bash
cd /home/ubuntu/calldeck
gh issue create \
  --title "Lead Research Worker — V1" \
  --label "feature" \
  --body "$(cat <<'EOF'
## Overview
One-click Research button on leads that spawns Claude CLI workers to build intel dossiers.

## Architecture
- SSE job queue: VPS → Mac worker
- Parallel research phases (website audit, reviews, social scan, LinkedIn, business intel)
- Synthesis phase generates caller brief
- Results stream to UI in real-time via Supabase Realtime

## Spec
`docs/superpowers/specs/2026-03-26-lead-research-worker-design.md`

## Implementation Plan
`docs/superpowers/plans/2026-03-26-lead-research-worker.md`

## Tasks
- [ ] Database migration (research columns + research_jobs table)
- [ ] TypeScript types
- [ ] API routes (start, stream, claim, progress, complete, fail)
- [ ] Server action (startResearch)
- [ ] ResearchButton component
- [ ] IntelStrip for queue card
- [ ] IntelCard for lead detail page
- [ ] Worker core (config, supabase client, base phase)
- [ ] Research phases (6 modules)
- [ ] Worker main loop (SSE listener)
- [ ] launchd plist
- [ ] Deploy and test
EOF
)"
```

- [ ] **Step 2: Create V2 LinkedIn deep scraping issue**

```bash
gh issue create \
  --title "Lead Research — Deep LinkedIn Profile Scraping (V2)" \
  --label "feature,enhancement,future" \
  --body "$(cat <<'EOF'
## Overview
Extend the LinkedIn research phase to visit individual profiles for deeper intel.

## V2 Features
- Visit individual LinkedIn profiles (not just company page)
- Pull full work history, mutual connections, recent posts
- Stealth techniques: random delays, human-like scrolling, session rotation
- Profile screenshot capture for caller reference

## Prerequisites
- V1 research worker must be stable and deployed
- Need to validate LinkedIn doesn't flag the account with V1 usage patterns first

## Depends On
Lead Research Worker — V1
EOF
)"
```

- [ ] **Step 3: Commit plan**

```bash
git add docs/superpowers/plans/2026-03-26-lead-research-worker.md
git commit -m "docs: add lead research worker implementation plan"
git push
```

---

## Task 13: Deploy and Test

- [ ] **Step 1: Run database migration**

Run the migration SQL against Supabase (via dashboard SQL editor or psql).

- [ ] **Step 2: Build and restart Next.js on VPS**

```bash
cd /home/ubuntu/calldeck
git pull
npm run build
# Kill existing dev server
fuser -k 3003/tcp
# Start production server
nohup npx next start -p 3003 > /tmp/calldeck.log 2>&1 &
```

- [ ] **Step 3: Clone repo to Mac and set up worker**

```bash
cd /Users/thegeshwar
git clone https://github.com/thegeshwar/calldeck.git
cd calldeck
pip3 install -r worker/requirements.txt
```

- [ ] **Step 4: Configure worker keys**

Edit `worker/com.calldeck.worker.plist` with real keys from `.env.local` on the VPS.

- [ ] **Step 5: Install and start launchd daemon**

```bash
mkdir -p ~/calldeck/worker/logs
cp ~/calldeck/worker/com.calldeck.worker.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.calldeck.worker.plist
```

- [ ] **Step 6: Verify worker connects**

```bash
tail -f ~/calldeck/worker/logs/worker_stdout.log
# Should see: "Connected. Listening for research jobs..."
```

- [ ] **Step 7: Test end-to-end**

1. Open calldeck.thegeshwar.com
2. Navigate to a lead in the queue
3. Click "Research" button
4. Watch worker logs — should show phases executing
5. Verify lead detail page populates with intel data

- [ ] **Step 8: Commit any fixes and push**

```bash
git add -A
git commit -m "fix: deployment adjustments from testing"
git push
```
