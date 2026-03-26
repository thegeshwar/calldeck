import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();

  const body = await request.json();
  const { error: errorMessage } = body;

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

  // Mark job failed
  const { error: updateError } = await supabase
    .from("research_jobs")
    .update({
      status: "failed",
      error: errorMessage ?? null,
      completed_at: now,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to mark job as failed" },
      { status: 500 }
    );
  }

  // Update lead research status
  await supabase
    .from("leads")
    .update({ research_status: "failed" })
    .eq("id", job.lead_id);

  return NextResponse.json({ success: true });
}
