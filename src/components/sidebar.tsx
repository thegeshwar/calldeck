"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, List, Search, Calendar, Upload, BarChart3, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { ThemeSwitcher } from "./theme-switcher";

const NAV_ITEMS = [
  {
    section: "Workflow",
    items: [
      { href: "/queue", label: "Queue", icon: Zap, badge: true },
      { href: "/leads", label: "Browse", icon: List },
      { href: "/prospect", label: "Prospect", icon: Search },
      { href: "/follow-ups", label: "Follow-ups", icon: Calendar },
    ],
  },
  {
    section: "Manage",
    items: [
      { href: "/import", label: "Import", icon: Upload },
      { href: "/stats", label: "Stats", icon: BarChart3 },
    ],
  },
];

export function Sidebar({
  userId,
  profiles,
  queueCount = 0,
}: {
  userId: string;
  profiles: Profile[];
  queueCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-[210px] flex-shrink-0 h-screen bg-bg-root border-r-2 border-border flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-green flex items-center justify-center text-black font-bold text-sm font-[family-name:var(--font-mono)]">
          C
        </div>
        <span className="text-base font-semibold tracking-tight text-text-primary">
          CallDeck
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-5 mt-2">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            <div className="px-3 mb-1.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
              {section.section}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                      active
                        ? "bg-green-dim border border-green-border text-green"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon size={14} strokeWidth={2} />
                    <span>{item.label}</span>
                    {item.badge && queueCount > 0 && (
                      <span className="ml-auto text-[10px] font-[family-name:var(--font-mono)] font-bold bg-green-dim border border-green-border text-green px-1.5 py-0.5 rounded">
                        {queueCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme */}
      <div className="border-t border-border">
        <ThemeSwitcher userId={userId} initialTheme={profiles.find((p) => p.id === userId)?.theme || "obsidian-wine"} />
      </div>

      {/* Users */}
      <div className="px-2 pb-4 border-t border-border pt-3 space-y-2">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex items-center gap-2.5 px-3 py-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black"
              style={{ backgroundColor: profile.avatar_color }}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-text-secondary truncate">
              {profile.display_name}
            </span>
            <span
              className={`ml-auto w-2 h-2 rounded-full ${
                profile.id === userId ? "bg-green shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-text-muted"
              }`}
            />
          </div>
        ))}
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-2.5 px-3 py-1.5 w-full text-text-muted hover:text-red transition-colors cursor-pointer"
        >
          <LogOut size={12} />
          <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px]">
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
