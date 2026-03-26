"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { startResearch } from "@/lib/actions/leads";

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

  const isActive = status === "pending" || status === "running";
  const hasFailed = status === "failed";
  const hasResearched = status === "complete";

  const buttonLabel = hasFailed
    ? "Retry Research"
    : hasResearched
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
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-[3px]">
            {Array.from({ length: totalPhases }).map((_, i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-full transition-colors ${
                  i < phasesCompleted
                    ? "bg-purple"
                    : "bg-bg-elevated border border-border-bright"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-purple">
            Researching...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 rounded font-[family-name:var(--font-mono)] text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 bg-bg-elevated border-2 border-purple/25 text-purple hover:border-purple/60 hover:brightness-110"
      >
        <Radar
          size={14}
          className={loading ? "animate-spin" : ""}
        />
        {loading ? "Starting..." : buttonLabel}
      </button>
      {error && (
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-red">
          {error}
        </span>
      )}
    </div>
  );
}
