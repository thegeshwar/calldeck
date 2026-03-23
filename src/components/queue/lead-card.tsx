"use client";

import { Phone, Globe, MapPin, Users, ExternalLink, User, Clock } from "lucide-react";
import { LeadWithRelations, OUTCOME_LABELS } from "@/lib/types";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QualityDots } from "@/components/ui/quality-dots";
import { snoozeLead } from "@/lib/actions/leads";
import Link from "next/link";

const TEMP_COLORS = { hot: "red" as const, warm: "amber" as const, cold: "blue" as const };
const STATUS_COLORS: Record<string, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  new: "blue",
  contacted: "amber",
  interested: "green",
  meeting_scheduled: "green",
  proposal_sent: "purple",
};

export function LeadCard({
  lead,
  onCallNow,
  onSkip,
  onSnooze,
}: {
  lead: LeadWithRelations;
  onCallNow: () => void;
  onSkip: () => void;
  onSnooze: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = lead.next_followup && lead.next_followup < today;
  const isDueToday = lead.next_followup === today;
  const primaryContact = lead.contacts.find((c) => c.is_primary) || lead.contacts[0];
  const lastCall = lead.calls[0];

  // Build "Why You're Calling" context
  let callContext = "";
  if (lead.followup_reason) callContext = lead.followup_reason;
  else if (lastCall?.notes) callContext = lastCall.notes;
  else if (lead.status === "new") callContext = "First contact — introduce QMS Agents services";

  async function handleSnooze() {
    await snoozeLead(lead.id);
    onSnooze();
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Urgency + Company header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isOverdue && (
              <span className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] text-red uppercase tracking-wider">
                <span className="pdot" /> Overdue
              </span>
            )}
            {isDueToday && (
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-amber uppercase tracking-wider">
                Due Today
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold text-text-primary">{lead.company_name}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
            {lead.industry && <span>{lead.industry}</span>}
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {lead.city}{lead.state ? `, ${lead.state}` : ""}
              </span>
            )}
            {lead.employee_count && (
              <span className="flex items-center gap-1">
                <Users size={12} /> {lead.employee_count}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <Pill color={TEMP_COLORS[lead.temperature]} attention={lead.temperature === "hot"}>
            {lead.temperature}
          </Pill>
          <Pill color={STATUS_COLORS[lead.status] || "neutral"}>
            {lead.status.replace("_", " ")}
          </Pill>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Decision Maker */}
        <Card>
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1.5">
            Decision Maker
          </div>
          {primaryContact ? (
            <div>
              <div className="flex items-center gap-1.5 text-sm text-text-primary">
                <User size={12} /> {primaryContact.name || "Unknown"}
              </div>
              {primaryContact.title && (
                <div className="text-xs text-text-secondary mt-0.5">{primaryContact.title}</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-text-muted">No contact added</div>
          )}
        </Card>

        {/* Phone */}
        <Card>
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1.5">
            Phone
          </div>
          <div className="flex items-center gap-1.5">
            <Phone size={12} className="text-green" />
            <span className="text-base font-[family-name:var(--font-mono)] font-bold text-green">
              {lead.phone || "—"}
            </span>
          </div>
          {primaryContact?.direct_phone && primaryContact.direct_phone !== lead.phone && (
            <div className="text-[10px] text-text-muted mt-1 font-[family-name:var(--font-mono)]">
              Direct: {primaryContact.direct_phone}
            </div>
          )}
        </Card>

        {/* Website */}
        <Card>
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1.5">
            Website
          </div>
          {lead.website ? (
            <div className="flex items-center gap-2">
              <Globe size={12} className="text-cyan" />
              <a
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan hover:underline truncate"
              >
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
              {lead.website_quality && <QualityDots rating={lead.website_quality} />}
            </div>
          ) : (
            <div className="text-xs text-text-muted">No website</div>
          )}
        </Card>

        {/* Services + Social */}
        <Card>
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1.5">
            Interested In
          </div>
          {lead.interested_services && lead.interested_services.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {lead.interested_services.map((s) => (
                <span key={s} className="text-[10px] bg-purple-dim border border-purple-border text-purple rounded px-1.5 py-0.5 font-[family-name:var(--font-mono)]">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-muted">Not yet determined</div>
          )}
          {lead.social_profiles.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {lead.social_profiles.map((sp) => (
                <a
                  key={sp.id}
                  href={sp.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-cyan hover:underline font-[family-name:var(--font-mono)]"
                >
                  {sp.platform}
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Why You're Calling */}
      {callContext && (
        <div className="border-2 border-green-border bg-green-dim rounded-lg p-3">
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-green mb-1">
            Why You&apos;re Calling
          </div>
          <p className="text-xs text-text-primary leading-relaxed">{callContext}</p>
          {isOverdue && lead.next_followup && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red font-[family-name:var(--font-mono)]">
              <Clock size={10} /> Follow-up was {lead.next_followup}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="call" onClick={onCallNow} className="flex-1">
          Call Now
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <Button variant="ghost" onClick={handleSnooze}>
          Snooze
        </Button>
        <Link href={`/leads/${lead.id}`}>
          <Button variant="ghost">
            <ExternalLink size={12} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
