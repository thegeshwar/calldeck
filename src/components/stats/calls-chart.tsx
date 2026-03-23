import { Profile } from "@/lib/types";

export function CallsChart({
  byDay,
  profiles,
}: {
  byDay: Record<string, Record<string, number>>;
  profiles: Profile[];
}) {
  const days = Object.keys(byDay).sort();
  if (days.length === 0) {
    return (
      <div className="text-xs text-text-muted font-[family-name:var(--font-mono)] py-4 text-center">
        No call data for this period
      </div>
    );
  }

  const maxPerDay = Math.max(
    ...days.map((d) => Object.values(byDay[d]).reduce((s, v) => s + v, 0)),
    1
  );

  const colors = profiles.reduce(
    (acc, p) => ({ ...acc, [p.id]: p.avatar_color }),
    {} as Record<string, string>
  );

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-2">
        Calls by Day
      </div>
      <div className="flex items-end gap-2 h-[120px]">
        {days.map((day) => {
          const users = byDay[day];
          const total = Object.values(users).reduce((s, v) => s + v, 0);
          const height = (total / maxPerDay) * 100;

          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col-reverse rounded overflow-hidden" style={{ height: `${height}%`, minHeight: total > 0 ? 4 : 0 }}>
                {Object.entries(users).map(([uid, count]) => {
                  const pct = (count / total) * 100;
                  return (
                    <div
                      key={uid}
                      style={{
                        height: `${pct}%`,
                        backgroundColor: colors[uid] || "#22c55e",
                        minHeight: 2,
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-[9px] font-[family-name:var(--font-mono)] text-text-muted">
                {new Date(day).toLocaleDateString("en-US", { weekday: "short" })}
              </span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-3 justify-center">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: p.avatar_color }} />
            <span className="text-[10px] text-text-muted">{p.display_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
