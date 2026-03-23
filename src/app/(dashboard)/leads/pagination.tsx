"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-center gap-3 py-4 border-t border-border">
      <Button variant="ghost" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1} className="px-2">
        <ChevronLeft size={12} />
      </Button>
      <span className="text-[11px] font-[family-name:var(--font-mono)] text-text-muted">
        Page {currentPage} of {totalPages}
      </span>
      <Button variant="ghost" onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages} className="px-2">
        <ChevronRight size={12} />
      </Button>
    </div>
  );
}
