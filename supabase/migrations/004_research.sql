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
