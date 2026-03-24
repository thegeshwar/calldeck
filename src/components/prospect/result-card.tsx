"use client";

import { ProspectResult } from "@/lib/types";

function ratingColor(rating: number | null): string {
  if (!rating) return "text-text-muted";
  if (rating >= 4.0) return "text-amber";
  if (rating >= 3.0) return "text-amber";
  return "text-red";
}

export function ResultCard({
  result,
  selected,
  onToggle,
  cardRef,
}: {
  result: ProspectResult;
  selected: boolean;
  onToggle: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  if (result.isInDB) {
    return (
      <div
        ref={cardRef}
        className="bg-bg-elevated border-2 border-amber-border rounded-lg p-2.5 mb-1.5 opacity-45"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-text-primary">{result.name}</span>
              <span className="text-[8px] font-[family-name:var(--font-mono)] text-amber bg-amber-dim border border-amber-border px-1.5 py-0.5 rounded">
                IN DB
              </span>
            </div>
            <div className="flex gap-2.5 mt-1">
              <span className="text-[9px] font-[family-name:var(--font-mono)] text-text-muted">
                {result.phone || "No phone"}
              </span>
              <span className="text-[9px] text-text-muted">
                {result.website?.replace(/^https?:\/\//, "") || "No website"}
              </span>
            </div>
          </div>
          {result.rating && (
            <span className={`text-xs font-bold ${ratingColor(result.rating)}`}>
              ★ {result.rating}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="bg-bg-elevated border-2 border-border rounded-lg p-2.5 mb-1.5 hover:border-border-bright transition-colors"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-primary">{result.name}</span>
            {result.rating && (
              <span className={`text-[10px] font-bold ${ratingColor(result.rating)}`}>
                ★ {result.rating}
              </span>
            )}
            {result.reviews != null && (
              <span className="text-[8px] font-[family-name:var(--font-mono)] text-text-muted">
                ({result.reviews})
              </span>
            )}
          </div>
          <div className="flex gap-2.5 mt-1">
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-green font-bold">
              {result.phone || "No phone"}
            </span>
            {result.website ? (
              <span className="text-[10px] text-cyan truncate max-w-[140px]">
                {result.website.replace(/^https?:\/\/(www\.)?/, "")}
              </span>
            ) : (
              <span className="text-[10px] text-red">No website</span>
            )}
            {result.isOpen != null && (
              <span className={`text-[10px] ${result.isOpen ? "text-green" : "text-red"}`}>
                {result.isOpen ? "Open" : "Closed"}
              </span>
            )}
          </div>
          <div className="flex gap-1 mt-1">
            {result.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="text-[7px] font-[family-name:var(--font-mono)] text-purple bg-purple-dim border border-purple-border px-1 py-0.5 rounded"
              >
                {cat.replace(/_/g, " ")}
              </span>
            ))}
            {result.rating != null && result.rating < 3.0 && (
              <span className="text-[7px] font-[family-name:var(--font-mono)] text-red bg-red-dim border border-red-border px-1 py-0.5 rounded">
                Low rating
              </span>
            )}
            <a
              href={result.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[7px] font-[family-name:var(--font-mono)] text-blue bg-blue-dim border border-blue-border px-1 py-0.5 rounded hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Maps
            </a>
          </div>
        </div>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="accent-green w-[14px] h-[14px] ml-2 mt-0.5 cursor-pointer"
        />
      </div>
    </div>
  );
}
