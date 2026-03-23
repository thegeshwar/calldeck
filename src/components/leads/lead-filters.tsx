"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { LeadStatus, LeadTemperature, STATUS_LABELS } from "@/lib/types";

const STATUSES: (LeadStatus | "all")[] = [
  "all",
  "new",
  "contacted",
  "interested",
  "meeting_scheduled",
  "proposal_sent",
  "won",
  "lost",
];

export function LeadFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const currentStatus = searchParams.get("status") || "all";
  const currentTemp = searchParams.get("temperature") || "";

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("search", search);
      else params.delete("search");
      params.delete("page");
      router.push(`/leads?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="w-full bg-bg-elevated border-2 border-border rounded pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright"
        />
      </div>

      {/* Status chips */}
      <div className="flex gap-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter("status", s)}
            className={`px-2 py-1 rounded text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.6px] border transition-colors cursor-pointer ${
              currentStatus === s
                ? "bg-green-dim border-green-border text-green"
                : "bg-transparent border-border text-text-muted hover:text-text-secondary"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Hot filter */}
      <button
        onClick={() => setFilter("temperature", currentTemp === "hot" ? "" : "hot")}
        className={`px-2 py-1 rounded text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.6px] border transition-colors cursor-pointer ${
          currentTemp === "hot"
            ? "bg-amber-dim border-amber-border text-amber attn"
            : "bg-transparent border-border text-text-muted hover:text-text-secondary"
        }`}
      >
        Hot
      </button>
    </div>
  );
}
