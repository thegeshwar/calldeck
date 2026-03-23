"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && onSort?.(col.key)}
                className={`text-left text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted px-3 py-2.5 ${
                  col.sortable ? "cursor-pointer hover:text-text-secondary select-none" : ""
                } ${col.className || ""}`}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border transition-colors ${
                onRowClick ? "cursor-pointer hover:bg-bg-hover" : ""
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-3 py-2.5 text-sm ${col.className || ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-8 text-xs text-text-muted font-[family-name:var(--font-mono)]"
              >
                No results
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
