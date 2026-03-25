"use server";

import { createClient } from "@/lib/supabase/server";
import { LeadStatus, LeadTemperature } from "@/lib/types";
import { addDays } from "@/lib/queue-logic";
import { revalidatePath } from "next/cache";

export async function createLead(data: {
  company_name: string;
  phone?: string;
  email?: string;
  industry?: string;
  city?: string;
  state?: string;
  website?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ ...data, assigned_to: user?.id })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/leads");
  revalidatePath("/queue");
  return lead;
}

export async function updateLead(
  id: string,
  data: Partial<{
    company_name: string;
    industry: string;
    website: string;
    website_quality: number;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    employee_count: number;
    revenue_estimate: string;
    source: string;
    notes: string;
    objections: string;
    interested_services: string[];
    followup_reason: string;
  }>
) {
  const supabase = await createClient();

  const { error } = await supabase.from("leads").update(data).eq("id", id);
  if (error) throw error;

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/queue");
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  temperature?: LeadTemperature
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { status };
  if (temperature) update.temperature = temperature;

  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) throw error;

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/queue");
}

export async function skipLead(id: string) {
  const supabase = await createClient();

  // Clear follow-up so lead drops to priority 5 (back of queue)
  const { error } = await supabase
    .from("leads")
    .update({ next_followup: null })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/queue");
  revalidatePath("/follow-ups");
}

export async function snoozeLead(id: string, days: number = 1) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({ next_followup: addDays(new Date(), days) })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/queue");
  revalidatePath("/follow-ups");
}

export async function assignLead(id: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({ assigned_to: userId })
    .eq("id", id);

  if (error) throw error;
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}
