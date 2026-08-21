"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SnapshotLike } from "@/lib/analytics";
import { sequential, chrome, type Mode } from "@/lib/palette";

export function FollowerGrowthChart({ snapshots, mode }: { snapshots: SnapshotLike[]; mode: Mode }) {
  const c = chrome[mode];
  const data = snapshots.map((s) => ({
    date: new Date(s.takenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    followers: s.followersCount,
  }));

  if (data.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
        Refresh at least twice to see follower growth over time.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={c.gridline} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={c.baseline}
          tick={{ fill: c.muted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: c.baseline }}
        />
        <YAxis
          stroke={c.baseline}
          tick={{ fill: c.muted, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
          domain={["dataMin - 20", "dataMax + 20"]}
        />
        <Tooltip
          contentStyle={{
            background: c.surface,
            border: `1px solid ${c.gridline}`,
            borderRadius: 8,
            fontSize: 13,
            color: c.textPrimary,
          }}
          labelStyle={{ color: c.textSecondary }}
          formatter={(value) => [Number(value).toLocaleString(), "Followers"]}
        />
        <Line
          type="monotone"
          dataKey="followers"
          stroke={sequential[mode]}
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
