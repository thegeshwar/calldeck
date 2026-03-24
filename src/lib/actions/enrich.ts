"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveIndustry } from "@/lib/enrich/industry";
import { scoreWebsite } from "@/lib/enrich/website-score";
import { scrapeEmail } from "@/lib/enrich/email-scraper";
import { revalidatePath } from "next/cache";

interface EnrichResult {
  id: string;
  company_name: string;
  industry: string | null;
  website_quality: number | null;
  email: string | null;
  errors: string[];
}

/**
 * Enrich a single lead with industry, website quality, and email.
 * Only fills in fields that are currently null.
 */
export async function enrichLead(leadId: string): Promise<EnrichResult> {
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, industry, website, website_quality, email, google_categories"
    )
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    return {
      id: leadId,
      company_name: "Unknown",
      industry: null,
      website_quality: null,
      email: null,
      errors: ["Lead not found"],
    };
  }

  const updates: Record<string, unknown> = {};
  const errors: string[] = [];

  // 1. Industry from categories
  if (!lead.industry && lead.google_categories) {
    const industry = resolveIndustry(lead.google_categories);
    if (industry) {
      updates.industry = industry;
    }
  }

  // 2. Website quality score
  if (!lead.website_quality && lead.website) {
    try {
      const { score } = await scoreWebsite(lead.website);
      updates.website_quality = score;
    } catch (err) {
      errors.push(`Website score failed: ${err}`);
    }
  }

  // 3. Email scraping
  if (!lead.email && lead.website) {
    try {
      const { email } = await scrapeEmail(lead.website);
      if (email) {
        updates.email = email;
      }
    } catch (err) {
      errors.push(`Email scrape failed: ${err}`);
    }
  }

  // Apply updates
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", leadId);

    if (updateError) {
      errors.push(`DB update failed: ${updateError.message}`);
    }
  }

  revalidatePath(`/leads/${leadId}`);

  return {
    id: lead.id,
    company_name: lead.company_name,
    industry: (updates.industry as string) || lead.industry,
    website_quality:
      (updates.website_quality as number) || lead.website_quality,
    email: (updates.email as string) || lead.email,
    errors,
  };
}

/**
 * Enrich all leads that have missing fields.
 * Returns a summary of what was enriched.
 */
export async function enrichAllLeads(): Promise<{
  total: number;
  enriched: number;
  results: EnrichResult[];
}> {
  const supabase = await createClient();

  // Get leads missing at least one enrichable field
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id")
    .or(
      "industry.is.null,website_quality.is.null,email.is.null"
    )
    .order("created_at", { ascending: false });

  if (error || !leads) {
    return { total: 0, enriched: 0, results: [] };
  }

  const results: EnrichResult[] = [];
  let enriched = 0;

  for (const lead of leads) {
    const result = await enrichLead(lead.id);
    results.push(result);
    if (result.industry || result.website_quality || result.email) {
      enriched++;
    }
  }

  revalidatePath("/leads");
  revalidatePath("/queue");

  return { total: leads.length, enriched, results };
}
