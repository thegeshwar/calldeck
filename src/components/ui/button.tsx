import { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  call: "bg-green text-black font-bold uppercase tracking-[2px] text-xs shadow-[0_4px_0_#15803d] hover:shadow-[0_2px_0_#15803d] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] attn",
  primary: "bg-green text-black font-bold uppercase tracking-[2px] text-xs hover:brightness-110",
  ghost: "bg-bg-elevated border-2 border-border text-text-secondary hover:border-border-bright hover:text-text-primary",
};

export function Button({
  variant = "ghost",
  className = "",
  children,
  ...props
}: {
  variant?: keyof typeof VARIANTS;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 rounded font-[family-name:var(--font-mono)] text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
