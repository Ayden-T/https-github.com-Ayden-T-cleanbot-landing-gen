"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { sequential, chrome, type Mode } from "@/lib/palette";

interface Point {
  label: string;
  avgEngagementRate: number | null;
  count: number;
}

export function WeekdayChart({ data, mode }: { data: Point[]; mode: Mode }) {
  const c = chrome[mode];
  const chartData = data.map((d) => ({ ...d, value: d.avgEngagementRate ?? 0 }));

  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--muted)]">
        Not enough post history yet to spot a weekday pattern.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={12}>
        <CartesianGrid stroke={c.gridline} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: c.baseline }} />
        <YAxis
          tick={{ fill: c.muted, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          cursor={{ fill: c.gridline }}
          contentStyle={{
            background: c.surface,
            border: `1px solid ${c.gridline}`,
            borderRadius: 8,
            fontSize: 13,
            color: c.textPrimary,
          }}
          formatter={(value, _name, item) => [
            `${(Number(value) * 100).toFixed(1)}% avg engagement (${item.payload.count} posts)`,
            "",
          ]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} fill={sequential[mode]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
