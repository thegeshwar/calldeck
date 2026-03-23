"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { updateLeadStatus, updateLead, assignLead } from "@/lib/actions/leads";
import { Lead, Profile, LeadStatus, LeadTemperature, STATUS_LABELS } from "@/lib/types";
import { useRouter } from "next/navigation";

const STATUSES: LeadStatus[] = ["new", "contacted", "interested", "meeting_scheduled", "proposal_sent", "won", "lost"];
const TEMPS: LeadTemperature[] = ["hot", "warm", "cold"];
const TEMP_COLORS = { hot: "red" as const, warm: "amber" as const, cold: "blue" as const };
const STATUS_COLORS: Record<LeadStatus, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  new: "blue", contacted: "amber", interested: "green", meeting_scheduled: "green",
  proposal_sent: "purple", won: "green", lost: "red",
};

export function PipelineInfo({
  lead,
  profiles,
}: {
  lead: Lead;
  profiles: Profile[];
}) {
  const router = useRouter();
  const [editingServices, setEditingServices] = useState(false);
  const [services, setServices] = useState((lead.interested_services || []).join(", "));

  async function changeStatus(status: LeadStatus) {
    await updateLeadStatus(lead.id, status);
    router.refresh();
  }

  async function changeTemp(temp: LeadTemperature) {
    await updateLeadStatus(lead.id, lead.status, temp);
    router.refresh();
  }

  async function changeAssigned(userId: string) {
    await assignLead(lead.id, userId);
    router.refresh();
  }

  async function saveServices() {
    await updateLead(lead.id, {
      interested_services: services.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setEditingServices(false);
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
        Pipeline
      </div>

      {/* Status */}
      <div>
        <div className="text-[10px] text-text-muted mb-1">Status</div>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => changeStatus(s)} className="cursor-pointer">
              <Pill color={lead.status === s ? STATUS_COLORS[s] : "neutral"}>
                {STATUS_LABELS[s]}
              </Pill>
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div>
        <div className="text-[10px] text-text-muted mb-1">Temperature</div>
        <div className="flex gap-1">
          {TEMPS.map((t) => (
            <button key={t} onClick={() => changeTemp(t)} className="cursor-pointer">
              <Pill color={lead.temperature === t ? TEMP_COLORS[t] : "neutral"} attention={lead.temperature === t && t === "hot"}>
                {t}
              </Pill>
            </button>
          ))}
        </div>
      </div>

      {/* Assigned to */}
      <div>
        <div className="text-[10px] text-text-muted mb-1">Assigned to</div>
        <select
          value={lead.assigned_to || ""}
          onChange={(e) => changeAssigned(e.target.value)}
          className="bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary outline-none"
        >
          <option value="">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>

      {/* Services */}
      <div>
        <div className="text-[10px] text-text-muted mb-1">Interested Services</div>
        {editingServices ? (
          <div className="flex gap-1.5">
            <input value={services} onChange={(e) => setServices(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveServices()}
              className="flex-1 bg-bg-surface border border-border-bright rounded px-2 py-1 text-xs text-text-primary outline-none"
              placeholder="AI Search, Websites, Automation" autoFocus />
            <button onClick={saveServices} className="text-[10px] text-green cursor-pointer">Save</button>
          </div>
        ) : (
          <div onClick={() => setEditingServices(true)} className="cursor-pointer text-xs text-text-primary hover:text-green">
            {lead.interested_services?.length ? lead.interested_services.join(", ") : "Click to add"}
          </div>
        )}
      </div>

      {/* Objections */}
      {lead.objections && (
        <div>
          <div className="text-[10px] text-text-muted mb-1">Objections</div>
          <p className="text-xs text-red">{lead.objections}</p>
        </div>
      )}
    </Card>
  );
}
