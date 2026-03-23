"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/ui/data-table";
import { Pill } from "@/components/ui/pill";
import { Lead, STATUS_LABELS, LeadStatus, LeadTemperature, Contact } from "@/lib/types";

type LeadRow = Lead & { contacts: { name: string }[]; calls: { id: string }[] };

const TEMP_COLORS = { hot: "red" as const, warm: "amber" as const, cold: "blue" as const };
const STATUS_COLORS: Record<LeadStatus, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  new: "blue",
  contacted: "amber",
  interested: "green",
  meeting_scheduled: "green",
  proposal_sent: "purple",
  won: "green",
  lost: "red",
};

export function LeadTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

  function handleSort(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === key) {
      params.set("sortDir", sortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", key);
      params.set("sortDir", "asc");
    }
    router.push(`/leads?${params.toString()}`);
  }

  const today = new Date().toISOString().split("T")[0];

  const columns: Column<LeadRow>[] = [
    {
      key: "company_name",
      label: "Company",
      sortable: true,
      render: (r) => <span className="font-medium text-text-primary">{r.company_name}</span>,
    },
    {
      key: "contact",
      label: "Contact",
      render: (r) => {
        const name = r.contacts?.[0]?.name;
        return <span className="text-text-secondary">{name || "—"}</span>;
      },
    },
    {
      key: "phone",
      label: "Phone",
      render: (r) => (
        <span className="font-[family-name:var(--font-mono)] text-green text-xs">
          {r.phone || "—"}
        </span>
      ),
    },
    {
      key: "industry",
      label: "Industry",
      sortable: true,
      render: (r) => <span className="text-text-secondary">{r.industry || "—"}</span>,
    },
    {
      key: "city",
      label: "Location",
      sortable: true,
      render: (r) => (
        <span className="text-text-secondary">
          {r.city ? `${r.city}${r.state ? `, ${r.state}` : ""}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => <Pill color={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Pill>,
    },
    {
      key: "temperature",
      label: "Temp",
      sortable: true,
      render: (r) => (
        <Pill color={TEMP_COLORS[r.temperature]} attention={r.temperature === "hot"}>
          {r.temperature}
        </Pill>
      ),
    },
    {
      key: "next_followup",
      label: "Next F/U",
      sortable: true,
      render: (r) => {
        if (!r.next_followup) return <span className="text-text-muted">—</span>;
        const overdue = r.next_followup < today;
        return (
          <span className={`font-[family-name:var(--font-mono)] text-xs ${overdue ? "text-red" : "text-text-secondary"}`}>
            {r.next_followup}
          </span>
        );
      },
    },
    {
      key: "calls",
      label: "Calls",
      render: (r) => (
        <span className="font-[family-name:var(--font-mono)] text-text-secondary">
          {r.calls?.length || 0}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={leads}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={handleSort}
      onRowClick={(row) => router.push(`/leads/${row.id}`)}
    />
  );
}
