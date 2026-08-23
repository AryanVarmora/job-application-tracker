import type { ReactNode } from "react";

interface Props {
  className?: string;
  children: ReactNode;
}

export function Badge({ className = "", children }: Props) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
