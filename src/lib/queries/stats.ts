import { createClient } from "@/lib/supabase/server";
import { Call, LeadStatus } from "@/lib/types";

type Period = "today" | "week" | "month" | "all";

function getPeriodStart(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case "all":
      return null;
  }
}

export async function getCallStats(period: Period = "week") {
  const supabase = await createClient();
  const since = getPeriodStart(period);

  let query = supabase.from("calls").select("*");
  if (since) query = query.gte("called_at", since);

  const { data, error } = await query;
  if (error) throw error;

  const calls = (data as Call[]) || [];
  const totalCalls = calls.length;
  const connects = calls.filter(
    (c) => c.outcome === "spoke_to_dm" || c.outcome === "interested" || c.outcome === "callback_requested"
  ).length;
  const meetings = calls.filter((c) => c.next_action === "schedule_meeting").length;

  // Per-user breakdown
  const byUser: Record<string, { calls: number; connects: number; meetings: number }> = {};
  calls.forEach((c) => {
    const uid = c.called_by || "unknown";
    if (!byUser[uid]) byUser[uid] = { calls: 0, connects: 0, meetings: 0 };
    byUser[uid].calls++;
    if (["spoke_to_dm", "interested", "callback_requested"].includes(c.outcome)) {
      byUser[uid].connects++;
    }
    if (c.next_action === "schedule_meeting") byUser[uid].meetings++;
  });

  return {
    totalCalls,
    connectRate: totalCalls > 0 ? connects / totalCalls : 0,
    meetings,
    byUser,
  };
}

export async function getCallsByDay(period: Period = "week") {
  const supabase = await createClient();
  const since = getPeriodStart(period);

  let query = supabase.from("calls").select("called_at, called_by");
  if (since) query = query.gte("called_at", since);

  const { data, error } = await query;
  if (error) throw error;

  const calls = (data as Pick<Call, "called_at" | "called_by">[]) || [];
  const byDay: Record<string, Record<string, number>> = {};

  calls.forEach((c) => {
    const day = c.called_at.split("T")[0];
    const uid = c.called_by || "unknown";
    if (!byDay[day]) byDay[day] = {};
    byDay[day][uid] = (byDay[day][uid] || 0) + 1;
  });

  return byDay;
}

export async function getConversionFunnel() {
  const supabase = await createClient();

  const statuses: LeadStatus[] = [
    "new",
    "contacted",
    "interested",
    "meeting_scheduled",
    "proposal_sent",
    "won",
  ];

  const result: Record<string, number> = {};

  for (const status of statuses) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    result[status] = count || 0;
  }

  return result;
}

export async function getOutcomeBreakdown(period: Period = "week") {
  const supabase = await createClient();
  const since = getPeriodStart(period);

  let query = supabase.from("calls").select("outcome");
  if (since) query = query.gte("called_at", since);

  const { data, error } = await query;
  if (error) throw error;

  const counts: Record<string, number> = {};
  (data || []).forEach((c: { outcome: string }) => {
    counts[c.outcome] = (counts[c.outcome] || 0) + 1;
  });

  return counts;
}

export async function getPipelineValue() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "proposal_sent");

  return (count || 0) * 500;
}
