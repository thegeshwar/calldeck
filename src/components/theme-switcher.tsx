"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { THEMES, getTheme } from "@/lib/themes";
import { createClient } from "@/lib/supabase/client";

function applyTheme(key: string) {
  const theme = getTheme(key);
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
}

export function ThemeSwitcher({ userId, initialTheme }: { userId: string; initialTheme: string }) {
  const [current, setCurrent] = useState(initialTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme(current);
  }, [current]);

  async function selectTheme(key: string) {
    setCurrent(key);
    setOpen(false);
    applyTheme(key);

    const supabase = createClient();
    await supabase.from("cd_profiles").update({ theme: key }).eq("id", userId);
  }

  return (
    <div className="relative px-3 py-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer w-full"
      >
        <Palette size={12} />
        <span className="text-[10px] font-[family-name:var(--font-mono)]">
          {getTheme(current).name}
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full left-2 mb-1 bg-bg-elevated border-2 border-border rounded-lg py-1 min-w-[160px] z-50 shadow-lg">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTheme(t.key)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                current === t.key
                  ? "text-green bg-green-dim"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm border border-border"
                  style={{ backgroundColor: t.vars["--color-bg-surface"] }}
                />
                {t.name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
