"use client";

import { useState } from "react";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickLog } from "@/components/queue/quick-log";
import { useRouter } from "next/navigation";

export function LogCallButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="call" onClick={() => setOpen(true)} className="flex items-center gap-1.5">
        <Phone size={12} /> Log Call
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-elevated border-2 border-border rounded-lg p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Log Call</h3>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <QuickLog
              leadId={leadId}
              onLogged={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
