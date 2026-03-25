"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { logCall } from "@/lib/actions/calls";
import { getAutoFollowup, addDays } from "@/lib/queue-logic";
import {
  CallOutcome,
  NextActionType,
  OUTCOME_LABELS,
  ACTION_LABELS,
} from "@/lib/types";

const OUTCOMES: { value: CallOutcome; color: "red" | "amber" | "neutral" | "green" | "blue" }[] = [
  { value: "no_answer", color: "red" },
  { value: "voicemail", color: "amber" },
  { value: "gatekeeper", color: "neutral" },
  { value: "spoke_to_dm", color: "green" },
  { value: "callback_requested", color: "blue" },
  { value: "interested", color: "green" },
];

const ACTIONS: NextActionType[] = [
  "follow_up",
  "send_proposal",
  "schedule_meeting",
  "close_won",
  "close_lost",
  "none",
];

const FOLLOWUP_OPTIONS = [
  { label: "Tomorrow", value: "1" },
  { label: "In 2 days", value: "2" },
  { label: "In 1 week", value: "7" },
  { label: "In 2 weeks", value: "14" },
  { label: "In 1 month", value: "30" },
];

export function QuickLog({
  leadId,
  onLogged,
}: {
  leadId: string;
  onLogged: () => void;
}) {
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState<NextActionType>("follow_up");
  const [followupDays, setFollowupDays] = useState("2");
  const [customDate, setCustomDate] = useState("");
  const [markLost, setMarkLost] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [saving, setSaving] = useState(false);

  const auto = outcome ? getAutoFollowup(outcome) : null;
  const needsManualDate = auto?.requiresManualDate ?? false;
  const isNotInterested = outcome === "not_interested";

  async function handleSave() {
    if (!outcome) return;
    setSaving(true);

    let followupDate: string | undefined;
    if (needsManualDate && customDate) {
      followupDate = customDate;
    } else if (isNotInterested && markLost) {
      // Lost leads get no follow-up
      followupDate = undefined;
    } else {
      // Always use the user's dropdown selection (pre-set to auto-rule default)
      followupDate = addDays(new Date(), parseInt(followupDays));
    }

    await logCall({
      lead_id: leadId,
      outcome,
      notes: notes || undefined,
      next_action: nextAction,
      followup_date: followupDate,
      mark_lost: isNotInterested && markLost,
      lost_reason: markLost ? lostReason : undefined,
    });

    // Reset form
    setOutcome(null);
    setNotes("");
    setNextAction("follow_up");
    setFollowupDays("2");
    setCustomDate("");
    setMarkLost(false);
    setLostReason("");
    setSaving(false);
    onLogged();
  }

  return (
    <div className="border-t-2 border-border pt-3 space-y-3">
      <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
        Log Call
      </div>

      {/* Outcome pills */}
      <div className="flex flex-wrap gap-1.5">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            onClick={() => {
              setOutcome(o.value);
              setMarkLost(false);
              // Set follow-up dropdown to auto-rule default for this outcome
              const autoResult = getAutoFollowup(o.value);
              if (autoResult.days !== null) {
                setFollowupDays(String(autoResult.days));
              }
            }}
            className="cursor-pointer"
          >
            <Pill
              color={outcome === o.value ? o.color : "neutral"}
              attention={outcome === o.value}
            >
              {OUTCOME_LABELS[o.value]}
            </Pill>
          </button>
        ))}
        <button
          onClick={() => {
            setOutcome("not_interested");
            setMarkLost(false);
            setFollowupDays("30");
          }}
          className="cursor-pointer"
        >
          <Pill
            color={outcome === "not_interested" ? "red" : "neutral"}
            attention={outcome === "not_interested"}
          >
            Not Interested
          </Pill>
        </button>
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Call notes..."
        rows={2}
        className="w-full bg-bg-elevated border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright resize-none"
      />

      <div className="flex gap-3">
        {/* Next action */}
        <div className="flex-1">
          <label className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1">
            Next Action
          </label>
          <select
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value as NextActionType)}
            className="w-full bg-bg-elevated border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-border-bright"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>

        {/* Follow-up date — always shown when outcome selected (unless marking as lost) */}
        {outcome && !(isNotInterested && markLost) && (
          <div className="flex-1">
            <label className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1">
              Follow-up
            </label>
            {needsManualDate ? (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-bg-elevated border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-border-bright"
              />
            ) : (
              <select
                value={followupDays}
                onChange={(e) => setFollowupDays(e.target.value)}
                className="w-full bg-bg-elevated border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-border-bright"
              >
                {FOLLOWUP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Not interested → mark lost? */}
      {isNotInterested && (
        <div className="bg-red-dim border-2 border-red-border rounded p-2.5 space-y-2">
          <label className="flex items-center gap-2 text-xs text-red cursor-pointer">
            <input
              type="checkbox"
              checked={markLost}
              onChange={(e) => setMarkLost(e.target.checked)}
              className="accent-red"
            />
            Mark as Lost?
          </label>
          {markLost && (
            <input
              type="text"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Reason..."
              className="w-full bg-bg-surface border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none"
            />
          )}
        </div>
      )}

      {/* Save */}
      <Button
        variant="call"
        onClick={handleSave}
        disabled={!outcome || saving || (needsManualDate && !customDate)}
        className="w-full"
      >
        {saving ? "Saving..." : "Save & Next"}
      </Button>
    </div>
  );
}
