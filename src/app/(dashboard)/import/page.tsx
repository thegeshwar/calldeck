"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { Dropzone } from "@/components/import/dropzone";
import { ColumnMapper, ColumnMapping } from "@/components/import/column-mapper";
import { ImportPreview } from "@/components/import/import-preview";
import Papa from "papaparse";

type Step = "upload" | "map" | "preview";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [filename, setFilename] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  function handleFile(file: File) {
    setFilename(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data as Record<string, string>[]);

        // Auto-map obvious columns
        const autoMappings: ColumnMapping[] = headers.map((h) => {
          const lower = h.toLowerCase().replace(/[^a-z]/g, "");
          let target: string | null = null;
          if (lower.includes("company") || lower.includes("business") || lower.includes("name")) target = "company_name";
          else if (lower.includes("phone") || lower.includes("tel")) target = "phone";
          else if (lower.includes("email") || lower.includes("mail")) target = "email";
          else if (lower.includes("industry") || lower.includes("sector")) target = "industry";
          else if (lower.includes("website") || lower.includes("url") || lower.includes("site")) target = "website";
          else if (lower.includes("city") || lower.includes("town")) target = "city";
          else if (lower.includes("state") || lower.includes("province")) target = "state";
          else if (lower.includes("address") || lower.includes("street")) target = "address";
          else if (lower.includes("employee") || lower.includes("size")) target = "employee_count";
          else if (lower.includes("revenue") || lower.includes("sales")) target = "revenue_estimate";
          else if (lower.includes("source") || lower.includes("lead")) target = "source";
          return { csvColumn: h, target };
        });
        setMappings(autoMappings);
        setStep("map");
      },
    });
  }

  function handleMappingDone(m: ColumnMapping[]) {
    setMappings(m);
    setStep("preview");
  }

  return (
    <>
      <Topbar title="Import Leads" subtitle={step === "upload" ? "Upload a CSV file" : filename} />

      <div className="flex-1 overflow-y-auto p-6">
        {step === "upload" && <Dropzone onFile={handleFile} />}
        {step === "map" && (
          <ColumnMapper
            csvHeaders={csvHeaders}
            mappings={mappings}
            onDone={handleMappingDone}
            onBack={() => setStep("upload")}
          />
        )}
        {step === "preview" && (
          <ImportPreview
            filename={filename}
            csvData={csvData}
            mappings={mappings}
            onBack={() => setStep("map")}
            onComplete={() => {
              setStep("upload");
              setCsvData([]);
              setCsvHeaders([]);
            }}
          />
        )}
      </div>
    </>
  );
}
