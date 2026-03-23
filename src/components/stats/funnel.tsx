import { STATUS_LABELS, LeadStatus } from "@/lib/types";

const FUNNEL_ORDER: LeadStatus[] = ["new", "contacted", "interested", "meeting_scheduled", "proposal_sent", "won"];
const FUNNEL_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue",
  contacted: "bg-amber",
  interested: "bg-green",
  meeting_scheduled: "bg-green",
  proposal_sent: "bg-purple",
  won: "bg-green",
  lost: "bg-red",
};

export function Funnel({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-2">
        Conversion Funnel
      </div>
      {FUNNEL_ORDER.map((status) => {
        const count = data[status] || 0;
        const pct = (count / max) * 100;

        return (
          <div key={status} className="flex items-center gap-2">
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted w-20 text-right">
              {STATUS_LABELS[status]}
            </span>
            <div className="flex-1 h-5 bg-bg-elevated rounded overflow-hidden">
              <div
                className={`h-full ${FUNNEL_COLORS[status]} rounded transition-all`}
                style={{ width: `${pct}%`, minWidth: count > 0 ? 4 : 0 }}
              />
            </div>
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-primary w-8">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
