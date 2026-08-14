"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  RANK_METRIC_LABELS,
  bestPerforming,
  formatComparison,
  isReel,
  parseBreakdown,
  topEntries,
  topHashtags,
  weekdayPerformance,
  type MediaWithLatest,
  type RankMetric,
  type SnapshotLike,
} from "@/lib/analytics";
import { buildDemoData } from "@/lib/demoData";
import { StatCard } from "@/components/StatCard";
import { FollowerGrowthChart } from "@/components/FollowerGrowthChart";
import { FormatComparisonChart } from "@/components/FormatComparisonChart";
import { WeekdayChart } from "@/components/WeekdayChart";
import { HorizontalBarList } from "@/components/HorizontalBarList";
import { MediaList } from "@/components/MediaList";

interface ApiData {
  connected: boolean;
  username?: string | null;
  connectedAt?: string | null;
  tokenExpiresAt?: string | null;
  snapshots?: SnapshotLike[];
  media?: MediaWithLatest[];
}

function formatPercent(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function formatCompact(v: number) {
  return Math.round(v).toLocaleString();
}

const REEL_RANK_METRICS: RankMetric[] = [
  "plays",
  "watchTime",
  "reach",
  "engagementRate",
  "likes",
  "comments",
  "shares",
  "saved",
];
const POST_RANK_METRICS: RankMetric[] = ["reach", "engagementRate", "likes", "comments", "shares", "saved"];

function RankMetricSelect({
  value,
  options,
  onChange,
}: {
  value: RankMetric;
  options: RankMetric[];
  onChange: (metric: RankMetric) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RankMetric)}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-secondary)]"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          Sort by {RANK_METRIC_LABELS[m]}
        </option>
      ))}
    </select>
  );
}

