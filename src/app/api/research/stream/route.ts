import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function verifyWorkerAuth(request: NextRequest): boolean {
  const workerKey = process.env.CALLDECK_WORKER_KEY;
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !workerKey) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === workerKey;
}

export async function GET(request: NextRequest) {
  if (!verifyWorkerAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = await createClient();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send keepalive comment
      const sendKeepalive = () => {
        controller.enqueue(encoder.encode(`: keepalive\n\n`));
      };

      // Catchup: send any pending jobs
      const { data: pendingJobs } = await supabase
        .from("research_jobs")
        .select("*")
        .eq("status", "pending");

      if (pendingJobs && pendingJobs.length > 0) {
        for (const job of pendingJobs) {
          send({ type: "job", job });
        }
      }

      // Subscribe to new research_jobs inserts via Realtime
      const channel = supabase
        .channel("research_jobs_stream")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "research_jobs" },
          (payload) => {
            send({ type: "job", job: payload.new });
          }
        )
        .subscribe();

      // Keepalive every 30s
      const keepaliveInterval = setInterval(sendKeepalive, 30_000);

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        clearInterval(keepaliveInterval);
        supabase.removeChannel(channel);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
