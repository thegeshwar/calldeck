import { StatBadge } from "@/components/ui/stat-badge";

export function StatCards({
  totalCalls,
  connectRate,
  meetings,
  pipelineValue,
}: {
  totalCalls: number;
  connectRate: number;
  meetings: number;
  pipelineValue: number;
}) {
  return (
    <div className="flex gap-3">
      <StatBadge value={totalCalls} label="Calls Made" color="green" />
      <StatBadge value={Math.round(connectRate * 100)} label="Connect %" color="blue" />
      <StatBadge value={meetings} label="Meetings Set" color="amber" />
      <StatBadge value={pipelineValue} label="Pipeline $" color="purple" />
    </div>
  );
}
