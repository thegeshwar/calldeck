"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadWithRelations, Profile } from "@/lib/types";
import { LeadCard } from "@/components/queue/lead-card";
import { CallHistory } from "@/components/queue/call-history";
import { QuickLog } from "@/components/queue/quick-log";
import { QueueNav } from "@/components/queue/queue-nav";

export function QueueClient({
  leads,
  profiles,
}: {
  leads: LeadWithRelations[];
  profiles: Profile[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const lead = leads[currentIndex];

  function handleNext() {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function handleLogged() {
    // Advance index first, then refresh server data in a transition
    // so React waits for the new data before re-rendering
    const nextIndex = currentIndex < leads.length - 1 ? currentIndex + 1 : currentIndex;
    setCurrentIndex(nextIndex);
    startTransition(() => {
      router.refresh();
    });
  }

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary mb-1">Queue empty</p>
          <p className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
            Import leads or check back later
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Lead card */}
      <div className="flex-1 flex flex-col min-w-0">
        <LeadCard
          lead={lead}
          onCallNow={() => {
            // Scroll to quick log
            document.getElementById("quick-log")?.scrollIntoView({ behavior: "smooth" });
          }}
          onSkip={() => {
            const nextIndex = currentIndex < leads.length - 1 ? currentIndex + 1 : currentIndex;
            setCurrentIndex(nextIndex);
            startTransition(() => { router.refresh(); });
          }}
          onSnooze={() => {
            const nextIndex = currentIndex < leads.length - 1 ? currentIndex + 1 : currentIndex;
            setCurrentIndex(nextIndex);
            startTransition(() => { router.refresh(); });
          }}
        />
        <div className="px-4 pb-3 border-t border-border pt-2">
          <QueueNav
            currentIndex={currentIndex}
            totalCount={leads.length}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
      </div>

      {/* Right: Call history + Quick log */}
      <div className="w-[340px] flex-shrink-0 border-l-2 border-border flex flex-col p-4 overflow-hidden">
        <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-2">
          Call History
        </div>
        <CallHistory calls={lead.calls} profiles={profiles} />

        <div id="quick-log">
          <QuickLog leadId={lead.id} onLogged={handleLogged} />
        </div>
      </div>
    </div>
  );
}
