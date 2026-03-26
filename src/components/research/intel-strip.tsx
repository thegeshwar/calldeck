"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cpu, User, Zap, AlertTriangle, Phone, Mail } from "lucide-react";
import { Lead, Contact } from "@/lib/types";
import { ResearchButton } from "./research-button";
import { createClient } from "@/lib/supabase/client";

interface IntelStripProps {
  lead: Lead;
  contacts?: Contact[];
  primaryContact?: Contact | null;
}

export function IntelStrip({ lead, contacts = [], primaryContact }: IntelStripProps) {
  const router = useRouter();
  const [liveStatus, setLiveStatus] = useState(lead.research_status);

  useEffect(() => {
    setLiveStatus(lead.research_status);
  }, [lead.research_status]);

  useEffect(() => {
    if (liveStatus !== "pending" && liveStatus !== "running") return;

    const supabase = createClient();
    const channel = supabase
      .channel(`intel-${lead.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `id=eq.${lead.id}`,
        },
        (payload) => {
          const newStatus = payload.new.research_status;
          if (newStatus && newStatus !== liveStatus) {
            setLiveStatus(newStatus);
            if (newStatus === "done" || newStatus === "failed") {
              router.refresh();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lead.id, liveStatus, router]);

  const researchDone = liveStatus === "done";

  // No research or still running — delegate entirely to ResearchButton
  if (!researchDone) {
    return (
      <ResearchButton
        leadId={lead.id}
        status={liveStatus}
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
          status={liveStatus}
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

      {/* All contacts */}
      {contacts.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
            Contacts
          </div>
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 text-[10px] font-[family-name:var(--font-mono)]"
            >
              <User size={10} className={c.is_primary ? "text-green shrink-0" : "text-text-muted shrink-0"} />
              <span className={c.is_primary ? "text-green" : "text-text-secondary"}>
                {c.name}
              </span>
              {c.title && (
                <span className="text-text-muted truncate">{c.title}</span>
              )}
              {c.direct_phone && (
                <span className="flex items-center gap-0.5 text-cyan ml-auto shrink-0">
                  <Phone size={8} /> {c.direct_phone}
                </span>
              )}
              {c.email && (
                <span className="flex items-center gap-0.5 text-cyan shrink-0">
                  <Mail size={8} /> {c.email}
                </span>
              )}
            </div>
          ))}
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
