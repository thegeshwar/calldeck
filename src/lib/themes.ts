export interface Theme {
  key: string;
  name: string;
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    key: "obsidian-wine",
    name: "Obsidian Wine",
    vars: {
      "--color-bg-root": "#08040a",
      "--color-bg-surface": "#110a14",
      "--color-bg-elevated": "#1a101e",
      "--color-bg-hover": "#221528",
      "--color-border": "#2a1832",
      "--color-border-bright": "#3a2245",
      "--color-text-primary": "#e4dbe8",
      "--color-text-secondary": "#7a5c84",
      "--color-text-muted": "#6b4d75",
    },
  },
  {
    key: "graphite",
    name: "Graphite",
    vars: {
      "--color-bg-root": "#0a0a0a",
      "--color-bg-surface": "#141414",
      "--color-bg-elevated": "#1e1e1e",
      "--color-bg-hover": "#282828",
      "--color-border": "#2e2e2e",
      "--color-border-bright": "#3e3e3e",
      "--color-text-primary": "#e0e0e0",
      "--color-text-secondary": "#808080",
      "--color-text-muted": "#666666",
    },
  },
  {
    key: "midnight-navy",
    name: "Midnight Navy",
    vars: {
      "--color-bg-root": "#040810",
      "--color-bg-surface": "#0a1020",
      "--color-bg-elevated": "#101828",
      "--color-bg-hover": "#182030",
      "--color-border": "#1a2540",
      "--color-border-bright": "#253555",
      "--color-text-primary": "#dbe4f0",
      "--color-text-secondary": "#5c7090",
      "--color-text-muted": "#4d6080",
    },
  },
  {
    key: "deep-emerald",
    name: "Deep Emerald",
    vars: {
      "--color-bg-root": "#040a08",
      "--color-bg-surface": "#0a1410",
      "--color-bg-elevated": "#101e18",
      "--color-bg-hover": "#152820",
      "--color-border": "#183225",
      "--color-border-bright": "#224538",
      "--color-text-primary": "#dbe8e2",
      "--color-text-secondary": "#5c8470",
      "--color-text-muted": "#4d7560",
    },
  },
  {
    key: "arctic-slate",
    name: "Arctic Slate",
    vars: {
      "--color-bg-root": "#0c0e12",
      "--color-bg-surface": "#12151a",
      "--color-bg-elevated": "#1a1d24",
      "--color-bg-hover": "#22262e",
      "--color-border": "#2a2e38",
      "--color-border-bright": "#3a404c",
      "--color-text-primary": "#e0e4ea",
      "--color-text-secondary": "#6a7080",
      "--color-text-muted": "#585e70",
    },
  },
];

export function getTheme(key: string): Theme {
  return THEMES.find((t) => t.key === key) || THEMES[0];
}
