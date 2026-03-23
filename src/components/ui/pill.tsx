const COLOR_MAP = {
  green: "border-green-border bg-green-dim text-green",
  amber: "border-amber-border bg-amber-dim text-amber",
  red: "border-red-border bg-red-dim text-red",
  blue: "border-blue-border bg-blue-dim text-blue",
  purple: "border-purple-border bg-purple-dim text-purple",
  neutral: "border-border bg-bg-hover text-text-secondary",
};

export function Pill({
  children,
  color,
  attention = false,
  size = "sm",
}: {
  children: string;
  color: keyof typeof COLOR_MAP;
  attention?: boolean;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-block border-2 rounded font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] font-bold leading-none ${sizeClasses} ${COLOR_MAP[color]} ${attention ? "attn" : ""}`}
    >
      {children}
    </span>
  );
}
