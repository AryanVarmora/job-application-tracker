export type FitScoreTier = "strong" | "moderate" | "weak" | "unscored";

export function getFitScoreTier(fitScore: number | null): FitScoreTier {
  if (fitScore === null) return "unscored";
  if (fitScore >= 75) return "strong";
  if (fitScore >= 50) return "moderate";
  return "weak";
}

export const FIT_SCORE_STYLES: Record<FitScoreTier, string> = {
  strong:
    "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-600 ring-1 ring-inset ring-emerald-500/25 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-300 dark:ring-emerald-400/20",
  moderate:
    "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/25 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-300 dark:ring-amber-400/20",
  weak:
    "bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-600 ring-1 ring-inset ring-rose-500/25 dark:from-rose-500/20 dark:to-pink-500/20 dark:text-rose-300 dark:ring-rose-400/20",
  unscored:
    "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
};
