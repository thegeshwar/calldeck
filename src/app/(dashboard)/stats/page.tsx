import { getCallStats, getCallsByDay, getConversionFunnel, getOutcomeBreakdown, getPipelineValue } from "@/lib/queries/stats";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";
import { Topbar } from "@/components/topbar";
import { StatCards } from "@/components/stats/stat-cards";
import { CallsChart } from "@/components/stats/calls-chart";
import { Funnel } from "@/components/stats/funnel";
import { Leaderboard } from "@/components/stats/leaderboard";
import { OutcomeGrid } from "@/components/stats/outcome-grid";
import { Card } from "@/components/ui/card";
import { PeriodFilter } from "./period-filter";
import { Suspense } from "react";

type Period = "today" | "week" | "month" | "all";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const period = (params.period as Period) || "week";

  const [stats, byDay, funnel, outcomes, pipeline] = await Promise.all([
    getCallStats(period),
    getCallsByDay(period),
    getConversionFunnel(),
    getOutcomeBreakdown(period),
    getPipelineValue(),
  ]);

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("cd_profiles").select("*");

  return (
    <>
      <Topbar title="Stats" subtitle="Performance dashboard">
        <Suspense>
          <PeriodFilter current={period} />
        </Suspense>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <StatCards
          totalCalls={stats.totalCalls}
          connectRate={stats.connectRate}
          meetings={stats.meetings}
          pipelineValue={pipeline}
        />

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <CallsChart byDay={byDay} profiles={(profiles as Profile[]) || []} />
          </Card>
          <Card className="p-4">
            <Funnel data={funnel} />
          </Card>
        </div>

        <Leaderboard byUser={stats.byUser} profiles={(profiles as Profile[]) || []} />

        <OutcomeGrid data={outcomes} total={stats.totalCalls} />
      </div>
    </>
  );
}
