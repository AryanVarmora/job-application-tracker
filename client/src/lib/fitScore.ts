export type FitScoreTier = "strong" | "moderate" | "weak" | "unscored";

export function getFitScoreTier(fitScore: number | null): FitScoreTier {
  if (fitScore === null) return "unscored";
  if (fitScore >= 75) return "strong";
  if (fitScore >= 50) return "moderate";
  return "weak";
}

export const FIT_SCORE_STYLES: Record<FitScoreTier, string> = {
  strong: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  weak: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  unscored: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
