"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueueNav({
  currentIndex,
  totalCount,
  onPrev,
  onNext,
}: {
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        onClick={onPrev}
        disabled={currentIndex <= 0}
        className="px-2"
      >
        <ChevronLeft size={14} />
      </Button>
      <span className="text-[11px] font-[family-name:var(--font-mono)] text-text-muted">
        Lead {totalCount > 0 ? currentIndex + 1 : 0} of {totalCount}
      </span>
      <Button
        variant="ghost"
        onClick={onNext}
        disabled={currentIndex >= totalCount - 1}
        className="px-2"
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
