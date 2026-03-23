-- Enums
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'interested', 'meeting_scheduled', 'proposal_sent', 'won', 'lost');
CREATE TYPE lead_temperature AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE call_outcome AS ENUM ('no_answer', 'voicemail', 'gatekeeper', 'spoke_to_dm', 'callback_requested', 'not_interested', 'interested');
CREATE TYPE next_action_type AS ENUM ('follow_up', 'send_proposal', 'schedule_meeting', 'close_won', 'close_lost', 'none');
CREATE TYPE social_platform AS ENUM ('facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'tiktok', 'other');

-- Imports table (must come before leads due to FK)
CREATE TABLE imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id),
  lead_count INT DEFAULT 0,
  duplicates_skipped INT DEFAULT 0
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  website_quality INT CHECK (website_quality BETWEEN 1 AND 5),
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  employee_count INT,
  revenue_estimate TEXT,
  source TEXT,
  import_id UUID REFERENCES imports(id),
  status lead_status DEFAULT 'new',
  temperature lead_temperature DEFAULT 'cold',
  next_followup DATE,
  followup_reason TEXT,
  interested_services TEXT[],
  objections TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id)
);

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name TEXT,
  title TEXT,
  direct_phone TEXT,
  email TEXT,
  linkedin TEXT,
  is_primary BOOLEAN DEFAULT false
);

-- Social profiles table
CREATE TABLE social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  url TEXT,
  followers INT,
  notes TEXT
);

-- Calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  called_by UUID REFERENCES auth.users(id),
  called_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds INT DEFAULT 0,
  outcome call_outcome NOT NULL,
  notes TEXT,
  next_action next_action_type DEFAULT 'none'
);

-- User profiles for CallDeck (named cd_profiles to avoid conflict with QMS Leader profiles table)
CREATE TABLE cd_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#22c55e',
  theme TEXT DEFAULT 'obsidian-wine'
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_temperature ON leads(temperature);
CREATE INDEX idx_leads_next_followup ON leads(next_followup);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_called_at ON calls(called_at);
CREATE INDEX idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX idx_social_profiles_lead_id ON social_profiles(lead_id);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cd_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (both users see everything — 2-person team)
CREATE POLICY "Authenticated users can do anything" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do anything" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do anything" ON social_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do anything" ON calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do anything" ON imports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can do anything" ON cd_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for leads and calls
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
