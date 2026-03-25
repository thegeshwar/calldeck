"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addContact, setPrimaryContact } from "@/lib/actions/contacts";

export function QuickAddContact({
  leadId,
  onDone,
}: {
  leadId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const contact = await addContact(leadId, {
      name: name.trim(),
      title: title.trim() || undefined,
      direct_phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      is_primary: isPrimary,
    });

    if (isPrimary && contact?.id) {
      await setPrimaryContact(leadId, contact.id);
    }

    router.refresh();
    setSaving(false);
    onDone();
  }

  const inputClass =
    "w-full bg-bg-elevated border-2 border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-bright font-[family-name:var(--font-mono)]";

  return (
    <div className="border-t-2 border-border mt-2 pt-2 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name *"
        className={inputClass}
        autoFocus
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={inputClass}
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className={inputClass}
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className={inputClass}
      />
      <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="accent-green"
        />
        Set as primary
      </label>
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex-1"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
