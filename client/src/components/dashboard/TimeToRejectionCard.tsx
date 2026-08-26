import type { Application } from "../../types";
import { averageDaysToRejection } from "../../lib/chartData";
import { StatCard } from "./StatCard";

// Renders nothing at all (not even an empty-state placeholder) until there's at least
// one rejection to average - an average of zero rejections would just be a misleading 0.
export function TimeToRejectionCard({ applications }: { applications: Application[] }) {
  const average = averageDaysToRejection(applications);
  if (average === null) return null;

  return <StatCard label="Avg. Time to Rejection" value={`${average.toFixed(1)} days`} />;
}
