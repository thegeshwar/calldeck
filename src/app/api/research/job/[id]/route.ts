import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

function verifyWorkerAuth(request: NextRequest): boolean {
  const workerKey = process.env.CALLDECK_WORKER_KEY;
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !workerKey) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === workerKey;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Accept either worker auth or browser auth
  const isWorker = verifyWorkerAuth(request);
  if (!isWorker) {
    const cookieClient = await createClient();
    const {
      data: { user },
    } = await cookieClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();

  const { data: job, error: jobError } = await supabase
    .from("research_jobs")
    .select(
      `
      *,
      lead:leads(
        *,
        contacts(*),
        social_profiles(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
