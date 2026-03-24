"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ProspectResult } from "@/lib/types";

function createPinIcon(color: string, opacity: number = 1) {
  const svg = `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}" fill-opacity="${opacity}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <circle cx="12" cy="12" r="5" fill="rgba(255,255,255,0.3)"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
    className: "",
  });
}

const greenPin = createPinIcon("#22c55e");
const amberPin = createPinIcon("#f59e0b", 0.6);
const centerIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid rgba(34,197,94,0.3);box-shadow:0 0 20px rgba(34,197,94,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: "",
});

export function ProspectMap({
  center,
  radius,
  results,
  onPinClick,
}: {
  center: [number, number] | null;
  radius: number;
  results: ProspectResult[];
  onPinClick?: (index: number) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30.2672, -97.7431],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center + radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    map.setView(center, getZoomForRadius(radius));

    if (circleRef.current) {
      circleRef.current.remove();
    }
    circleRef.current = L.circle(center, {
      radius,
      color: "rgba(34,197,94,0.25)",
      dashArray: "8,4",
      fillColor: "rgba(34,197,94,0.05)",
      fillOpacity: 1,
      weight: 2,
    }).addTo(map);

    // Center marker
    L.marker(center, { icon: centerIcon }).addTo(markersRef.current!);
  }, [center, radius]);

  // Update markers
  useEffect(() => {
    const markers = markersRef.current;
    if (!markers) return;
    markers.clearLayers();

    // Re-add center marker
    if (center) {
      L.marker(center, { icon: centerIcon }).addTo(markers);
    }

    results.forEach((result, i) => {
      const marker = L.marker([result.lat, result.lng], {
        icon: result.isInDB ? amberPin : greenPin,
      });

      const tooltipContent = `
        <div style="font-family:monospace;font-size:11px;line-height:1.4;">
          <strong style="color:#e4dbe8;">${result.name}</strong><br/>
          <span style="color:#22c55e;">${result.phone || "No phone"}</span>
          ${result.rating ? ` · <span style="color:#f59e0b;">★ ${result.rating}</span>` : ""}
        </div>
      `;
      marker.bindTooltip(tooltipContent, {
        className: "prospect-tooltip",
        direction: "top",
        offset: [0, -32],
      });

      marker.on("click", () => onPinClick?.(i));
      marker.addTo(markers);
    });
  }, [results, center, onPinClick]);

  return (
    <div className="relative flex-1">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-bg-root/90 border border-border rounded px-2 py-1 flex gap-3">
        <span className="text-[8px] font-[family-name:var(--font-mono)] text-text-muted flex items-center gap-1">
          <span className="w-[5px] h-[5px] bg-green rounded-full inline-block" /> New
        </span>
        <span className="text-[8px] font-[family-name:var(--font-mono)] text-text-muted flex items-center gap-1">
          <span className="w-[5px] h-[5px] bg-amber rounded-full inline-block" /> In DB
        </span>
      </div>
      <style>{`
        .prospect-tooltip {
          background: #1a101e !important;
          border: 2px solid #3a2245 !important;
          border-radius: 6px !important;
          padding: 6px 8px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.6) !important;
          color: #e4dbe8 !important;
        }
        .prospect-tooltip::before {
          border-top-color: #3a2245 !important;
        }
        .leaflet-control-zoom a {
          background: rgba(26,16,30,0.9) !important;
          border-color: #3a2245 !important;
          color: #e4dbe8 !important;
        }
      `}</style>
    </div>
  );
}

function getZoomForRadius(radius: number): number {
  if (radius <= 8047) return 13;
  if (radius <= 16093) return 12;
  if (radius <= 24140) return 11;
  return 10;
}
