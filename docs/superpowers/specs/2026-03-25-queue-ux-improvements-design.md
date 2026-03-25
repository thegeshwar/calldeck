# CallDeck Queue UX Improvements — Design Spec

**Date:** 2026-03-25
**Status:** Approved

## Problem

The queue page has three UX gaps that slow down the daily calling workflow:
1. No way to keep a lead in today's queue after logging a call (auto-rules push it out)
2. No way to add a contact inline — must navigate away from queue
3. No way to clear a follow-up or correct call history mistakes

## Design Principles

- All changes on `/queue` page only
- Follow existing Obsidian Wine design system
- Lucide icons only
- Server actions + `router.refresh()` + `revalidatePath` pattern
- No new database tables or columns

---

## Feature 1: "Save & Re-queue" Button

### UI — QuickLog component
- New "Save & Re-queue" button next to "Save & Next"
- Secondary/outline style (border wine accent, text wine accent) vs primary filled
- Same row as Save & Next, flexbox with gap
- Same validation rules (outcome required)

### Backend — `logCall` in `calls.ts`
- Add optional `requeue: boolean` parameter
- Normal flow: log call → apply auto-rules
- When `requeue: true`: after auto-rules, override `next_followup = null`, preserve `lead_temperature` and `status`
- Lead falls to priority 5 (end of today's queue) via existing queue-logic

---

## Feature 2: Quick-Add Contact

### UI — LeadCard component, Decision Maker section
- `Plus` icon button next to "DECISION MAKER" heading
- Expands inline form: Name (required), Title, Phone, Email, "Set as primary" toggle (default off)
- Save + Cancel buttons (compact, consistent with QuickLog styling)
- Form collapses after save

### Backend — `contacts.ts`
- `createContact(leadId, { name, title, phone, email, isPrimary })`
- If `isPrimary`: flip existing primary to false, set new as true

---

## Feature 3a: Clear Follow-Up

### UI — LeadCard component
- `X` icon button next to follow-up date badge
- Only visible when `next_followup` is set
- No confirmation — fast-paced workflow

### Backend — `leads.ts`
- `updateLead(id, { next_followup: null, followup_reason: null })`
- Revalidates `/queue`, `/follow-ups`

---

## Feature 3b: Edit Call History

### UI — CallHistory component
- `Pencil` icon button on each call entry (top-right)
- Inline edit mode: Notes (textarea), Outcome (dropdown), Next Action (dropdown)
- Save + Cancel, one entry editable at a time
- Timestamp, duration, caller remain read-only

### Backend — `calls.ts`
- New `updateCall(callId, { notes, outcome, next_action })`
- Does NOT re-trigger auto-rules
- Revalidates `/queue`

---

## Out of Scope
- No call history delete
- No re-queue from `/leads` page
- No modal dialogs
- No new database tables or columns
