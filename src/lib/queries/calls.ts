import { createClient } from "@/lib/supabase/server";
import { Call } from "@/lib/types";

export async function getCallsForLead(leadId: string): Promise<Call[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("lead_id", leadId)
    .order("called_at", { ascending: false });

  if (error) throw error;
  return (data as Call[]) || [];
}

export async function getRecentCalls(userId: string, days: number): Promise<Call[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("called_by", userId)
    .gte("called_at", since.toISOString())
    .order("called_at", { ascending: false });

  if (error) throw error;
  return (data as Call[]) || [];
}
