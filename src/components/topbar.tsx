import { ReactNode } from "react";

export function Topbar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border bg-bg-surface flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-xs font-[family-name:var(--font-mono)] text-text-muted mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
