"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categorical, chrome, type Mode } from "@/lib/palette";

interface Props {
  postsValue: number | null;
  reelsValue: number | null;
  mode: Mode;
  formatValue: (v: number) => string;
}

export function FormatComparisonChart({ postsValue, reelsValue, mode, formatValue }: Props) {
  const c = chrome[mode];
  const cat = categorical[mode];
  const data = [
    { label: "Posts", value: postsValue ?? 0, color: cat.posts },
    { label: "Reels", value: reelsValue ?? 0, color: cat.reels },
  ];

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap={10}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={56}
          tick={{ fill: c.textSecondary, fontSize: 13 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{
            background: c.surface,
            border: `1px solid ${c.gridline}`,
            borderRadius: 8,
            fontSize: 13,
            color: c.textPrimary,
          }}
          formatter={(value) => [formatValue(Number(value)), ""]}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
          label={{ position: "right", fill: c.textPrimary, fontSize: 13, formatter: (v: unknown) => formatValue(Number(v)) }}
        >
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
