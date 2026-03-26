"use client";

import { Cpu, User, Zap, AlertTriangle } from "lucide-react";
import { Lead, Contact } from "@/lib/types";
import { ResearchButton } from "./research-button";

interface IntelStripProps {
  lead: Lead;
  primaryContact?: Contact | null;
}

export function IntelStrip({ lead, primaryContact }: IntelStripProps) {
  const researchDone = lead.research_status === "done";
  const researchRunning =
    lead.research_status === "pending" || lead.research_status === "running";

  // No research or still running — delegate entirely to ResearchButton
  if (!researchDone) {
    return (
      <ResearchButton
        leadId={lead.id}
        status={lead.research_status}
      />
    );
  }

  // Research done — show intel card
  const briefFirstLine = lead.research_brief
    ? lead.research_brief.split("\n")[0].trim()
    : null;

  const speedColor =
    lead.page_speed_score === null
      ? "text-text-muted"
      : lead.page_speed_score >= 80
      ? "text-green"
      : lead.page_speed_score >= 50
      ? "text-amber"
      : "text-red";

  return (
    <div className="border-2 border-purple-border bg-purple-dim rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Cpu size={10} className="text-purple" />
          <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-purple">
            Intel
          </span>
        </div>
        <ResearchButton
          leadId={lead.id}
          status={lead.research_status}
          className="!p-0"
        />
      </div>

      {/* Tech / Speed / Mobile row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {lead.tech_stack && lead.tech_stack.length > 0 && (
          <>
            {lead.tech_stack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="text-[10px] font-[family-name:var(--font-mono)] bg-bg-elevated border border-border-bright text-text-secondary rounded px-1.5 py-0.5"
              >
                {tech}
              </span>
            ))}
          </>
        )}
        {lead.page_speed_score !== null && (
          <span
            className={`flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] bg-bg-elevated border border-border-bright rounded px-1.5 py-0.5 ${speedColor}`}
          >
            <Zap size={9} />
            {lead.page_speed_score}
          </span>
        )}
        {lead.is_mobile_responsive !== null && (
          <span
            className={`text-[10px] font-[family-name:var(--font-mono)] bg-bg-elevated border border-border-bright rounded px-1.5 py-0.5 ${
              lead.is_mobile_responsive ? "text-green" : "text-red"
            }`}
          >
            {lead.is_mobile_responsive ? "Mobile ✓" : "No Mobile"}
          </span>
        )}
      </div>

      {/* Chain info */}
      {lead.is_chain && (
        <div className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] text-amber">
          <AlertTriangle size={10} />
          <span>
            Chain
            {lead.parent_company ? ` — ${lead.parent_company}` : ""}
            {lead.hq_location ? ` · HQ: ${lead.hq_location}` : ""}
          </span>
        </div>
      )}

      {/* Best contact */}
      {primaryContact && (primaryContact.name || primaryContact.title) && (
        <div className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] text-text-secondary">
          <User size={10} className="text-purple shrink-0" />
          <span>
            {primaryContact.name}
            {primaryContact.title ? ` · ${primaryContact.title}` : ""}
          </span>
        </div>
      )}

      {/* Brief quote */}
      {briefFirstLine && (
        <p className="text-[11px] text-text-primary leading-relaxed italic border-l-2 border-purple-border pl-2">
          &ldquo;{briefFirstLine}&rdquo;
        </p>
      )}
    </div>
  );
}
