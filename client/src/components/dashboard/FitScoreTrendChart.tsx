import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Application } from "../../types";
import { averageFitScorePerMonth } from "../../lib/chartData";
import { EmptyState } from "../ui/EmptyState";

interface Props {
  applications: Application[];
  isDark: boolean;
}

export function FitScoreTrendChart({ applications, isDark }: Props) {
  const data = averageFitScorePerMonth(applications);
  if (data.length === 0) return <EmptyState message="No analyzed applications yet" />;

  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: axisColor }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: axisColor }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, fontSize: 12 }}
          formatter={(value) => [`${value}%`, "Avg. Fit Score"]}
        />
        <Line
          type="monotone"
          dataKey="averageFitScore"
          name="Avg. Fit Score"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
