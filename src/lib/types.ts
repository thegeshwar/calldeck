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
