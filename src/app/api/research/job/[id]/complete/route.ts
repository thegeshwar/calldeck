import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function verifyWorkerAuth(request: NextRequest): boolean {
  const workerKey = process.env.CALLDECK_WORKER_KEY;
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !workerKey) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === workerKey;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!verifyWorkerAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get job to find lead_id
  const { data: job, error: jobError } = await supabase
    .from("research_jobs")
    .select("id, lead_id")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Mark job done
  const { error: updateError } = await supabase
    .from("research_jobs")
    .update({
      status: "done",
      completed_at: now,
      phases_completed: 6,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to complete job" },
      { status: 500 }
    );
  }

  // Update lead research status
  await supabase
    .from("leads")
    .update({
      research_status: "done",
      researched_at: now,
    })
    .eq("id", job.lead_id);

  return NextResponse.json({ success: true });
}
