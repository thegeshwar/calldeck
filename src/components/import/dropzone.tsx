"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload } from "lucide-react";

export function Dropzone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".tsv"))) {
      onFile(file);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`max-w-lg mx-auto border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        dragging
          ? "border-green bg-green-dim"
          : "border-border hover:border-border-bright"
      }`}
    >
      <Upload size={32} className="mx-auto mb-3 text-text-muted" />
      <p className="text-sm text-text-primary mb-1">
        Drop CSV or TSV file here
      </p>
      <p className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted uppercase tracking-wider">
        or click to browse
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
