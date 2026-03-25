"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addContact(
  leadId: string,
  data: {
    name?: string;
    title?: string;
    direct_phone?: string;
    email?: string;
    linkedin?: string;
    is_primary?: boolean;
  }
) {
  const supabase = await createClient();

  const { data: contact, error } = await supabase.from("contacts").insert({
    lead_id: leadId,
    ...data,
  }).select().single();

  if (error) throw error;
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/queue");
  return contact;
}

export async function updateContact(
  id: string,
  leadId: string,
  data: Partial<{
    name: string;
    title: string;
    direct_phone: string;
    email: string;
    linkedin: string;
  }>
) {
  const supabase = await createClient();

  const { error } = await supabase.from("contacts").update(data).eq("id", id);
  if (error) throw error;

  revalidatePath(`/leads/${leadId}`);
}

export async function deleteContact(id: string, leadId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;

  revalidatePath(`/leads/${leadId}`);
}

export async function setPrimaryContact(leadId: string, contactId: string) {
  const supabase = await createClient();

  // Unset all primary for this lead
  await supabase
    .from("contacts")
    .update({ is_primary: false })
    .eq("lead_id", leadId);

  // Set the selected one as primary
  const { error } = await supabase
    .from("contacts")
    .update({ is_primary: true })
    .eq("id", contactId);

  if (error) throw error;
  revalidatePath(`/leads/${leadId}`);
}
