// Shared Tailwind class tokens for the glassmorphism / gradient visual language, so the
// same panel, input, and button treatment stays consistent across the board, dashboard,
// and modals instead of drifting file-by-file.

export const glassPanel =
  "rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

export const glassPanelSubtle =
  "rounded-xl border border-slate-200/70 bg-slate-50/80 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]";

export const inputClasses =
  "w-full rounded-lg border border-slate-300/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400/60 dark:focus:ring-violet-500/25";

export const labelClasses = "flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300";

export const sectionEyebrow =
  "text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500";

export const gradientButton =
  "rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_-4px_rgba(99,102,241,0.5)] transition-all duration-200 hover:shadow-[0_4px_24px_-2px_rgba(99,102,241,0.65)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";

export const secondaryButton =
  "rounded-lg border border-slate-200/80 px-3 py-1.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]";

export const ghostDangerButton =
  "rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-500/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400";
