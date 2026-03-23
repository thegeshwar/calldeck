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

  // Set follow-up date
  if (data.followup_date) {
    leadUpdate.next_followup = data.followup_date;
  } else if (auto.days !== null) {
    leadUpdate.next_followup = addDays(new Date(), auto.days);
  }

  // Auto-update status
  if (auto.autoStatus) {
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
