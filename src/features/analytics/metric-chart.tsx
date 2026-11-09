"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { formatNumber } from "./metrics";

export const chartColor = (i: number) => `var(--chart-${(i % 5) + 1})`;
const platformLabel = (p: string) => (isPlatformId(p) ? PLATFORMS[p].name : p);
const shortDate = (d: string) => {
  const dt = new Date(`${d}T00:00:00Z`);
  return dt.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
};

/**
 * One metric, one series per platform. Levels (followers) render as lines,
 * flows (impressions, likes…) as grouped bars. Gaps are left as gaps.
 */
export function MetricChart({
  points,
  platforms,
  isLevel,
  label,
}: {
  points: Record<string, string | number | null>[];
  platforms: string[];
  isLevel: boolean;
  label: string;
}) {
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} fontSize={12} minTickGap={24} stroke="var(--muted-foreground)" />
      <YAxis
        tickFormatter={(v: number) => formatNumber(v)}
        tickLine={false}
        axisLine={false}
        fontSize={12}
        width={48}
        stroke="var(--muted-foreground)"
        domain={isLevel ? ["auto", "auto"] : [0, "auto"]}
      />
      <Tooltip
        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        contentStyle={{
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--popover-foreground)",
          fontSize: 12,
        }}
        labelFormatter={(d) => shortDate(String(d))}
        formatter={(v, name) => [typeof v === "number" ? v.toLocaleString() : "—", platformLabel(String(name))]}
      />
      {platforms.length > 1 && <Legend formatter={(v) => platformLabel(String(v))} wrapperStyle={{ fontSize: 12 }} />}
    </>
  );

  return (
    <div className="h-72 w-full" role="img" aria-label={`${label} over time by platform`}>
      <ResponsiveContainer width="100%" height="100%">
        {isLevel ? (
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {common}
            {platforms.map((p, i) => (
              <Line key={p} type="monotone" dataKey={p} stroke={chartColor(i)} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        ) : (
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {common}
            {platforms.map((p, i) => (
              <Bar key={p} dataKey={p} fill={chartColor(i)} radius={[3, 3, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
