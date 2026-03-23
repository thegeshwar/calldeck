import { getFollowUpsForWeek, getOverdueCount, getOverdueLeads } from "@/lib/queries/follow-ups";
import { Topbar } from "@/components/topbar";
import { StatBadge } from "@/components/ui/stat-badge";
import { OverdueBanner } from "@/components/calendar/overdue-banner";
import { WeekGrid } from "@/components/calendar/week-grid";
import { WeekNav } from "./week-nav";
import { Suspense } from "react";

function getMonday(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const weekStart = getMonday(params.week);
  const byDay = await getFollowUpsForWeek(weekStart);
  const overdueCount = await getOverdueCount();
  const overdueLeads = overdueCount > 0 ? await getOverdueLeads() : [];
  const oldestOverdue = overdueLeads[0]?.next_followup || undefined;

  // Count entries this week
  const thisWeekCount = Object.values(byDay).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <>
      <Topbar title="Follow-ups" subtitle="Weekly calendar view">
        <StatBadge value={overdueCount} label="Overdue" color="red" attention={overdueCount > 0} />
        <StatBadge value={thisWeekCount} label="This Week" color="amber" />
      </Topbar>

      <OverdueBanner count={overdueCount} oldestDate={oldestOverdue} />

      <Suspense>
        <WeekNav weekStart={weekStart} />
      </Suspense>

      <WeekGrid weekStart={weekStart} byDay={byDay} />
    </>
  );
}
