import type { Application } from "../../types";
import { ApplicationsOverTimeChart } from "./ApplicationsOverTimeChart";
import { StatusPieChart } from "./StatusPieChart";
import { FitScoreTrendChart } from "./FitScoreTrendChart";
import { ResumeVariantPerformanceChart } from "./ResumeVariantPerformanceChart";
import { WeekdayApplicationsChart } from "./WeekdayApplicationsChart";
import { FitScoreDistributionChart } from "./FitScoreDistributionChart";
import { WeeklyMomentumCards } from "./WeeklyMomentumCards";
import { TimeToRejectionCard } from "./TimeToRejectionCard";
import { glassPanel } from "../../lib/uiStyles";

interface Props {
  applications: Application[];
  isDark: boolean;
}

const cardClasses = `${glassPanel} p-5 transition-shadow duration-200 hover:shadow-md`;
const titleClasses = "mb-4 text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200";

export function Dashboard({ applications, isDark }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <WeeklyMomentumCards applications={applications} />
        <TimeToRejectionCard applications={applications} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${cardClasses} lg:col-span-2`}>
          <h2 className={titleClasses}>Applications Over Time</h2>
          <ApplicationsOverTimeChart applications={applications} isDark={isDark} />
        </div>
        <div className={cardClasses}>
          <h2 className={titleClasses}>Response Rate by Status</h2>
          <StatusPieChart applications={applications} isDark={isDark} />
        </div>
        <div className={cardClasses}>
          <h2 className={titleClasses}>Average Fit Score Trend</h2>
          <FitScoreTrendChart applications={applications} isDark={isDark} />
        </div>

        <div className={`${cardClasses} lg:col-span-2`}>
          <h2 className={titleClasses}>Resume Variant Performance</h2>
          <ResumeVariantPerformanceChart applications={applications} isDark={isDark} />
        </div>
        <div className={cardClasses}>
          <h2 className={titleClasses}>Applications by Weekday</h2>
          <WeekdayApplicationsChart applications={applications} isDark={isDark} />
        </div>
        <div className={cardClasses}>
          <h2 className={titleClasses}>Fit Score Distribution</h2>
          <FitScoreDistributionChart applications={applications} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}
