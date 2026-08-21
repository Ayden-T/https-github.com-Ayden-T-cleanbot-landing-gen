import type { MediaWithLatest, RankMetric } from "@/lib/analytics";
import { RANK_METRIC_LABELS, engagementRate } from "@/lib/analytics";

function truncate(text: string | null, max = 70) {
  if (!text) return "(no caption)";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatWatchTime(ms: number | null) {
  if (ms == null) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function metricDisplay(item: MediaWithLatest, metric: RankMetric): string | null {
  const s = item.latest;
  if (!s) return null;
  switch (metric) {
    case "plays":
      return s.playsCount != null ? s.playsCount.toLocaleString() : null;
    case "reach":
      return s.reach != null ? s.reach.toLocaleString() : null;
    case "engagementRate": {
      const rate = engagementRate(item);
      return rate != null ? `${(rate * 100).toFixed(1)}%` : null;
    }
    case "likes":
      return s.likeCount != null ? s.likeCount.toLocaleString() : null;
    case "comments":
      return s.commentsCount != null ? s.commentsCount.toLocaleString() : null;
    case "shares":
      return s.sharesCount != null ? s.sharesCount.toLocaleString() : null;
    case "saved":
      return s.savedCount != null ? s.savedCount.toLocaleString() : null;
    case "watchTime":
      return formatWatchTime(s.avgWatchTimeMs);
  }
}

// Secondary context metrics shown alongside whichever one is currently
// sorted by (skipping it so it isn't repeated).
const SECONDARY_METRICS: RankMetric[] = ["reach", "engagementRate", "likes"];

export function MediaList({ items, metric }: { items: MediaWithLatest[]; metric: RankMetric }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No data yet — refresh to pull your latest posts.</p>;
  }

  const secondary = SECONDARY_METRICS.filter((m) => m !== metric).slice(0, 2);

  return (
    <ul className="flex flex-col divide-y divide-[var(--border)]">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center gap-3 py-3">
          <div className="w-5 shrink-0 text-center text-sm tabular-nums text-[var(--muted)]">{i + 1}</div>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--gridline)]">
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={item.permalink ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm text-[var(--foreground)] hover:underline"
            >
              {truncate(item.caption)}
            </a>
            <div className="mt-0.5 text-xs text-[var(--muted)]">
              {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              {" · "}
              {item.mediaProductType === "REELS" ? "Reel" : "Post"}
            </div>
          </div>
          <div className="flex shrink-0 gap-4 text-right text-sm tabular-nums">
            <Metric label={RANK_METRIC_LABELS[metric]} value={metricDisplay(item, metric)} emphasize />
            {secondary.map((m) => (
              <Metric key={m} label={RANK_METRIC_LABELS[m]} value={metricDisplay(item, m)} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value, emphasize }: { label: string; value: string | null; emphasize?: boolean }) {
  if (value == null) return null;
  return (
    <div>
      <div className={emphasize ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"}>
        {value}
      </div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
