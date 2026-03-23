"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ImportLead {
  company_name: string;
  phone?: string;
  email?: string;
  industry?: string;
  website?: string;
  city?: string;
  state?: string;
  address?: string;
  employee_count?: number;
  revenue_estimate?: string;
  source?: string;
}

export async function createImport(
  filename: string,
  leads: ImportLead[],
  userId: string
) {
  const supabase = await createClient();

  // Create import record
  const { data: importRecord, error: importError } = await supabase
    .from("imports")
    .insert({
      filename,
      imported_by: userId,
      lead_count: 0,
      duplicates_skipped: 0,
    })
    .select()
    .single();

  if (importError) throw importError;

  let imported = 0;
  let skipped = 0;

  for (const lead of leads) {
    // Duplicate detection: match by phone OR company_name
    let isDuplicate = false;

    if (lead.phone) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("phone", lead.phone);
      if (count && count > 0) isDuplicate = true;
    }

    if (!isDuplicate && lead.company_name) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .ilike("company_name", lead.company_name);
      if (count && count > 0) isDuplicate = true;
    }

    if (isDuplicate) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("leads").insert({
      ...lead,
      import_id: importRecord.id,
      assigned_to: userId,
    });

    if (!error) imported++;
  }

  // Update import record with final counts
  await supabase
    .from("imports")
    .update({ lead_count: imported, duplicates_skipped: skipped })
    .eq("id", importRecord.id);

  revalidatePath("/leads");
  revalidatePath("/queue");
  revalidatePath("/import");

  return { imported, skipped };
}
