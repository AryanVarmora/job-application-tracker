import { FIT_SCORE_STYLES, getFitScoreTier } from "../../lib/fitScore";
import { Badge } from "./Badge";

export function FitScoreBadge({ fitScore }: { fitScore: number | null }) {
  const tier = getFitScoreTier(fitScore);
  return (
    <Badge className={FIT_SCORE_STYLES[tier]}>
      {fitScore === null ? "Not analyzed" : `${fitScore}% fit`}
    </Badge>
  );
}
