"use client";

import { useState } from "react";
import { Clock, CalendarDays } from "lucide-react";
import { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { updateLead } from "@/lib/actions/leads";
import { addDays, todayLocal } from "@/lib/queue-logic";
import { useRouter } from "next/navigation";

export function FollowupBox({ lead }: { lead: Lead }) {
  const router = useRouter();
  const today = todayLocal();
  const isOverdue = lead.next_followup && lead.next_followup < today;
  const [scheduling, setScheduling] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedReason, setSchedReason] = useState("");

  async function reschedule(days: number) {
    await updateLead(lead.id, { next_followup: addDays(new Date(), days) } as Parameters<typeof updateLead>[1]);
    router.refresh();
  }

  async function scheduleNew() {
    if (!schedDate) return;
    await updateLead(lead.id, {
      next_followup: schedDate,
      ...(schedReason ? { followup_reason: schedReason } : {}),
    } as Parameters<typeof updateLead>[1]);
    setScheduling(false);
    setSchedDate("");
    setSchedReason("");
    router.refresh();
  }

  if (!lead.next_followup && !lead.followup_reason) {
    return (
      <div className="border-2 border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className="text-text-muted" />
            <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
              Follow-up
            </span>
          </div>
          {!scheduling && (
            <button
              onClick={() => setScheduling(true)}
              className="text-[10px] font-[family-name:var(--font-mono)] text-green hover:underline cursor-pointer"
            >
              + Schedule
            </button>
          )}
        </div>
        {scheduling ? (
          <div className="space-y-2">
            <input
              type="date"
              value={schedDate}
              onChange={(e) => setSchedDate(e.target.value)}
              className="w-full bg-bg-surface border border-border-bright rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
              autoFocus
            />
            <input
              type="text"
              value={schedReason}
              onChange={(e) => setSchedReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full bg-bg-surface border border-border-bright rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
              onKeyDown={(e) => { if (e.key === "Enter") scheduleNew(); if (e.key === "Escape") setScheduling(false); }}
            />
            <div className="flex gap-1.5">
              <Button variant="primary" onClick={scheduleNew} disabled={!schedDate} className="text-[10px] px-2 py-1">
                Schedule
              </Button>
              <Button variant="ghost" onClick={() => setScheduling(false)} className="text-[10px] px-2 py-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted italic">No follow-up scheduled</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border-2 rounded-lg p-3 ${
        isOverdue
          ? "border-red-border bg-red-dim"
          : "border-green-border bg-green-dim"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className={isOverdue ? "text-red" : "text-green"} />
          <span className={`text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] ${isOverdue ? "text-red" : "text-green"}`}>
            {isOverdue ? "Overdue Follow-up" : "Next Follow-up"}
          </span>
        </div>
        {lead.next_followup && (
          <span className={`text-xs font-[family-name:var(--font-mono)] ${isOverdue ? "text-red" : "text-text-primary"}`}>
            {lead.next_followup}
          </span>
        )}
      </div>

      {lead.followup_reason && (
        <p className="text-xs text-text-primary leading-relaxed mb-2">
          {lead.followup_reason}
        </p>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => reschedule(1)}
          className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted hover:text-text-primary cursor-pointer px-1.5 py-0.5 rounded bg-bg-elevated border border-border">
          Tomorrow
        </button>
        <button onClick={() => reschedule(3)}
          className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted hover:text-text-primary cursor-pointer px-1.5 py-0.5 rounded bg-bg-elevated border border-border">
          +3 days
        </button>
        <button onClick={() => reschedule(7)}
          className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted hover:text-text-primary cursor-pointer px-1.5 py-0.5 rounded bg-bg-elevated border border-border">
          +1 week
        </button>
      </div>
    </div>
  );
}
