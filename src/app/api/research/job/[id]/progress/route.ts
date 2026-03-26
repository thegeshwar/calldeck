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

  const body = await request.json();
  const { phase, phases_completed } = body;

  const { error: updateError } = await supabase
    .from("research_jobs")
    .update({
      status: "running",
      phase: phase ?? null,
      phases_completed: phases_completed ?? null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
