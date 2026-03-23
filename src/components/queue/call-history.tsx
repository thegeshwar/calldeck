import { Call, Profile, OUTCOME_LABELS } from "@/lib/types";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";

const OUTCOME_COLORS: Record<string, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  no_answer: "red",
  voicemail: "amber",
  gatekeeper: "neutral",
  spoke_to_dm: "green",
  callback_requested: "blue",
  not_interested: "red",
  interested: "green",
};

export function CallHistory({
  calls,
  profiles,
}: {
  calls: Call[];
  profiles: Profile[];
}) {
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  if (calls.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
          No call history yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      {calls.map((call) => {
        const caller = profileMap[call.called_by || ""];
        const date = new Date(call.called_at);

        return (
          <Card key={call.id} className="p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Pill color={OUTCOME_COLORS[call.outcome] || "neutral"}>
                  {OUTCOME_LABELS[call.outcome]}
                </Pill>
                {call.duration_seconds > 0 && (
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                    {Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, "0")}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            {caller && (
              <div className="text-[10px] text-text-muted mb-1">
                {caller.display_name}
              </div>
            )}
            {call.notes && (
              <p className="text-xs text-text-secondary leading-relaxed">
                {call.notes}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
