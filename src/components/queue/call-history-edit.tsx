"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateCall } from "@/lib/actions/calls";
import {
  CallOutcome,
  NextActionType,
  OUTCOME_LABELS,
  ACTION_LABELS,
} from "@/lib/types";

const OUTCOMES: CallOutcome[] = [
  "no_answer", "voicemail", "gatekeeper",
  "spoke_to_dm", "callback_requested", "interested", "not_interested",
];

const ACTIONS: NextActionType[] = [
  "follow_up", "send_proposal", "schedule_meeting",
  "close_won", "close_lost", "none",
];

export function CallHistoryEdit({
  callId,
  initialNotes,
  initialOutcome,
  initialNextAction,
  onDone,
}: {
  callId: string;
  initialNotes: string;
  initialOutcome: CallOutcome;
  initialNextAction: NextActionType;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [outcome, setOutcome] = useState<CallOutcome>(initialOutcome);
  const [nextAction, setNextAction] = useState<NextActionType>(initialNextAction);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateCall(callId, { notes, outcome, next_action: nextAction });
    setSaving(false);
    onDone();
  }

  const selectClass =
    "w-full bg-bg-elevated border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-border-bright";

  return (
    <div className="space-y-2">
      <select value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)} className={selectClass}>
        {OUTCOMES.map((o) => (
          <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
        ))}
      </select>
      <select value={nextAction} onChange={(e) => setNextAction(e.target.value as NextActionType)} className={selectClass}>
        {ACTIONS.map((a) => (
          <option key={a} value={a}>{ACTION_LABELS[a]}</option>
        ))}
      </select>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full bg-bg-elevated border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright resize-none"
      />
      <div className="flex gap-2">
        <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
