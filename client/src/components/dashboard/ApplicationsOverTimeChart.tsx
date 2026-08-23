import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Application } from "../../types";
import { applicationsPerMonth } from "../../lib/chartData";
import { EmptyState } from "../ui/EmptyState";

interface Props {
  applications: Application[];
  isDark: boolean;
}

export function ApplicationsOverTimeChart({ applications, isDark }: Props) {
  const data = applicationsPerMonth(applications);
  if (data.length === 0) return <EmptyState />;

  // Recharts renders raw SVG, which Tailwind's `dark:` variant can't reach, so theme
  // colors are computed here and passed in as plain hex values instead.
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: axisColor }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: axisColor }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, fontSize: 12 }}
          formatter={(value) => [value, "Applications"]}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Applications"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
