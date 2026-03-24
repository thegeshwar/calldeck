"use client";

import { useRef, useCallback } from "react";
import { ProspectResult } from "@/lib/types";
import { ResultCard } from "./result-card";
import { Button } from "@/components/ui/button";

type SortKey = "rating" | "reviews" | "distance";

export function ResultsPanel({
  results,
  selected,
  onToggle,
  onSelectAllNew,
  sortBy,
  onSort,
  onImport,
  importing,
}: {
  results: ProspectResult[];
  selected: Set<string>;
  onToggle: (placeId: string) => void;
  onSelectAllNew: () => void;
  sortBy: SortKey;
  onSort: (key: SortKey) => void;
  onImport: () => void;
  importing: boolean;
}) {
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(index, el);
      else cardRefs.current.delete(index);
    },
    []
  );

  const newCount = results.filter((r) => !r.isInDB).length;
  const selectedCount = selected.size;

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "rating", label: "Rating" },
    { key: "reviews", label: "Reviews" },
    { key: "distance", label: "Distance" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sort bar */}
      <div className="flex gap-1.5 px-3 py-1.5 border-b border-border items-center">
        <span className="text-[8px] font-[family-name:var(--font-mono)] uppercase text-text-muted">
          Sort:
        </span>
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => onSort(s.key)}
            className={`text-[8px] font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
              sortBy === s.key
                ? "bg-green-dim border-green-border text-green"
                : "border-border text-text-muted hover:text-text-secondary"
            }`}
          >
            {s.label} {sortBy === s.key ? "↓" : ""}
          </button>
        ))}
        <div className="flex-1" />
        {newCount > 0 && (
          <button
            onClick={onSelectAllNew}
            className="text-[8px] font-[family-name:var(--font-mono)] text-green cursor-pointer hover:underline"
          >
            Select all new ({newCount})
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {results.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
              Search for businesses to see results
            </p>
          </div>
        )}
        {results.map((result, i) => (
          <ResultCard
            key={result.place_id}
            result={result}
            selected={selected.has(result.place_id)}
            onToggle={() => onToggle(result.place_id)}
            cardRef={setCardRef(i)}
          />
        ))}
      </div>

      {/* Import bar */}
      {results.length > 0 && (
        <div className="flex justify-between items-center px-3 py-2 border-t-2 border-border bg-bg-root">
          <span className="text-[9px] font-[family-name:var(--font-mono)] text-text-primary">
            {selectedCount} selected
            <span className="text-text-muted"> · auto-assigned to you</span>
          </span>
          <Button
            variant="call"
            onClick={onImport}
            disabled={selectedCount === 0 || importing}
          >
            {importing
              ? "Importing..."
              : `Import ${selectedCount} Lead${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}

// Export for map pin click scrolling
export function scrollToCard(index: number) {
  const el = document.querySelector(`[data-card-index="${index}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
