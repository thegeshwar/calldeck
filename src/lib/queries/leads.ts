import { createClient } from "@/lib/supabase/server";
import { Lead, LeadWithRelations, LeadStatus, LeadTemperature } from "@/lib/types";
import { getQueuePriority, todayLocal } from "@/lib/queue-logic";

export async function getQueueLeads(): Promise<LeadWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, contacts(*), social_profiles(*), calls(*)")
    .not("status", "in", '("won","lost")')
    .order("created_at", { ascending: false });

  if (error) throw error;

  const leads = (data as LeadWithRelations[]) || [];

  // Sort calls within each lead
  leads.forEach((lead) => {
    lead.calls.sort(
      (a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime()
    );
  });

  // Sort by queue priority
  leads.sort((a, b) => getQueuePriority(a) - getQueuePriority(b));

  return leads;
}

export async function getLeadById(id: string): Promise<LeadWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, contacts(*), social_profiles(*), calls(*)")
    .eq("id", id)
    .single();

  if (error) return null;

  const lead = data as LeadWithRelations;
  lead.calls.sort(
    (a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime()
  );

  return lead;
}

export interface LeadListFilters {
  search?: string;
  status?: LeadStatus;
  temperature?: LeadTemperature;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function getLeadsList(filters: LeadListFilters = {}) {
  const supabase = await createClient();
  const { search, status, temperature, page = 1, pageSize = 10, sortBy = "created_at", sortDir = "desc" } = filters;

  let query = supabase
    .from("leads")
    .select("*, contacts(*), calls(id)", { count: "exact" });

  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (temperature) {
    query = query.eq("temperature", temperature);
  }

  query = query
    .order(sortBy, { ascending: sortDir === "asc" })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return { leads: (data as (Lead & { contacts: { name: string }[]; calls: { id: string }[] })[]) || [], total: count || 0 };
}

export async function getLeadCount(): Promise<number> {
  const supabase = await createClient();
  const today = todayLocal();

  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .not("status", "in", '("won","lost")')
    .or(`next_followup.lte.${today},status.eq.new,temperature.eq.hot`);

  if (error) return 0;
  return count || 0;
}
