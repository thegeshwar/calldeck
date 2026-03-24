-- Add Google Places fields to leads table for prospect/hydration feature
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_reviews INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_categories TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_hours TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

CREATE INDEX IF NOT EXISTS idx_leads_google_place_id ON leads(google_place_id);
