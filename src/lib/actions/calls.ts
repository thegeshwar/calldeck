"use server";

import { createClient } from "@/lib/supabase/server";
import { CallOutcome, NextActionType } from "@/lib/types";
import { getAutoFollowup, addDays } from "@/lib/queue-logic";
import { revalidatePath } from "next/cache";

export async function logCall(data: {
  lead_id: string;
  outcome: CallOutcome;
  notes?: string;
  next_action: NextActionType;
  duration_seconds?: number;
  followup_date?: string;
  mark_lost?: boolean;
  lost_reason?: string;
  requeue?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Insert call record
  const { error: callError } = await supabase.from("calls").insert({
    lead_id: data.lead_id,
    called_by: user?.id,
    outcome: data.outcome,
    notes: data.notes || null,
    next_action: data.next_action,
    duration_seconds: data.duration_seconds || 0,
  });

  if (callError) throw callError;

  // Apply auto-rules
  const auto = getAutoFollowup(data.outcome);
  const leadUpdate: Record<string, unknown> = {};

  // Fetch current lead to make informed status decisions
  const { data: currentLead } = await supabase
    .from("leads")
    .select("status")
    .eq("id", data.lead_id)
    .single();

  // Status progression: new → contacted → interested → meeting_scheduled → proposal_sent
  // Only upgrade status, never downgrade
  const STATUS_RANK: Record<string, number> = {
    new: 0, contacted: 1, interested: 2, meeting_scheduled: 3, proposal_sent: 4,
  };
  const currentRank = STATUS_RANK[currentLead?.status || "new"] ?? 0;

  // Any call on a "new" lead should move it to "contacted" at minimum
  if (currentRank < STATUS_RANK.contacted) {
    leadUpdate.status = "contacted";
  }

  // Set follow-up date
  if (data.followup_date) {
    leadUpdate.next_followup = data.followup_date;
  } else if (auto.days !== null) {
    leadUpdate.next_followup = addDays(new Date(), auto.days);
  }

  // Auto-update status (only if it's a promotion, not a downgrade)
  if (auto.autoStatus && (STATUS_RANK[auto.autoStatus] ?? 0) > currentRank) {
    leadUpdate.status = auto.autoStatus;
  }

  // Auto-update temperature
  if (auto.autoTemperature) {
    leadUpdate.temperature = auto.autoTemperature;
  }

  // Handle "not interested" → mark as lost
  if (data.mark_lost) {
    leadUpdate.status = "lost";
    leadUpdate.next_followup = null;
    if (data.lost_reason) {
      leadUpdate.objections = data.lost_reason;
    }
  }

  // Set follow-up reason from notes
  if (data.notes) {
    leadUpdate.followup_reason = data.notes;
  }

  // Re-queue override: clear followup so lead stays in today's queue
  if (data.requeue) {
    leadUpdate.next_followup = null;
  }

  if (Object.keys(leadUpdate).length > 0) {
    const { error: leadError } = await supabase
      .from("leads")
      .update(leadUpdate)
      .eq("id", data.lead_id);

    if (leadError) throw leadError;
  }

  revalidatePath("/queue");
  revalidatePath("/leads");
  revalidatePath(`/leads/${data.lead_id}`);
  revalidatePath("/follow-ups");
  revalidatePath("/stats");
}

export async function updateCall(
  callId: string,
  data: Partial<{
    notes: string;
    outcome: CallOutcome;
    next_action: NextActionType;
  }>
) {
  const supabase = await createClient();

  const { error } = await supabase.from("calls").update(data).eq("id", callId);
  if (error) throw error;

  revalidatePath("/queue");
  revalidatePath("/leads");
  revalidatePath("/stats");
}
