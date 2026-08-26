import type { Application } from "../../types";
import { weeklyMomentum } from "../../lib/chartData";
import { StatCard } from "./StatCard";

// Two stat cards, one Mon-Sun window each. Renders nothing if there's no application
// data at all yet; once there's at least one application, 0-for-a-week is a real (and
// useful) signal rather than a placeholder-worthy absence of data.
export function WeeklyMomentumCards({ applications }: { applications: Application[] }) {
  if (applications.length === 0) return null;

  const { thisWeek, lastWeek } = weeklyMomentum(applications);

  return (
    <>
      <StatCard label="Applications This Week" value={String(thisWeek)} />
      <StatCard label="Applications Last Week" value={String(lastWeek)} />
    </>
  );
}
