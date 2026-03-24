"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { ProspectResult } from "@/lib/types";
import { SearchBar } from "@/components/prospect/search-bar";
import { ResultsPanel } from "@/components/prospect/results-panel";
import { StatBadge } from "@/components/ui/stat-badge";
import { importProspects } from "@/lib/actions/prospect";
import { useRouter } from "next/navigation";

const ProspectMap = dynamic(
  () =>
    import("@/components/prospect/prospect-map").then(
      (mod) => mod.ProspectMap
    ),
  { ssr: false }
);

type SortKey = "rating" | "reviews" | "distance";

export function ProspectClient() {
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(16093);
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const router = useRouter();

  // Store search params + next page token for pagination
  const searchParamsRef = useRef<{ lat: number; lng: number; keyword: string; radius: number } | null>(null);
  const nextPageTokenRef = useRef<string | null>(null);

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortBy) {
      case "rating":
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "reviews":
        sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        break;
      case "distance":
        if (center) {
          sorted.sort((a, b) => {
            const da = Math.hypot(a.lat - center[0], a.lng - center[1]);
            const db = Math.hypot(b.lat - center[0], b.lng - center[1]);
            return da - db;
          });
        }
        break;
    }
    return sorted;
  }, [results, sortBy, center]);

  const newCount = results.filter((r) => !r.isInDB).length;
  const existingCount = results.filter((r) => r.isInDB).length;
  const hasMore = nextPageTokenRef.current !== null;

  async function fetchPage(params: { lat: number; lng: number; keyword: string; radius: number }, pageToken?: string) {
    const res = await fetch("/api/prospect/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: params.lat,
        lng: params.lng,
        keyword: params.keyword,
        radius: params.radius,
        ...(pageToken ? { pageToken } : {}),
      }),
    });
    return res.json();
  }

  async function handleSearch(params: {
    location: string;
    keyword: string;
    radius: number;
    lat: number;
    lng: number;
  }) {
    setLoading(true);
    setImportResult(null);
    setSelected(new Set());
    setResults([]);
    nextPageTokenRef.current = null;

    setCenter([params.lat, params.lng]);
    setRadius(params.radius);
    searchParamsRef.current = { lat: params.lat, lng: params.lng, keyword: params.keyword, radius: params.radius };

    try {
      const data = await fetchPage({ lat: params.lat, lng: params.lng, keyword: params.keyword, radius: params.radius });
      if (data.error) {
        alert(data.error);
        setResults([]);
      } else {
        setResults(data.results || []);
        nextPageTokenRef.current = data.nextPageToken || null;
      }
    } catch {
      alert("Search failed. Check your connection.");
      setResults([]);
    }

    setLoading(false);
  }

  async function handleLoadMore() {
    if (!nextPageTokenRef.current || !searchParamsRef.current || loadingMore) return;

    setLoadingMore(true);

    try {
      const data = await fetchPage(searchParamsRef.current, nextPageTokenRef.current);
      if (!data.error && data.results) {
        // Deduplicate against existing results
        const existingIds = new Set(results.map((r) => r.place_id));
        const newResults = (data.results as ProspectResult[]).filter(
          (r) => !existingIds.has(r.place_id)
        );
        setResults((prev) => [...prev, ...newResults]);
        nextPageTokenRef.current = data.nextPageToken || null;
      } else {
        nextPageTokenRef.current = null;
      }
    } catch {
      nextPageTokenRef.current = null;
    }

    setLoadingMore(false);
  }

  function handleToggle(placeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function handleSelectAllNew() {
    const newIds = results
      .filter((r) => !r.isInDB)
      .map((r) => r.place_id);
    setSelected(new Set(newIds));
  }

  async function handleImport() {
    const selectedResults = results.filter(
      (r) => selected.has(r.place_id) && !r.isInDB
    );
    if (selectedResults.length === 0) return;

    setImporting(true);
    const result = await importProspects(selectedResults);
    setImportResult(result);

    setResults((prev) =>
      prev.map((r) =>
        selected.has(r.place_id) ? { ...r, isInDB: true } : r
      )
    );
    setSelected(new Set());
    setImporting(false);
    router.refresh();
  }

  const handlePinClick = useCallback((index: number) => {
    const el = document.querySelector(`[data-card-index="${index}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-border">
        <div className="flex gap-2">
          {results.length > 0 && (
            <>
              <StatBadge value={newCount} label="New" color="green" />
              <StatBadge value={existingCount} label="In DB" color="amber" />
            </>
          )}
          {importResult && (
            <div className="flex items-center gap-2 ml-3">
              <StatBadge value={importResult.imported} label="Imported" color="green" />
              {importResult.skipped > 0 && (
                <StatBadge value={importResult.skipped} label="Skipped" color="amber" />
              )}
            </div>
          )}
        </div>
      </div>

      <SearchBar onSearch={handleSearch} loading={loading} />

      {/* Map + Results 50/50 */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 border-r-2 border-border flex">
          <ProspectMap
            center={center}
            radius={radius}
            results={sortedResults}
            onPinClick={handlePinClick}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResultsPanel
            results={sortedResults}
            selected={selected}
            onToggle={handleToggle}
            onSelectAllNew={handleSelectAllNew}
            sortBy={sortBy}
            onSort={setSortBy}
            onImport={handleImport}
            importing={importing}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
          />
        </div>
      </div>
    </div>
  );
}
