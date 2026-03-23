import { Profile } from "@/lib/types";
import { Card } from "@/components/ui/card";

interface UserStats {
  calls: number;
  connects: number;
  meetings: number;
}

export function Leaderboard({
  byUser,
  profiles,
}: {
  byUser: Record<string, UserStats>;
  profiles: Profile[];
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-2">
        Leaderboard
      </div>
      <div className="grid grid-cols-2 gap-3">
        {profiles.map((p) => {
          const stats = byUser[p.id] || { calls: 0, connects: 0, meetings: 0 };
          const rate = stats.calls > 0 ? Math.round((stats.connects / stats.calls) * 100) : 0;

          return (
            <Card key={p.id} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0"
                style={{ backgroundColor: p.avatar_color }}
              >
                {p.display_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">{p.display_name}</div>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                    {stats.calls} calls
                  </span>
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-cyan">
                    {rate}% connect
                  </span>
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-amber">
                    {stats.meetings} meetings
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
