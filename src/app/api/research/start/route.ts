import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { leadId } = body;

  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  // Check lead exists
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, research_status")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Check if already being researched
  if (lead.research_status === "pending" || lead.research_status === "running") {
    return NextResponse.json(
      { error: "Research already in progress for this lead" },
      { status: 409 }
    );
  }

  // Create research job
  const { data: job, error: jobError } = await supabase
    .from("research_jobs")
    .insert({
      lead_id: leadId,
      status: "pending",
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: "Failed to create research job" },
      { status: 500 }
    );
  }

  // Update lead research status
  await supabase
    .from("leads")
    .update({ research_status: "pending" })
    .eq("id", leadId);

  return NextResponse.json({ jobId: job.id });
}
