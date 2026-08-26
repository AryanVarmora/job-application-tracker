import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Application } from "../../types";
import { resumeVariantPerformance } from "../../lib/chartData";
import { EmptyState } from "../ui/EmptyState";
import { chartTooltipStyle } from "../../lib/chartTheme";

interface Props {
  applications: Application[];
  isDark: boolean;
}

const SERIES = [
  { key: "applied", name: "Applied", color: "#6366f1" },
  { key: "rejected", name: "Rejected", color: "#f43f5e" },
  { key: "responded", name: "Interviewing/Offer", color: "#10b981" },
] as const;

// One horizontal stacked bar per resume variant that's actually been used, so it's easy
// to eyeball which variant is landing more interviews/offers vs. getting rejected.
export function ResumeVariantPerformanceChart({ applications, isDark }: Props) {
  const data = resumeVariantPerformance(applications);
  if (data.length === 0) return <EmptyState message="No resume variants recorded yet" />;

  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const height = Math.max(120, data.length * 48);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: axisColor }} />
        <YAxis
          type="category"
          dataKey="variant"
          width={110}
          tick={{ fontSize: 12, fill: axisColor }}
        />
        <Tooltip contentStyle={chartTooltipStyle(isDark)} />
        <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
        {SERIES.map(({ key, name, color }, i) => (
          <Bar
            key={key}
            dataKey={key}
            name={name}
            stackId="variant"
            fill={color}
            radius={i === SERIES.length - 1 ? [0, 4, 4, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
