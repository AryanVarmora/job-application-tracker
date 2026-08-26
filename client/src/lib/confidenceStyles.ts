// Shared between the manual paste-email flow and the Gmail-scan suggestions list, so both
// confirm/reject UIs read the same confidence signal the same way.
export const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  low: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400",
};
