"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SocialProfile, SocialPlatform, PLATFORM_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addSocialProfile, deleteSocialProfile } from "@/lib/actions/social-profiles";
import { useRouter } from "next/navigation";

const PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "other"];

export function SocialProfiles({
  leadId,
  profiles,
}: {
  leadId: string;
  profiles: SocialProfile[];
}) {
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addSocialProfile(leadId, {
      platform: fd.get("platform") as SocialPlatform,
      url: (fd.get("url") as string) || undefined,
      followers: fd.get("followers") ? parseInt(fd.get("followers") as string) : undefined,
    });
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await deleteSocialProfile(id, leadId);
    router.refresh();
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
          Social Media
        </div>
        <button onClick={() => setAdding(!adding)} className="text-text-muted hover:text-green cursor-pointer">
          <Plus size={12} />
        </button>
      </div>

      {profiles.length === 0 && !adding && (
        <div className="text-[10px] text-text-muted">No social profiles</div>
      )}

      {profiles.map((sp) => (
        <div key={sp.id} className="flex items-center gap-2 py-1 border-t border-border">
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted w-16 uppercase">
            {sp.platform}
          </span>
          {sp.url ? (
            <a href={sp.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-cyan hover:underline truncate flex-1">
              {sp.url.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          ) : (
            <span className="text-xs text-text-muted flex-1">—</span>
          )}
          {sp.followers != null && (
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-secondary">
              {sp.followers.toLocaleString()}
            </span>
          )}
          <button onClick={() => handleDelete(sp.id)} className="text-text-muted hover:text-red cursor-pointer shrink-0">
            <Trash2 size={10} />
          </button>
        </div>
      ))}

      {adding && (
        <form onSubmit={handleAdd} className="space-y-1.5 pt-2 border-t border-border">
          <select name="platform" className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none">
            {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
          <input name="url" placeholder="URL" className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none" />
          <input name="followers" placeholder="Followers" type="number" className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none" />
          <div className="flex gap-1.5">
            <Button variant="primary" className="text-[10px] px-2 py-1">Add</Button>
            <Button variant="ghost" type="button" onClick={() => setAdding(false)} className="text-[10px] px-2 py-1">Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
