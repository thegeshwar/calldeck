import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-bg-elevated border-2 border-border rounded-lg p-3 ${className}`}>
      {children}
    </div>
  );
}
