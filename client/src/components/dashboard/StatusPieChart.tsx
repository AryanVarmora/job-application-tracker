import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Application } from "../../types";
import { countByStatus, type StatusCount } from "../../lib/chartData";
import { STATUS_STYLES } from "../../lib/statusStyles";
import { EmptyState } from "../ui/EmptyState";
import { chartTooltipStyle } from "../../lib/chartTheme";

export function StatusPieChart({
  applications,
  isDark,
}: {
  applications: Application[];
  isDark: boolean;
}) {
  const data = countByStatus(applications);
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={4}
          cornerRadius={6}
          stroke={isDark ? "#020617" : "#ffffff"}
          strokeWidth={2}
          // Recharts' default Pie entrance animation never resolves in this app (StrictMode's
          // double-render appears to desync its internal animation state), leaving the slices
          // permanently uncommitted to the DOM — confirmed by inspecting the rendered SVG, which
          // had a sector <g> but zero <path> elements. Disabling the animation avoids that path
          // entirely; Line/Bar charts elsewhere aren't affected, only Pie's arc-growth animation.
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_STYLES[entry.status].chartColor} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={chartTooltipStyle(isDark)}
          formatter={(value, _name, item) => [
            value,
            STATUS_STYLES[(item.payload as StatusCount).status].label,
          ]}
        />
        <Legend
          formatter={(value: string) => STATUS_STYLES[value as Application["status"]]?.label ?? value}
          wrapperStyle={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
