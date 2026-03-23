"use client";

import { useRouter } from "next/navigation";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export function PeriodFilter({ current }: { current: string }) {
  const router = useRouter();

  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => router.push(`/stats?period=${p.value}`)}
          className={`px-2 py-1 rounded text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.6px] border transition-colors cursor-pointer ${
            current === p.value
              ? "bg-green-dim border-green-border text-green"
              : "bg-transparent border-border text-text-muted hover:text-text-secondary"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
