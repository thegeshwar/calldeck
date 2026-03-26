// Enums matching database types

export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "meeting_scheduled"
  | "proposal_sent"
  | "won"
  | "lost";

export type LeadTemperature = "hot" | "warm" | "cold";

export type CallOutcome =
  | "no_answer"
  | "voicemail"
  | "gatekeeper"
  | "spoke_to_dm"
  | "callback_requested"
  | "not_interested"
  | "interested";

export type NextActionType =
  | "follow_up"
  | "send_proposal"
  | "schedule_meeting"
  | "close_won"
  | "close_lost"
  | "none";

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "youtube"
  | "tiktok"
  | "other";

// Table types

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  company_name: string;
  industry: string | null;
  website: string | null;
  website_quality: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  employee_count: number | null;
  revenue_estimate: string | null;
  source: string | null;
  import_id: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  next_followup: string | null;
  followup_reason: string | null;
  interested_services: string[] | null;
  objections: string | null;
  notes: string | null;
  assigned_to: string | null;
  google_rating: number | null;
  google_reviews: number | null;
  google_categories: string[] | null;
  google_hours: string[] | null;
  google_maps_url: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
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
}

export interface Contact {
  id: string;
  lead_id: string;
  name: string | null;
  title: string | null;
  direct_phone: string | null;
  email: string | null;
  linkedin: string | null;
  is_primary: boolean;
}

export interface SocialProfile {
  id: string;
  lead_id: string;
  platform: SocialPlatform;
  url: string | null;
  followers: number | null;
  notes: string | null;
}

export interface Call {
  id: string;
  lead_id: string;
  called_by: string | null;
  called_at: string;
  duration_seconds: number;
  outcome: CallOutcome;
  notes: string | null;
  next_action: NextActionType;
}

export interface Import {
  id: string;
  filename: string;
  imported_at: string;
  imported_by: string | null;
  lead_count: number;
  duplicates_skipped: number;
}

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

export interface Profile {
  id: string;
  display_name: string;
  avatar_color: string;
  theme: string;
}

// Composite types

export interface LeadWithRelations extends Lead {
  contacts: Contact[];
  social_profiles: SocialProfile[];
  calls: Call[];
}

// Prospect types

export interface ProspectResult {
  place_id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string;
  city: string;
  state: string;
  rating: number | null;
  reviews: number | null;
  categories: string[];
  hours: string[];
  maps_url: string;
  lat: number;
  lng: number;
  isOpen: boolean | null;
  isInDB: boolean;
}

// Display helpers

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  meeting_scheduled: "Meeting",
  proposal_sent: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "No Answer",
  voicemail: "Voicemail",
  gatekeeper: "Gatekeeper",
  spoke_to_dm: "Spoke to DM",
  callback_requested: "Callback",
  not_interested: "Not Interested",
  interested: "Interested",
};

export const ACTION_LABELS: Record<NextActionType, string> = {
  follow_up: "Follow Up",
  send_proposal: "Send Proposal",
  schedule_meeting: "Schedule Meeting",
  close_won: "Close Won",
  close_lost: "Close Lost",
  none: "None",
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Other",
};
