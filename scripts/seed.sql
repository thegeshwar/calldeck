-- Seed data for CallDeck
-- Run: PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f /home/ubuntu/calldeck/scripts/seed.sql

-- Get user IDs
DO $$
DECLARE
  geshwar_id UUID;
  partner_id UUID;
  lead_ids UUID[];
  l_id UUID;
BEGIN
  SELECT id INTO geshwar_id FROM auth.users WHERE email = 'geshwar@calldeck.app';
  SELECT id INTO partner_id FROM auth.users WHERE email = 'partner@calldeck.app';

  -- Create import record
  INSERT INTO imports (id, filename, imported_by, lead_count, duplicates_skipped)
  VALUES ('00000000-0000-0000-0000-000000000001', 'seed-data.csv', geshwar_id, 20, 0);

  -- Lead 1: Overdue hot lead
  INSERT INTO leads (id, company_name, industry, website, website_quality, phone, email, city, state, employee_count, revenue_estimate, source, status, temperature, next_followup, followup_reason, interested_services, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Bright Dental Care', 'Healthcare', 'brightdentalcare.com', 2, '(555) 100-1001', 'info@brightdental.com', 'Austin', 'TX', 15, '$1-2M', 'Google Maps', 'interested', 'hot', CURRENT_DATE - 3, 'Follow up on AI search optimization proposal', ARRAY['AI Search', 'Website'], geshwar_id, '00000000-0000-0000-0000-000000000001')
  RETURNING id INTO l_id;
  INSERT INTO contacts (lead_id, name, title, direct_phone, email, is_primary) VALUES (l_id, 'Dr. Sarah Chen', 'Owner', '(555) 100-1002', 'sarah@brightdental.com', true);
  INSERT INTO social_profiles (lead_id, platform, url, followers) VALUES (l_id, 'facebook', 'https://facebook.com/brightdentalcare', 2400);
  INSERT INTO social_profiles (lead_id, platform, url, followers) VALUES (l_id, 'instagram', 'https://instagram.com/brightdentalatx', 890);
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, geshwar_id, NOW() - INTERVAL '5 days', 180, 'spoke_to_dm', 'Spoke with Dr. Chen. Very interested in AI search optimization. Website is outdated. Wants proposal.', 'send_proposal');
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, geshwar_id, NOW() - INTERVAL '10 days', 45, 'voicemail', 'Left voicemail introducing QMS Agents services.', 'follow_up');

  -- Lead 2: Due today warm lead
  INSERT INTO leads (id, company_name, industry, website, website_quality, phone, email, city, state, employee_count, source, status, temperature, next_followup, followup_reason, interested_services, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Martinez Auto Repair', 'Automotive', 'martinezauto.net', 1, '(555) 200-2001', 'mike@martinezauto.net', 'San Antonio', 'TX', 8, 'Referral', 'contacted', 'warm', CURRENT_DATE, 'Callback requested - call after 2pm', ARRAY['Website', 'Process Automation'], partner_id, '00000000-0000-0000-0000-000000000001')
  RETURNING id INTO l_id;
  INSERT INTO contacts (lead_id, name, title, direct_phone, is_primary) VALUES (l_id, 'Mike Martinez', 'Owner', '(555) 200-2002', true);
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, partner_id, NOW() - INTERVAL '2 days', 120, 'callback_requested', 'Mike said to call back Thursday after 2pm. Interested in new website.', 'follow_up');

  -- Lead 3: Hot lead - meeting scheduled
  INSERT INTO leads (id, company_name, industry, website, website_quality, phone, email, city, state, employee_count, revenue_estimate, source, status, temperature, next_followup, followup_reason, interested_services, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Peak Performance Gym', 'Fitness', 'peakperformancegym.com', 3, '(555) 300-3001', 'hello@peakgym.com', 'Dallas', 'TX', 25, '$2-5M', 'LinkedIn', 'meeting_scheduled', 'hot', CURRENT_DATE + 2, 'Demo meeting scheduled for Friday', ARRAY['AI Search', 'Process Automation', 'Website'], geshwar_id, '00000000-0000-0000-0000-000000000001')
  RETURNING id INTO l_id;
  INSERT INTO contacts (lead_id, name, title, direct_phone, email, linkedin, is_primary) VALUES (l_id, 'James Wilson', 'CEO', '(555) 300-3002', 'james@peakgym.com', 'https://linkedin.com/in/jameswilson', true);
  INSERT INTO contacts (lead_id, name, title, email) VALUES (l_id, 'Lisa Park', 'Marketing Director', 'lisa@peakgym.com');
  INSERT INTO social_profiles (lead_id, platform, url, followers) VALUES (l_id, 'instagram', 'https://instagram.com/peakperformancegym', 12000);
  INSERT INTO social_profiles (lead_id, platform, url, followers) VALUES (l_id, 'youtube', 'https://youtube.com/@peakgym', 3200);
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, geshwar_id, NOW() - INTERVAL '1 day', 420, 'interested', 'Great call with James. Loves the AI search concept. Wants full demo. Scheduled for Friday 10am.', 'schedule_meeting');
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, geshwar_id, NOW() - INTERVAL '4 days', 60, 'spoke_to_dm', 'Brief intro call. James is open to hearing more.', 'follow_up');

  -- Lead 4: Fresh untouched
  INSERT INTO leads (id, company_name, industry, website, website_quality, phone, email, city, state, employee_count, source, status, temperature, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Golden Gate Plumbing', 'Home Services', 'goldengateplumbing.com', 2, '(555) 400-4001', 'office@ggplumbing.com', 'Houston', 'TX', 12, 'Google Maps', 'new', 'cold', geshwar_id, '00000000-0000-0000-0000-000000000001');

  -- Lead 5: Fresh untouched
  INSERT INTO leads (id, company_name, industry, phone, city, state, employee_count, source, status, temperature, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Sunrise Bakery', 'Food & Beverage', '(555) 500-5001', 'Austin', 'TX', 6, 'Google Maps', 'new', 'cold', partner_id, '00000000-0000-0000-0000-000000000001');

  -- Lead 6: Contacted, follow-up next week
  INSERT INTO leads (id, company_name, industry, website, website_quality, phone, city, state, employee_count, source, status, temperature, next_followup, followup_reason, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Lone Star Legal', 'Legal', 'lonestarlegal.com', 4, '(555) 600-6001', 'Dallas', 'TX', 20, 'Referral', 'contacted', 'warm', CURRENT_DATE + 5, 'Send case study about AI search for law firms', geshwar_id, '00000000-0000-0000-0000-000000000001')
  RETURNING id INTO l_id;
  INSERT INTO contacts (lead_id, name, title, direct_phone, email, is_primary) VALUES (l_id, 'Robert Hughes', 'Managing Partner', '(555) 600-6002', 'robert@lonestarlegal.com', true);
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, geshwar_id, NOW() - INTERVAL '3 days', 90, 'spoke_to_dm', 'Robert interested but wants to see case studies first. Email him examples.', 'send_proposal');

  -- Lead 7: Won
  INSERT INTO leads (id, company_name, industry, website, website_quality, phone, city, state, employee_count, source, status, temperature, interested_services, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Cactus Coffee Co', 'Food & Beverage', 'cactuscoffee.com', 3, '(555) 700-7001', 'Austin', 'TX', 10, 'Cold Call', 'won', 'hot', ARRAY['AI Search', 'Website'], geshwar_id, '00000000-0000-0000-0000-000000000001')
  RETURNING id INTO l_id;
  INSERT INTO contacts (lead_id, name, title, is_primary) VALUES (l_id, 'Maria Gonzalez', 'Owner', true);
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, geshwar_id, NOW() - INTERVAL '7 days', 600, 'interested', 'Closed the deal! Starting with AI search and new website. $500/mo.', 'close_won');

  -- Lead 8: Lost
  INSERT INTO leads (id, company_name, industry, phone, city, state, source, status, temperature, objections, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Budget Cleaners', 'Cleaning Services', '(555) 800-8001', 'San Antonio', 'TX', 'Google Maps', 'lost', 'cold', 'Too expensive, already has a website guy', partner_id, '00000000-0000-0000-0000-000000000001')
  RETURNING id INTO l_id;
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, partner_id, NOW() - INTERVAL '6 days', 180, 'not_interested', 'Owner said $500/mo is too much. Has nephew who does their website. Passed.', 'close_lost');

  -- Lead 9: Proposal sent
  INSERT INTO leads (id, company_name, industry, website, website_quality, phone, email, city, state, employee_count, revenue_estimate, source, status, temperature, next_followup, followup_reason, interested_services, assigned_to, import_id)
  VALUES (gen_random_uuid(), 'Hill Country Realty', 'Real Estate', 'hillcountryrealty.com', 2, '(555) 900-9001', 'info@hcrealty.com', 'San Antonio', 'TX', 30, '$5-10M', 'LinkedIn', 'proposal_sent', 'hot', CURRENT_DATE + 1, 'Follow up on proposal sent yesterday', ARRAY['AI Search', 'Process Automation'], partner_id, '00000000-0000-0000-0000-000000000001')
  RETURNING id INTO l_id;
  INSERT INTO contacts (lead_id, name, title, direct_phone, email, linkedin, is_primary) VALUES (l_id, 'David Chen', 'Broker/Owner', '(555) 900-9002', 'david@hcrealty.com', 'https://linkedin.com/in/davidchenhcr', true);
  INSERT INTO social_profiles (lead_id, platform, url, followers) VALUES (l_id, 'facebook', 'https://facebook.com/hillcountryrealty', 5600);
  INSERT INTO social_profiles (lead_id, platform, url, followers) VALUES (l_id, 'linkedin', 'https://linkedin.com/company/hillcountryrealty', 1200);
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, partner_id, NOW() - INTERVAL '1 day', 300, 'spoke_to_dm', 'David reviewed the proposal. Likes it. Will discuss with partner. Follow up tomorrow.', 'follow_up');
  INSERT INTO calls (lead_id, called_by, called_at, duration_seconds, outcome, notes, next_action)
  VALUES (l_id, partner_id, NOW() - INTERVAL '5 days', 240, 'interested', 'Very interested in AI search for real estate listings. Wants proposal.', 'send_proposal');

  -- Leads 10-20: Mix of fresh and contacted
  INSERT INTO leads (company_name, industry, phone, city, state, source, status, temperature, assigned_to, import_id)
  VALUES
    ('Texas Star Electric', 'Electrical', '(555) 110-1001', 'Houston', 'TX', 'Google Maps', 'new', 'cold', geshwar_id, '00000000-0000-0000-0000-000000000001'),
    ('Bluebonnet Landscaping', 'Landscaping', '(555) 120-1201', 'Austin', 'TX', 'Google Maps', 'new', 'cold', partner_id, '00000000-0000-0000-0000-000000000001'),
    ('Capital City HVAC', 'HVAC', '(555) 130-1301', 'Austin', 'TX', 'Yelp', 'new', 'cold', geshwar_id, '00000000-0000-0000-0000-000000000001'),
    ('Rio Grande Insurance', 'Insurance', '(555) 140-1401', 'El Paso', 'TX', 'Referral', 'new', 'cold', partner_id, '00000000-0000-0000-0000-000000000001'),
    ('Alamo Accounting', 'Accounting', '(555) 150-1501', 'San Antonio', 'TX', 'LinkedIn', 'new', 'cold', geshwar_id, '00000000-0000-0000-0000-000000000001'),
    ('Pecos Pet Hospital', 'Veterinary', '(555) 160-1601', 'Dallas', 'TX', 'Google Maps', 'new', 'cold', partner_id, '00000000-0000-0000-0000-000000000001'),
    ('Magnolia Spa & Wellness', 'Health & Wellness', '(555) 170-1701', 'Houston', 'TX', 'Instagram', 'new', 'cold', geshwar_id, '00000000-0000-0000-0000-000000000001'),
    ('Panhandle Printing', 'Printing', '(555) 180-1801', 'Amarillo', 'TX', 'Google Maps', 'new', 'cold', partner_id, '00000000-0000-0000-0000-000000000001'),
    ('Desert Rose Florist', 'Retail', '(555) 190-1901', 'El Paso', 'TX', 'Yelp', 'new', 'cold', geshwar_id, '00000000-0000-0000-0000-000000000001'),
    ('Bayou City Roofing', 'Roofing', '(555) 200-2001', 'Houston', 'TX', 'Google Maps', 'new', 'cold', partner_id, '00000000-0000-0000-0000-000000000001'),
    ('Longhorn Digital Marketing', 'Marketing', '(555) 210-2101', 'Dallas', 'TX', 'Cold Call', 'new', 'cold', geshwar_id, '00000000-0000-0000-0000-000000000001');

  -- Update import count
  UPDATE imports SET lead_count = 20 WHERE id = '00000000-0000-0000-0000-000000000001';

  RAISE NOTICE 'Seed data inserted: 20 leads, contacts, social profiles, and calls';
END $$;
