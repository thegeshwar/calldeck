"use client";

import { Button } from "@/components/ui/button";

export interface ColumnMapping {
  csvColumn: string;
  target: string | null;
}

const CALLDECK_FIELDS = [
  { value: "", label: "— Skip —" },
  { value: "company_name", label: "Company Name" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "industry", label: "Industry" },
  { value: "website", label: "Website" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "address", label: "Address" },
  { value: "employee_count", label: "Employee Count" },
  { value: "revenue_estimate", label: "Revenue Estimate" },
  { value: "source", label: "Source" },
];

export function ColumnMapper({
  csvHeaders,
  mappings,
  onDone,
  onBack,
}: {
  csvHeaders: string[];
  mappings: ColumnMapping[];
  onDone: (mappings: ColumnMapping[]) => void;
  onBack: () => void;
}) {
  function handleChange(csvColumn: string, target: string) {
    const updated = mappings.map((m) =>
      m.csvColumn === csvColumn ? { ...m, target: target || null } : m
    );
    onDone(updated);
  }

  const hasCompany = mappings.some((m) => m.target === "company_name");

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
        Map your CSV columns to CallDeck fields
      </div>

      <div className="space-y-2">
        {mappings.map((m) => (
          <div key={m.csvColumn} className="flex items-center gap-3">
            <span className="text-xs text-text-primary flex-1 truncate font-[family-name:var(--font-mono)]">
              {m.csvColumn}
            </span>
            <span className="text-text-muted text-xs">→</span>
            <select
              value={m.target || ""}
              onChange={(e) => handleChange(m.csvColumn, e.target.value)}
              className="flex-1 bg-bg-elevated border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-border-bright"
            >
              {CALLDECK_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!hasCompany && (
        <p className="text-[10px] text-red font-[family-name:var(--font-mono)]">
          Company Name mapping is required
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onDone(mappings)} disabled={!hasCompany}>
          Continue
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
