import type { CSSProperties } from "react";

// Recharts renders the tooltip as a plain positioned <div>, not SVG, so it can take
// real CSS (including backdrop-filter) via contentStyle even though the chart itself
// can't be reached by Tailwind's `dark:` variant.
export function chartTooltipStyle(isDark: boolean): CSSProperties {
  return {
    borderRadius: 12,
    fontSize: 12,
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(15,23,42,0.08)",
    backgroundColor: isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    boxShadow: isDark ? "0 8px 30px -8px rgba(0,0,0,0.5)" : "0 8px 30px -8px rgba(15,23,42,0.15)",
    color: isDark ? "#e2e8f0" : "#0f172a",
  };
}
