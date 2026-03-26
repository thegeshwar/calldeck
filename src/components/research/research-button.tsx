"use client";

import { useState, useEffect } from "react";
import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startResearch } from "@/lib/actions/leads";
import { createClient } from "@/lib/supabase/client";

interface ResearchButtonProps {
  leadId: string;
  status: string | null;
  phasesCompleted?: number;
  totalPhases?: number;
  className?: string;
}

export function ResearchButton({
  leadId,
  status,
  phasesCompleted = 0,
  totalPhases = 6,
  className = "",
}: ResearchButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    if (currentStatus !== "pending" && currentStatus !== "running") return;

    const supabase = createClient();
    const channel = supabase
      .channel(`research-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `id=eq.${leadId}`,
        },
        (payload) => {
          const newStatus = payload.new.research_status;
          if (newStatus) setCurrentStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, currentStatus]);

  const isActive = currentStatus === "pending" || currentStatus === "running";
  const isDone = currentStatus === "done";
  const hasFailed = currentStatus === "failed";

  const buttonLabel = hasFailed
    ? "Retry"
    : isDone
      ? "Re-research"
      : "Research";

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      await startResearch(leadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start research");
    } finally {
      setLoading(false);
    }
  }

  if (isActive) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex gap-0.5">
          {Array.from({ length: totalPhases }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                i < phasesCompleted ? "bg-purple" : "bg-border-bright animate-pulse"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-purple uppercase tracking-wider animate-pulse">
          Researching...
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Button
        variant={hasFailed ? "ghost" : "research"}
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 ${
          hasFailed
            ? "border-red text-red hover:border-red hover:bg-red-dim"
            : "border-purple text-purple hover:border-purple hover:bg-purple-dim"
        }`}
      >
        <Radar size={12} className={loading ? "animate-spin" : ""} />
        {loading ? "Starting..." : buttonLabel}
      </Button>
      {error && (
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-red">
          {error}
        </span>
      )}
    </div>
  );
}
