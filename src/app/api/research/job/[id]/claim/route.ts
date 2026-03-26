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
  const { worker_id } = body;

  // Check job exists and is pending
  const { data: job, error: jobError } = await supabase
    .from("research_jobs")
    .select("id, status, lead_id")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "pending") {
    return NextResponse.json(
      { error: `Job is not pending (current status: ${job.status})` },
      { status: 409 }
    );
  }

  // Claim the job
  const { error: updateError } = await supabase
    .from("research_jobs")
    .update({
      status: "claimed",
      claimed_at: new Date().toISOString(),
      worker_id: worker_id ?? null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to claim job" },
      { status: 500 }
    );
  }

  // Update lead research status to running
  await supabase
    .from("leads")
    .update({ research_status: "running" })
    .eq("id", job.lead_id);

  return NextResponse.json({ success: true });
}
