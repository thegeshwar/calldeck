import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichAllLeads } from "@/lib/actions/enrich";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await enrichAllLeads();
  return NextResponse.json(result);
}
