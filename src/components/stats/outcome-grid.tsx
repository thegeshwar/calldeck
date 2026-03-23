import { OUTCOME_LABELS, CallOutcome } from "@/lib/types";
import { Card } from "@/components/ui/card";

const OUTCOMES: CallOutcome[] = ["no_answer", "voicemail", "gatekeeper", "spoke_to_dm", "callback_requested", "interested"];
const OUTCOME_COLORS: Record<CallOutcome, string> = {
  no_answer: "text-red",
  voicemail: "text-amber",
  gatekeeper: "text-text-muted",
  spoke_to_dm: "text-green",
  callback_requested: "text-blue",
  not_interested: "text-red",
  interested: "text-green",
};

export function OutcomeGrid({
  data,
  total,
}: {
  data: Record<string, number>;
  total: number;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-2">
        Outcome Breakdown
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => {
          const count = data[o] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <Card key={o} className="text-center py-2">
              <div className={`text-lg font-[900] font-[family-name:var(--font-mono)] ${OUTCOME_COLORS[o]}`}>
                {count}
              </div>
              <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.6px] text-text-muted">
                {OUTCOME_LABELS[o]}
              </div>
              <div className="text-[9px] font-[family-name:var(--font-mono)] text-text-muted mt-0.5">
                {pct}%
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
