-- Cache for Google Places search results to avoid duplicate API calls
CREATE TABLE prospect_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  keyword TEXT,
  radius INT NOT NULL,
  page INT NOT NULL DEFAULT 0,
  next_page_token TEXT,
  results JSONB NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prospect_cache_key ON prospect_cache(cache_key);
CREATE INDEX idx_prospect_cache_created ON prospect_cache(created_at);

-- RLS
ALTER TABLE prospect_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do anything" ON prospect_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
