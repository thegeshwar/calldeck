"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLead } from "@/lib/actions/leads";
import { useRouter } from "next/navigation";

export function AddLeadButton() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    await createLead({
      company_name: fd.get("company_name") as string,
      phone: (fd.get("phone") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      industry: (fd.get("industry") as string) || undefined,
      city: (fd.get("city") as string) || undefined,
      state: (fd.get("state") as string) || undefined,
      website: (fd.get("website") as string) || undefined,
    });

    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)} className="flex items-center gap-1.5">
        <Plus size={12} /> Add Lead
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="bg-bg-elevated border-2 border-border rounded-lg p-5 w-full max-w-md space-y-3"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">Add Lead</h3>
          <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <input name="company_name" placeholder="Company name *" required
          className="w-full bg-bg-surface border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright" />
        <div className="grid grid-cols-2 gap-2">
          <input name="phone" placeholder="Phone"
            className="bg-bg-surface border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright" />
          <input name="email" placeholder="Email"
            className="bg-bg-surface border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="industry" placeholder="Industry"
            className="bg-bg-surface border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright" />
          <input name="website" placeholder="Website"
            className="bg-bg-surface border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="city" placeholder="City"
            className="bg-bg-surface border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright" />
          <input name="state" placeholder="State"
            className="bg-bg-surface border-2 border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="primary" className="flex-1" disabled={saving}>
            {saving ? "Saving..." : "Add Lead"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
