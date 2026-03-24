"use client";

import { useRef, useCallback, useEffect } from "react";
import { ProspectResult } from "@/lib/types";
import { ResultCard } from "./result-card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  results: ProspectResult[];
  selected: Set<string>;
  onToggle: (placeId: string) => void;
  onSelectAllNew: () => void;
  sortBy: SortKey;
  onSort: (key: SortKey) => void;
  onImport: () => void;
  importing: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: observe sentinel element at bottom of list
  useEffect(() => {
    if (!hasMore || !onLoadMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { root: scrollRef.current, threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

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

      {/* Cards with infinite scroll */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
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
          />
        ))}

        {/* Sentinel for infinite scroll trigger */}
        {hasMore && (
          <div ref={sentinelRef} className="py-3 flex items-center justify-center">
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-green" />
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                  Loading more...
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                Scroll for more results
              </span>
            )}
          </div>
        )}

        {results.length > 0 && !hasMore && (
          <div className="py-2 text-center">
            <span className="text-[9px] font-[family-name:var(--font-mono)] text-text-muted">
              {results.length} results total
            </span>
          </div>
        )}
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
