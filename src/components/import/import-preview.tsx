"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatBadge } from "@/components/ui/stat-badge";
import { createImport } from "@/lib/actions/imports";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ColumnMapping } from "./column-mapper";

export function ImportPreview({
  filename,
  csvData,
  mappings,
  onBack,
  onComplete,
}: {
  filename: string;
  csvData: Record<string, string>[];
  mappings: ColumnMapping[];
  onBack: () => void;
  onComplete: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const router = useRouter();

  // Transform CSV data using mappings
  const leads = csvData
    .map((row) => {
      const lead: Record<string, string | number | undefined> = {};
      mappings.forEach((m) => {
        if (m.target) {
          const val = row[m.csvColumn]?.trim();
          if (val) {
            if (m.target === "employee_count") {
              lead[m.target] = parseInt(val) || undefined;
            } else {
              lead[m.target] = val;
            }
          }
        }
      });
      return lead;
    })
    .filter((l) => l.company_name);

  async function handleImport() {
    setImporting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const res = await createImport(
      filename,
      leads as unknown as Parameters<typeof createImport>[1],
      user!.id
    );
    setResult(res);
    setImporting(false);
    router.refresh();
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-8">
        <div className="flex justify-center gap-3">
          <StatBadge value={result.imported} label="Imported" color="green" />
          <StatBadge value={result.skipped} label="Skipped" color="amber" />
        </div>
        <p className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
          Import complete
        </p>
        <Button variant="primary" onClick={onComplete}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex gap-3">
        <StatBadge value={leads.length} label="New Leads" color="green" />
        <StatBadge value={csvData.length - leads.length} label="Skipped (no company)" color="amber" />
      </div>

      <div className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
        Duplicates (matching phone or company name) will be skipped during import.
      </div>

      <div className="flex gap-2">
        <Button variant="call" onClick={handleImport} disabled={importing || leads.length === 0}>
          {importing ? "Importing..." : `Import ${leads.length} Leads`}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
