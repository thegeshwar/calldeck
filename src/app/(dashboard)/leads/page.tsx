import { getLeadsList, LeadListFilters } from "@/lib/queries/leads";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadStatus, LeadTemperature } from "@/lib/types";
import { Suspense } from "react";
import { ExportButton } from "./export-button";
import { AddLeadButton } from "./add-lead-button";
import { Pagination } from "./pagination";

export default async function BrowseLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters: LeadListFilters = {
    search: params.search,
    status: params.status as LeadStatus | undefined,
    temperature: params.temperature as LeadTemperature | undefined,
    page: params.page ? parseInt(params.page) : 1,
    pageSize: 10,
    sortBy: params.sortBy || "created_at",
    sortDir: (params.sortDir as "asc" | "desc") || "desc",
  };

  const { leads, total } = await getLeadsList(filters);
  const totalPages = Math.ceil(total / 10);

  return (
    <>
      <Topbar title="Browse Leads" subtitle={`${total} leads`}>
        <ExportButton />
        <AddLeadButton />
      </Topbar>
      <Suspense>
        <LeadFilters />
      </Suspense>
      <div className="flex-1 overflow-y-auto">
        <Suspense>
          <LeadTable leads={leads} />
        </Suspense>
        <Pagination currentPage={filters.page || 1} totalPages={totalPages} />
      </div>
    </>
  );
}
