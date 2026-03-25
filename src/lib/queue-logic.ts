import { CallOutcome, Lead } from "./types";

const TZ = "America/Los_Angeles";

/** Returns today's date as YYYY-MM-DD in PST/PDT */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function getQueuePriority(lead: Lead): number {
  const today = todayLocal();
  const followup = lead.next_followup;

  // Priority 1: Overdue follow-ups (oldest first)
  if (followup && followup < today) {
    return 1_000_000 - new Date(followup).getTime() / 1e10;
  }

  // Priority 2: Today's scheduled follow-ups
  if (followup === today) {
    return 2_000_000;
  }

  // Priority 3: Hot leads not yet closed
  if (lead.temperature === "hot" && lead.status !== "won" && lead.status !== "lost") {
    return 3_000_000;
  }

  // Priority 4: Fresh untouched leads (newest imports first)
  if (lead.status === "new") {
    return 4_000_000 + new Date(lead.created_at).getTime() / 1e10;
  }

  // Everything else
  return 5_000_000;
}

export interface AutoFollowupResult {
  days: number | null;
  requiresManualDate: boolean;
  autoStatus?: string;
  autoTemperature?: string;
}

export function getAutoFollowup(outcome: CallOutcome): AutoFollowupResult {
  switch (outcome) {
    case "no_answer":
      return { days: 2, requiresManualDate: false };
    case "voicemail":
      return { days: 3, requiresManualDate: false };
    case "gatekeeper":
      return { days: 1, requiresManualDate: false };
    case "callback_requested":
      return { days: null, requiresManualDate: true, autoStatus: "contacted" };
    case "spoke_to_dm":
      return { days: null, requiresManualDate: true, autoStatus: "contacted" };
    case "interested":
      return {
        days: null,
        requiresManualDate: true,
        autoStatus: "interested",
        autoTemperature: "hot",
      };
    case "not_interested":
      return { days: 30, requiresManualDate: false };
  }
}

/** Adds days to a date and returns YYYY-MM-DD in PST/PDT */
export function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}
