import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Application } from "../../types";
import { fitScoreDistribution } from "../../lib/chartData";
import { EmptyState } from "../ui/EmptyState";
import { chartTooltipStyle } from "../../lib/chartTheme";

interface Props {
  applications: Application[];
  isDark: boolean;
}

export function FitScoreDistributionChart({ applications, isDark }: Props) {
  const data = fitScoreDistribution(applications);
  if (data.every((d) => d.count === 0)) return <EmptyState message="No analyzed applications yet" />;

  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: axisColor }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: axisColor }} />
        <Tooltip
          contentStyle={chartTooltipStyle(isDark)}
          formatter={(value) => [value, "Applications"]}
        />
        <Bar dataKey="count" name="Applications" fill="#10b981" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
