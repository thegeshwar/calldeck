"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

function shiftWeek(weekStart: string, days: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function WeekNav({ weekStart }: { weekStart: string }) {
  const router = useRouter();

  function go(week: string) {
    router.push(`/follow-ups?week=${week}`);
  }

  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);

  return (
    <div className="flex items-center justify-center gap-3 px-6 py-2 border-b border-border">
      <Button variant="ghost" onClick={() => go(shiftWeek(weekStart, -7))} className="px-2">
        <ChevronLeft size={12} />
      </Button>
      <button onClick={() => go(getMonday())} className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted hover:text-green cursor-pointer uppercase tracking-wider">
        Today
      </button>
      <span className="text-xs font-[family-name:var(--font-mono)] text-text-primary min-w-[180px] text-center">
        {new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        {" — "}
        {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </span>
      <Button variant="ghost" onClick={() => go(shiftWeek(weekStart, 7))} className="px-2">
        <ChevronRight size={12} />
      </Button>
    </div>
  );
}
