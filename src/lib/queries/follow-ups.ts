import { createClient } from "@/lib/supabase/server";
import { Lead } from "@/lib/types";

export async function getFollowUpsForWeek(startDate: string) {
  const supabase = await createClient();
  const end = new Date(startDate);
  end.setDate(end.getDate() + 7);
  const endDate = end.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("leads")
    .select("id, company_name, temperature, next_followup, status, contacts(name, is_primary)")
    .gte("next_followup", startDate)
    .lt("next_followup", endDate)
    .not("status", "in", '("won","lost")')
    .order("next_followup");

  if (error) throw error;

  // Group by day
  const byDay: Record<string, typeof data> = {};
  (data || []).forEach((lead) => {
    const day = lead.next_followup!;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(lead);
  });

  return byDay;
}

export async function getOverdueCount(): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .lt("next_followup", today)
    .not("status", "in", '("won","lost")');

  if (error) return 0;
  return count || 0;
}

export async function getOverdueLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .lt("next_followup", today)
    .not("status", "in", '("won","lost")')
    .order("next_followup");

  if (error) return [];
  return (data as Lead[]) || [];
}
