"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";

export function ExportButton() {
  async function handleExport() {
    const supabase = createClient();
    const { data } = await supabase
      .from("leads")
      .select("company_name, phone, email, industry, city, state, status, temperature, next_followup")
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) return;

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calldeck-leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="ghost" onClick={handleExport} className="flex items-center gap-1.5">
      <Download size={12} /> Export CSV
    </Button>
  );
}
