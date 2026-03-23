"use server";

import { createClient } from "@/lib/supabase/server";
import { SocialPlatform } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function addSocialProfile(
  leadId: string,
  data: {
    platform: SocialPlatform;
    url?: string;
    followers?: number;
    notes?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase.from("social_profiles").insert({
    lead_id: leadId,
    ...data,
  });

  if (error) throw error;
  revalidatePath(`/leads/${leadId}`);
}

export async function updateSocialProfile(
  id: string,
  leadId: string,
  data: Partial<{
    platform: SocialPlatform;
    url: string;
    followers: number;
    notes: string;
  }>
) {
  const supabase = await createClient();

  const { error } = await supabase.from("social_profiles").update(data).eq("id", id);
  if (error) throw error;

  revalidatePath(`/leads/${leadId}`);
}

export async function deleteSocialProfile(id: string, leadId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("social_profiles").delete().eq("id", id);
  if (error) throw error;

  revalidatePath(`/leads/${leadId}`);
}
