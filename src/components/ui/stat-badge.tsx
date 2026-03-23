const COLOR_MAP = {
  red: {
    border: "border-red-border",
    bg: "from-red/15 to-red/4",
    text: "text-red",
  },
  amber: {
    border: "border-amber-border",
    bg: "from-amber/15 to-amber/4",
    text: "text-amber",
  },
  green: {
    border: "border-green-border",
    bg: "from-green/15 to-green/4",
    text: "text-green",
  },
  blue: {
    border: "border-blue-border",
    bg: "from-blue/15 to-blue/4",
    text: "text-blue",
  },
  purple: {
    border: "border-purple-border",
    bg: "from-purple/15 to-purple/4",
    text: "text-purple",
  },
};

export function StatBadge({
  value,
  label,
  color,
  attention = false,
}: {
  value: number;
  label: string;
  color: keyof typeof COLOR_MAP;
  attention?: boolean;
}) {
  const c = COLOR_MAP[color];

  return (
    <div
      className={`inline-flex items-center gap-2.5 border-2 ${c.border} bg-gradient-to-br ${c.bg} rounded-lg px-3 py-2 ${attention ? "attn" : ""}`}
    >
      <span
        className={`text-[22px] font-[900] font-[family-name:var(--font-mono)] leading-none ${c.text}`}
      >
        {value}
      </span>
      <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
        {label}
      </span>
    </div>
  );
}
