"use client";

import { useState } from "react";
import { Building2, Phone, Mail, MapPin, Users, DollarSign, FileText, Globe } from "lucide-react";
import { Lead } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { QualityDots } from "@/components/ui/quality-dots";
import { updateLead } from "@/lib/actions/leads";
import { useRouter } from "next/navigation";

const FIELDS: { key: keyof Lead; label: string; icon: typeof Building2; type?: string }[] = [
  { key: "company_name", label: "Company", icon: Building2 },
  { key: "industry", label: "Industry", icon: Building2 },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "email", label: "Email", icon: Mail },
  { key: "address", label: "Address", icon: MapPin },
  { key: "city", label: "City", icon: MapPin },
  { key: "state", label: "State", icon: MapPin },
  { key: "website", label: "Website", icon: Globe },
  { key: "employee_count", label: "Employees", icon: Users, type: "number" },
  { key: "revenue_estimate", label: "Revenue", icon: DollarSign },
  { key: "source", label: "Source", icon: FileText },
];

export function CompanyInfo({ lead }: { lead: Lead }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const router = useRouter();

  async function save(key: string) {
    const update: Record<string, unknown> = {};
    update[key] = key === "employee_count" ? (value ? parseInt(value) : null) : value || null;
    await updateLead(lead.id, update as Parameters<typeof updateLead>[1]);
    setEditing(null);
    router.refresh();
  }

  return (
    <Card className="space-y-2">
      <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-2">
        Company Details
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {FIELDS.map(({ key, label, icon: Icon, type }) => {
          const val = lead[key];
          const display = val != null ? String(val) : "—";
          const isEditing = editing === key;

          return (
            <div key={key} className="flex items-start gap-2">
              <Icon size={12} className="text-text-muted mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-text-muted font-[family-name:var(--font-mono)]">{label}</div>
                {isEditing ? (
                  <input
                    type={type || "text"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => save(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save(key);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    autoFocus
                    className="w-full bg-bg-surface border border-border-bright rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
                  />
                ) : (
                  <div
                    onClick={() => {
                      setEditing(key);
                      setValue(val != null ? String(val) : "");
                    }}
                    className="text-xs text-text-primary cursor-pointer hover:text-green truncate"
                  >
                    {key === "website" && val ? (
                      <span className="flex items-center gap-1">
                        <span className="text-cyan truncate">
                          {String(val).replace(/^https?:\/\//, "")}
                        </span>
                        {lead.website_quality && <QualityDots rating={lead.website_quality} />}
                      </span>
                    ) : (
                      display
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
