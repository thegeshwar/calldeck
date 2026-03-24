"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { INDUSTRIES, RADIUS_OPTIONS } from "@/lib/prospect-categories";
import { Search } from "lucide-react";

export function SearchBar({
  onSearch,
  loading,
}: {
  onSearch: (params: {
    location: string;
    keyword: string;
    radius: number;
    lat: number;
    lng: number;
  }) => void;
  loading: boolean;
}) {
  const [location, setLocation] = useState("");
  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState(16093);

  async function handleSearch() {
    if (!location.trim()) return;

    // Geocode the location using Google Geocoding API
    const geoRes = await fetch(
      `/api/prospect/geocode?address=${encodeURIComponent(location)}`
    );
    const geoData = await geoRes.json();

    if (geoData.error) {
      alert(geoData.error);
      return;
    }

    onSearch({
      location,
      keyword,
      radius,
      lat: geoData.lat,
      lng: geoData.lng,
    });
  }

  return (
    <div className="flex gap-2 px-5 py-2.5 border-b border-border items-end">
      <div className="flex-1 max-w-[200px]">
        <label className="block text-[8px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="City, state or ZIP..."
          className="w-full bg-bg-elevated border-2 border-border rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright"
        />
      </div>

      <div className="flex-1 max-w-[180px]">
        <label className="block text-[8px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1">
          Industry
        </label>
        <select
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full bg-bg-elevated border-2 border-border rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-border-bright"
        >
          {INDUSTRIES.map((ind) => (
            <option key={ind.keyword} value={ind.keyword}>
              {ind.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-[90px]">
        <label className="block text-[8px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1">
          Radius
        </label>
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full bg-bg-elevated border-2 border-border rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-border-bright"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="call"
        onClick={handleSearch}
        disabled={loading || !location.trim()}
        className="flex items-center gap-1.5"
      >
        <Search size={12} />
        {loading ? "Searching..." : "Search"}
      </Button>
    </div>
  );
}
