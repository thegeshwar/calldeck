import { Call, Profile, OUTCOME_LABELS, ACTION_LABELS } from "@/lib/types";
import { Pill } from "@/components/ui/pill";

const OUTCOME_COLORS: Record<string, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  no_answer: "red",
  voicemail: "amber",
  gatekeeper: "neutral",
  spoke_to_dm: "green",
  callback_requested: "blue",
  not_interested: "red",
  interested: "green",
};

const DOT_COLORS: Record<string, string> = {
  no_answer: "bg-red",
  voicemail: "bg-amber",
  gatekeeper: "bg-text-muted",
  spoke_to_dm: "bg-green",
  callback_requested: "bg-blue",
  not_interested: "bg-red",
  interested: "bg-green",
};

export function ActivityTimeline({
  calls,
  profiles,
  createdAt,
}: {
  calls: Call[];
  profiles: Profile[];
  createdAt: string;
}) {
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  return (
    <div className="space-y-0">
      {calls.map((call, i) => {
        const caller = profileMap[call.called_by || ""];
        const date = new Date(call.called_at);

        return (
          <div key={call.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${DOT_COLORS[call.outcome] || "bg-text-muted"}`} />
              {(i < calls.length - 1 || createdAt) && (
                <div className="w-px flex-1 bg-border min-h-[20px]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Pill color={OUTCOME_COLORS[call.outcome] || "neutral"}>
                  {OUTCOME_LABELS[call.outcome]}
                </Pill>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" "}
                  {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
                {call.duration_seconds > 0 && (
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                    {Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, "0")}
                  </span>
                )}
              </div>
              {caller && (
                <div className="text-[10px] text-text-muted mb-0.5">{caller.display_name}</div>
              )}
              {call.notes && (
                <p className="text-xs text-text-secondary leading-relaxed">{call.notes}</p>
              )}
              {call.next_action !== "none" && (
                <div className="text-[10px] text-text-muted mt-0.5 font-[family-name:var(--font-mono)]">
                  Next: {ACTION_LABELS[call.next_action]}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Lead creation event */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-border bg-bg-elevated shrink-0 mt-1" />
        </div>
        <div className="pb-2">
          <div className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted border border-dashed border-border rounded px-2 py-1">
            Lead created {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}
