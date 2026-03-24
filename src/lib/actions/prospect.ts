"use server";

import { createClient } from "@/lib/supabase/server";
import { ProspectResult } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function importProspects(prospects: ProspectResult[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let imported = 0;
  let skipped = 0;

  for (const p of prospects) {
    // Final dedup check
    const { count: byPlaceId } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("google_place_id", p.place_id);

    if (byPlaceId && byPlaceId > 0) {
      skipped++;
      continue;
    }

    if (p.phone) {
      const { count: byPhone } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("phone", p.phone);
      if (byPhone && byPhone > 0) {
        skipped++;
        continue;
      }
    }

    const { count: byName } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .ilike("company_name", p.name);
    if (byName && byName > 0) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("leads").insert({
      company_name: p.name,
      phone: p.phone,
      website: p.website,
      address: p.address,
      city: p.city,
      state: p.state,
      source: "Google Maps",
      status: "new",
      temperature: "cold",
      assigned_to: user?.id,
      google_rating: p.rating,
      google_reviews: p.reviews,
      google_categories: p.categories,
      google_hours: p.hours,
      google_maps_url: p.maps_url,
      google_place_id: p.place_id,
      latitude: p.lat,
      longitude: p.lng,
    });

    if (!error) imported++;
    else skipped++;
  }

  revalidatePath("/leads");
  revalidatePath("/queue");
  revalidatePath("/prospect");

  return { imported, skipped };
}
