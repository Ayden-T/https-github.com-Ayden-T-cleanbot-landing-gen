"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourlyPoint } from "@/lib/analytics";
import { sequential, chrome, type Mode } from "@/lib/palette";

export function OnlineFollowersChart({ data, mode }: { data: HourlyPoint[]; mode: Mode }) {
  const c = chrome[mode];
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--muted)]">
        Not enough audience data yet - refresh again after your account has more activity.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={c.gridline} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: c.muted, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: c.baseline }}
          interval={2}
        />
        <YAxis tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: c.gridline }}
          contentStyle={{
            background: c.surface,
            border: `1px solid ${c.gridline}`,
            borderRadius: 8,
            fontSize: 13,
            color: c.textPrimary,
          }}
          formatter={(value) => [`${Number(value).toLocaleString()} followers online`, ""]}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} fill={sequential[mode]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
