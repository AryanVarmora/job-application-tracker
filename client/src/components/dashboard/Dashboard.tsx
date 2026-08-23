import type { Application } from "../../types";
import { ApplicationsOverTimeChart } from "./ApplicationsOverTimeChart";
import { StatusPieChart } from "./StatusPieChart";
import { FitScoreTrendChart } from "./FitScoreTrendChart";

interface Props {
  applications: Application[];
  isDark: boolean;
}

const cardClasses =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900";
const titleClasses = "mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200";

export function Dashboard({ applications, isDark }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className={`${cardClasses} lg:col-span-2`}>
        <h2 className={titleClasses}>Applications Over Time</h2>
        <ApplicationsOverTimeChart applications={applications} isDark={isDark} />
      </div>
      <div className={cardClasses}>
        <h2 className={titleClasses}>Response Rate by Status</h2>
        <StatusPieChart applications={applications} />
      </div>
      <div className={cardClasses}>
        <h2 className={titleClasses}>Average Fit Score Trend</h2>
        <FitScoreTrendChart applications={applications} isDark={isDark} />
      </div>
    </div>
  );
}
