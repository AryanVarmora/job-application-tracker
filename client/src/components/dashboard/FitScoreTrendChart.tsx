import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Application } from "../../types";
import { averageFitScorePerMonth } from "../../lib/chartData";
import { EmptyState } from "../ui/EmptyState";
import { chartTooltipStyle } from "../../lib/chartTheme";

interface Props {
  applications: Application[];
  isDark: boolean;
}

export function FitScoreTrendChart({ applications, isDark }: Props) {
  const data = averageFitScorePerMonth(applications);
  if (data.length === 0) return <EmptyState message="No analyzed applications yet" />;

  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="fitScoreTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: axisColor }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: axisColor }} />
        <Tooltip
          contentStyle={chartTooltipStyle(isDark)}
          formatter={(value) => [`${value}%`, "Avg. Fit Score"]}
        />
        <Area
          type="monotone"
          dataKey="averageFitScore"
          name="Avg. Fit Score"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#fitScoreTrendFill)"
          dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
