"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadWithRelations } from "@/lib/types";

const TEMP_DOT: Record<string, string> = {
  hot: "bg-red",
  warm: "bg-amber",
  cold: "bg-blue",
};

export function QueueNav({
  currentIndex,
  totalCount,
  leads,
  onPrev,
  onNext,
  onJumpTo,
}: {
  currentIndex: number;
  totalCount: number;
  leads: LeadWithRelations[];
  onPrev: () => void;
  onNext: () => void;
  onJumpTo: (index: number) => void;
}) {
  const [showList, setShowList] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!showList) return;
    function handleClick(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showList]);

  return (
    <div className="flex items-center gap-3 relative">
      <Button
        variant="ghost"
        onClick={onPrev}
        disabled={currentIndex <= 0}
        className="px-2"
      >
        <ChevronLeft size={14} />
      </Button>

      {/* Clickable lead counter — opens queue list */}
      <button
        onClick={() => setShowList(!showList)}
        className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-mono)] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
      >
        <List size={12} />
        Lead {totalCount > 0 ? currentIndex + 1 : 0} of {totalCount}
      </button>

      <Button
        variant="ghost"
        onClick={onNext}
        disabled={currentIndex >= totalCount - 1}
        className="px-2"
      >
        <ChevronRight size={14} />
      </Button>

      {/* Queue popup list */}
      {showList && (
        <div
          ref={listRef}
          className="absolute bottom-full left-0 mb-2 w-[360px] max-h-[320px] overflow-y-auto bg-bg-elevated border-2 border-border rounded-lg shadow-lg z-20"
        >
          <div className="sticky top-0 bg-bg-elevated border-b border-border px-3 py-2">
            <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
              Queue — {totalCount} leads
            </span>
          </div>
          {leads.map((lead, i) => {
            const primary = lead.contacts.find((c) => c.is_primary) || lead.contacts[0];
            const lastCall = lead.calls[0];
            const context = lead.followup_reason || lastCall?.notes || (lead.status === "new" ? "First contact" : "");
            const isCurrent = i === currentIndex;

            return (
              <button
                key={lead.id}
                onClick={() => {
                  onJumpTo(i);
                  setShowList(false);
                }}
                className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-bg-surface transition-colors cursor-pointer ${
                  isCurrent ? "bg-bg-surface border-l-2 border-l-green" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TEMP_DOT[lead.temperature] || "bg-text-muted"}`} />
                  <span className="text-xs font-medium text-text-primary truncate">
                    {lead.company_name}
                  </span>
                  {lead.next_followup && (
                    <span className="text-[9px] font-[family-name:var(--font-mono)] text-text-muted ml-auto flex-shrink-0">
                      {lead.next_followup}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-3.5">
                  {primary && (
                    <span className="text-[10px] text-text-secondary truncate">
                      {primary.name}{primary.title ? ` — ${primary.title}` : ""}
                    </span>
                  )}
                </div>
                {context && (
                  <p className="text-[10px] text-text-muted mt-0.5 ml-3.5 truncate">
                    {context}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
