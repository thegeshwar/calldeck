"use client";

import Link from "next/link";
import { todayLocal } from "@/lib/queue-logic";

interface FollowUpEntry {
  id: string;
  company_name: string;
  temperature: string;
  contacts: { name: string; is_primary: boolean }[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TEMP_BORDER = { hot: "border-l-red", warm: "border-l-amber", cold: "border-l-blue" };

export function WeekGrid({
  weekStart,
  byDay,
}: {
  weekStart: string;
  byDay: Record<string, FollowUpEntry[]>;
}) {
  const startDate = new Date(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
  const today = todayLocal();

  return (
    <div className="grid grid-cols-7 gap-2 px-6 py-3 flex-1 overflow-y-auto">
      {days.map((day, i) => {
        const entries = byDay[day] || [];
        const isToday = day === today;
        const isWeekend = i >= 5;

        return (
          <div
            key={day}
            className={`rounded-lg border-2 p-2 min-h-[140px] ${
              isToday
                ? "border-green-border bg-green-dim/30"
                : isWeekend
                ? "border-border/50 bg-bg-root/50"
                : "border-border bg-bg-elevated"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-[family-name:var(--font-mono)] uppercase ${isToday ? "text-green font-bold" : "text-text-muted"}`}>
                {DAY_NAMES[i]}
              </span>
              <span className={`text-[10px] font-[family-name:var(--font-mono)] ${isToday ? "text-green" : "text-text-muted"}`}>
                {day.split("-").slice(1).join("/")}
              </span>
            </div>

            <div className="space-y-1">
              {entries.slice(0, 4).map((entry) => {
                const borderClass = TEMP_BORDER[entry.temperature as keyof typeof TEMP_BORDER] || "border-l-border";
                const primary = entry.contacts?.find((c) => c.is_primary) || entry.contacts?.[0];

                return (
                  <Link
                    key={entry.id}
                    href={`/leads/${entry.id}`}
                    className={`block border-l-2 ${borderClass} bg-bg-surface rounded-r px-2 py-1 hover:bg-bg-hover transition-colors`}
                  >
                    <div className="text-[10px] text-text-primary font-medium truncate">
                      {entry.company_name}
                    </div>
                    {primary && (
                      <div className="text-[9px] text-text-muted truncate">{primary.name}</div>
                    )}
                  </Link>
                );
              })}
              {entries.length > 4 && (
                <div className="text-[9px] text-text-muted font-[family-name:var(--font-mono)] pl-2">
                  +{entries.length - 4} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