export function Dashboard() {
  const mode = useColorScheme();
  const searchParams = useSearchParams();
  const connectError = searchParams.get("connect_error");

  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [reelsMetric, setReelsMetric] = useState<RankMetric>("plays");
  const [postsMetric, setPostsMetric] = useState<RankMetric>("reach");

  async function loadData() {
    const res = await fetch("/api/data", { cache: "no-store" });
    const json = (await res.json()) as ApiData;
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    // Intentional fetch-on-mount: this is a client-only dashboard with no
    // server-rendered data source to hydrate from.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setRefreshError(json.error ?? "Refresh failed.");
      } else {
        await loadData();
      }
    } catch {
      setRefreshError("Refresh failed. Check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/disconnect", { method: "POST" });
    await loadData();
  }

  const demo = useMemo(() => (demoMode ? buildDemoData() : null), [demoMode]);
  const snapshots = demo?.snapshots ?? data?.snapshots ?? [];
  const media = demo?.media ?? data?.media ?? [];
  const connected = demoMode || data?.connected;

  const latestSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots[snapshots.length - 2];

  const bestReels = bestPerforming(media, isReel, reelsMetric, 5);
  const bestPosts = bestPerforming(media, (m) => !isReel(m), postsMetric, 5);
  const formats = formatComparison(media);
  const weekday = weekdayPerformance(media);
  const hashtags = topHashtags(media, 8);
  const countries = latestSnapshot ? topEntries(parseBreakdown(latestSnapshot.followerCountryJson), 6) : [];
  const cities = latestSnapshot ? topEntries(parseBreakdown(latestSnapshot.followerCityJson), 6) : [];
  const ages = latestSnapshot ? topEntries(parseBreakdown(latestSnapshot.followerAgeJson), 8) : [];
  const genders = latestSnapshot ? topEntries(parseBreakdown(latestSnapshot.followerGenderJson), 4) : [];

  function followerDelta() {
    if (!latestSnapshot || !previousSnapshot) return null;
    const diff = latestSnapshot.followersCount - previousSnapshot.followersCount;
    if (diff === 0) return { value: "0", direction: "flat" as const };
    return {
      value: `${diff > 0 ? "+" : ""}${diff.toLocaleString()}`,
      direction: diff > 0 ? ("up" as const) : ("down" as const),
    };
  }

  if (loading) {
    return <div className="p-8 text-sm text-[var(--muted)]">Loading…</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Instagram Analytics</h1>
          <p className="text-sm text-[var(--muted)]">
            {demoMode
              ? "Previewing with sample data — connect your account to see real numbers."
              : connected
                ? `Connected as @${data?.username}${
                    latestSnapshot
                      ? ` · last refreshed ${new Date(latestSnapshot.takenAt).toLocaleString()}`
                      : ""
                  }`
                : "Not connected yet."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!demoMode && (
            <button
              onClick={() => setDemoMode(true)}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)]"
            >
              Preview with sample data
            </button>
          )}
          {demoMode && (
            <button
              onClick={() => setDemoMode(false)}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)]"
            >
              Exit preview
            </button>
          )}
          {!demoMode && connected && (
            <>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] disabled:opacity-50"
              >
                {refreshing ? "Refreshing…" : "Refresh now"}
              </button>
              <button
                onClick={handleDisconnect}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)]"
              >
                Disconnect
              </button>
            </>
          )}
          {!demoMode && !connected && (
            <a
              href="/api/auth/instagram/start"
              className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)]"
            >
              Connect Instagram
            </a>
          )}
        </div>
      </header>

      {connectError && (
        <div className="rounded-lg border border-[var(--critical)] bg-[var(--surface)] p-3 text-sm text-[var(--critical)]">
          Couldn&apos;t connect: {connectError}
        </div>
      )}
      {refreshError && (
        <div className="rounded-lg border border-[var(--critical)] bg-[var(--surface)] p-3 text-sm text-[var(--critical)]">
          {refreshError}
        </div>
      )}

      {!connected && !demoMode && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)]">
          <p className="mb-2 font-medium text-[var(--foreground)]">Connect your Instagram account to get started.</p>
          <p>
            This requires an Instagram Business or Creator account linked to a Facebook Page, and a Meta Developer
            App. See <span className="font-mono">README.md</span> for the one-time setup, then click{" "}
            <span className="font-medium">Connect Instagram</span> above.
          </p>
        </div>
      )}

      {connected && snapshots.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)]">
          Connected! Click <span className="font-medium">Refresh now</span> to pull your first snapshot.
        </div>
      )}

      {latestSnapshot && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Followers" value={latestSnapshot.followersCount.toLocaleString()} delta={followerDelta()} />
            <StatCard label="Following" value={latestSnapshot.followsCount.toLocaleString()} />
            <StatCard label="Posts" value={latestSnapshot.mediaCount.toLocaleString()} />
            <StatCard
              label="Reach (last 30d)"
              value={latestSnapshot.reach != null ? latestSnapshot.reach.toLocaleString() : "–"}
            />
            <StatCard
              label="Profile views (30d)"
              value={latestSnapshot.profileViews != null ? latestSnapshot.profileViews.toLocaleString() : "–"}
            />
            <StatCard
              label="Accounts engaged (30d)"
              value={latestSnapshot.accountsEngaged != null ? latestSnapshot.accountsEngaged.toLocaleString() : "–"}
            />
            <StatCard
              label="Website clicks (30d)"
              value={latestSnapshot.websiteClicks != null ? latestSnapshot.websiteClicks.toLocaleString() : "–"}
            />
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-lg font-medium">Follower growth</h2>
            <FollowerGrowthChart snapshots={snapshots} mode={mode} />
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Best performing reels</h2>
                <RankMetricSelect value={reelsMetric} options={REEL_RANK_METRICS} onChange={setReelsMetric} />
              </div>
              <MediaList items={bestReels} metric={reelsMetric} />
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Best performing posts</h2>
                <RankMetricSelect value={postsMetric} options={POST_RANK_METRICS} onChange={setPostsMetric} />
              </div>
              <MediaList items={bestPosts} metric={postsMetric} />
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="mb-1 text-lg font-medium">Reels vs. posts — avg. reach</h2>
              <p className="mb-2 text-xs text-[var(--muted)]">
                {formats.reels.count} reels · {formats.posts.count} posts tracked
              </p>
              <FormatComparisonChart
                postsValue={formats.posts.avgReach}
                reelsValue={formats.reels.avgReach}
                mode={mode}
                formatValue={formatCompact}
              />
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="mb-1 text-lg font-medium">Reels vs. posts — avg. engagement rate</h2>
              <p className="mb-2 text-xs text-[var(--muted)]">interactions ÷ reach</p>
              <FormatComparisonChart
                postsValue={formats.posts.avgEngagementRate}
                reelsValue={formats.reels.avgEngagementRate}
                mode={mode}
                formatValue={formatPercent}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-1 text-lg font-medium">Best day to post</h2>
            <p className="mb-2 text-xs text-[var(--muted)]">Average engagement rate by day of week</p>
            <WeekdayChart data={weekday} mode={mode} />
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-lg font-medium">Top hashtags by engagement</h2>
            <HorizontalBarList
              items={hashtags.map((h) => ({ label: h.tag, value: h.avgEngagementRate ?? 0, sublabel: `${h.count}×` }))}
              mode={mode}
              formatValue={formatPercent}
            />
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-1 text-lg font-medium">Follower demographics</h2>
            <p className="mb-4 text-xs text-[var(--muted)]">
              From Instagram&apos;s audience insights - requires enough followers for Meta to disclose a breakdown.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Country</h3>
                <HorizontalBarList items={countries} mode={mode} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">City</h3>
                <HorizontalBarList items={cities} mode={mode} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Age</h3>
                <HorizontalBarList items={ages} mode={mode} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Gender</h3>
                <HorizontalBarList items={genders} mode={mode} />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
