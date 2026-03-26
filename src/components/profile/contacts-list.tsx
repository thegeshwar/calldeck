"use client";

import { useState } from "react";
import { User, Plus, Star, Trash2, Phone, Mail, ExternalLink } from "lucide-react";
import { Contact } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addContact, deleteContact, setPrimaryContact, updateContact } from "@/lib/actions/contacts";
import { useRouter } from "next/navigation";

const inputCls = "bg-bg-surface border border-border-bright rounded px-1.5 py-0.5 text-xs text-text-primary outline-none";

export function ContactsList({
  leadId,
  contacts,
}: {
  leadId: string;
  contacts: Contact[];
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
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

  function startEdit(field: string, id: string, current: string | null | undefined) {
    setEditing(`${field}-${id}`);
    setValue(current ?? "");
  }

  async function saveEdit(field: string, contactId: string) {
    const fieldMap: Record<string, string> = {
      name: "name",
      title: "title",
      phone: "direct_phone",
      email: "email",
      linkedin: "linkedin",
    };
    const dbField = fieldMap[field];
    await updateContact(contactId, leadId, { [dbField]: value || undefined } as Parameters<typeof updateContact>[2]);
    setEditing(null);
    router.refresh();
  }

  function cancelEdit() {
    setEditing(null);
  }

  function handleKeyDown(e: React.KeyboardEvent, field: string, contactId: string) {
    if (e.key === "Enter") saveEdit(field, contactId);
    if (e.key === "Escape") cancelEdit();
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

      {contacts.map((c) => {
        const isEditingName = editing === `name-${c.id}`;
        const isEditingTitle = editing === `title-${c.id}`;
        const isEditingPhone = editing === `phone-${c.id}`;
        const isEditingEmail = editing === `email-${c.id}`;
        const isEditingLinkedin = editing === `linkedin-${c.id}`;

        return (
          <div key={c.id} className="flex items-start gap-2 py-1.5 border-t border-border">
            <User size={12} className="text-text-muted mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isEditingName ? (
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => saveEdit("name", c.id)}
                    onKeyDown={(e) => handleKeyDown(e, "name", c.id)}
                    autoFocus
                    className={inputCls}
                  />
                ) : (
                  <span
                    onClick={() => startEdit("name", c.id, c.name)}
                    className="text-xs text-text-primary font-medium cursor-pointer hover:text-green"
                  >
                    {c.name || "Unknown"}
                  </span>
                )}
                {c.is_primary && <Star size={10} className="text-amber fill-amber" />}
              </div>

              {isEditingTitle ? (
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onBlur={() => saveEdit("title", c.id)}
                  onKeyDown={(e) => handleKeyDown(e, "title", c.id)}
                  autoFocus
                  className={`${inputCls} mt-0.5`}
                />
              ) : (
                <div
                  onClick={() => startEdit("title", c.id, c.title)}
                  className="text-[10px] text-text-secondary cursor-pointer hover:text-green mt-0.5"
                >
                  {c.title || <span className="text-text-muted italic">Add title</span>}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-1">
                {isEditingPhone ? (
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => saveEdit("phone", c.id)}
                    onKeyDown={(e) => handleKeyDown(e, "phone", c.id)}
                    autoFocus
                    className={inputCls}
                    placeholder="Phone"
                  />
                ) : c.direct_phone ? (
                  <a
                    href={`tel:${c.direct_phone}`}
                    onClick={(e) => { e.preventDefault(); startEdit("phone", c.id, c.direct_phone); }}
                    className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-green hover:underline cursor-pointer"
                  >
                    <Phone size={9} /> {c.direct_phone}
                  </a>
                ) : (
                  <span
                    onClick={() => startEdit("phone", c.id, c.direct_phone)}
                    className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-text-muted cursor-pointer hover:text-green italic"
                  >
                    <Phone size={9} /> Add phone
                  </span>
                )}

                {isEditingEmail ? (
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => saveEdit("email", c.id)}
                    onKeyDown={(e) => handleKeyDown(e, "email", c.id)}
                    autoFocus
                    className={inputCls}
                    placeholder="Email"
                  />
                ) : c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    onClick={(e) => { e.preventDefault(); startEdit("email", c.id, c.email); }}
                    className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-cyan hover:underline truncate cursor-pointer"
                  >
                    <Mail size={9} /> {c.email}
                  </a>
                ) : (
                  <span
                    onClick={() => startEdit("email", c.id, c.email)}
                    className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-text-muted cursor-pointer hover:text-green italic"
                  >
                    <Mail size={9} /> Add email
                  </span>
                )}

                {isEditingLinkedin ? (
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => saveEdit("linkedin", c.id)}
                    onKeyDown={(e) => handleKeyDown(e, "linkedin", c.id)}
                    autoFocus
                    className={inputCls}
                    placeholder="LinkedIn URL"
                  />
                ) : c.linkedin ? (
                  <span className="flex items-center gap-1">
                    <a
                      href={c.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-blue hover:underline"
                    >
                      <ExternalLink size={9} /> LinkedIn
                    </a>
                    <button
                      onClick={() => startEdit("linkedin", c.id, c.linkedin)}
                      className="text-[10px] text-text-muted hover:text-green cursor-pointer ml-1"
                    >
                      ✎
                    </button>
                  </span>
                ) : (
                  <span
                    onClick={() => startEdit("linkedin", c.id, c.linkedin)}
                    className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-text-muted cursor-pointer hover:text-green italic"
                  >
                    <ExternalLink size={9} /> Add LinkedIn
                  </span>
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
        );
      })}

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
