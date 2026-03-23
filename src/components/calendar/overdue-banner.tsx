import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function OverdueBanner({ count, oldestDate }: { count: number; oldestDate?: string }) {
  if (count === 0) return null;

  return (
    <div className="mx-6 mt-3 border-2 border-red-border bg-red-dim rounded-lg px-4 py-2.5 flex items-center justify-between attn">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-red" />
        <span className="text-xs font-[family-name:var(--font-mono)] text-red font-bold">
          {count} OVERDUE
        </span>
        {oldestDate && (
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-red/70">
            oldest: {oldestDate}
          </span>
        )}
      </div>
      <Link href="/queue" className="text-[10px] font-[family-name:var(--font-mono)] text-red hover:underline uppercase tracking-wider">
        View All
      </Link>
    </div>
  );
}
