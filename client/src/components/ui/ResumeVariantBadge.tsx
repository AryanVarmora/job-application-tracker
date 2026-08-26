import { Badge } from "./Badge";

// Sky/cyan on purpose - distinct from both the status colors (indigo/amber/rose/emerald)
// and the fit-score tiers (emerald/amber/rose/slate), so it reads as its own category.
const RESUME_VARIANT_BADGE_STYLE =
  "bg-gradient-to-r from-sky-500/15 to-cyan-500/15 text-sky-600 ring-1 ring-inset ring-sky-500/25 dark:from-sky-500/20 dark:to-cyan-500/20 dark:text-sky-300 dark:ring-sky-400/20";

export function ResumeVariantBadge({ variant }: { variant: string }) {
  return <Badge className={RESUME_VARIANT_BADGE_STYLE}>{variant}</Badge>;
}
