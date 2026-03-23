"use client";

import { useState } from "react";
import { User, Plus, Star, Trash2 } from "lucide-react";
import { Contact } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addContact, deleteContact, setPrimaryContact } from "@/lib/actions/contacts";
import { useRouter } from "next/navigation";

export function ContactsList({
  leadId,
  contacts,
}: {
  leadId: string;
  contacts: Contact[];
}) {
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addContact(leadId, {
      name: (fd.get("name") as string) || undefined,
      title: (fd.get("title") as string) || undefined,
      direct_phone: (fd.get("direct_phone") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      linkedin: (fd.get("linkedin") as string) || undefined,
      is_primary: contacts.length === 0,
    });
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await deleteContact(id, leadId);
    router.refresh();
  }

  async function handleSetPrimary(contactId: string) {
    await setPrimaryContact(leadId, contactId);
    router.refresh();
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
          Contacts
        </div>
        <button onClick={() => setAdding(!adding)} className="text-text-muted hover:text-green cursor-pointer">
          <Plus size={12} />
        </button>
      </div>

      {contacts.map((c) => (
        <div key={c.id} className="flex items-start gap-2 py-1.5 border-t border-border">
          <User size={12} className="text-text-muted mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-primary font-medium">{c.name || "Unknown"}</span>
              {c.is_primary && <Star size={10} className="text-amber fill-amber" />}
            </div>
            {c.title && <div className="text-[10px] text-text-secondary">{c.title}</div>}
            <div className="flex gap-3 mt-0.5">
              {c.direct_phone && (
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-green">{c.direct_phone}</span>
              )}
              {c.email && (
                <span className="text-[10px] text-text-muted truncate">{c.email}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {!c.is_primary && (
              <button onClick={() => handleSetPrimary(c.id)} className="text-text-muted hover:text-amber cursor-pointer" title="Set primary">
                <Star size={10} />
              </button>
            )}
            <button onClick={() => handleDelete(c.id)} className="text-text-muted hover:text-red cursor-pointer">
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      ))}

      {adding && (
        <form onSubmit={handleAdd} className="space-y-1.5 pt-2 border-t border-border">
          <div className="grid grid-cols-2 gap-1.5">
            <input name="name" placeholder="Name" className="bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none" />
            <input name="title" placeholder="Title" className="bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none" />
            <input name="direct_phone" placeholder="Phone" className="bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none" />
            <input name="email" placeholder="Email" className="bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none" />
          </div>
          <input name="linkedin" placeholder="LinkedIn URL" className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none" />
          <div className="flex gap-1.5">
            <Button variant="primary" className="text-[10px] px-2 py-1">Add</Button>
            <Button variant="ghost" type="button" onClick={() => setAdding(false)} className="text-[10px] px-2 py-1">Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
