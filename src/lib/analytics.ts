export interface MediaSnapshotLike {
  likeCount: number | null;
  commentsCount: number | null;
  sharesCount: number | null;
  savedCount: number | null;
  reach: number | null;
  playsCount: number | null;
  avgWatchTimeMs: number | null;
  totalInteractions: number | null;
}

export interface MediaWithLatest {
  id: string;
  mediaType: string;
  mediaProductType: string | null;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  timestamp: string;
  latest: MediaSnapshotLike | null;
}

export interface SnapshotLike {
  id: number;
  takenAt: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profileViews: number | null;
  reach: number | null;
  accountsEngaged: number | null;
  websiteClicks: number | null;
  followerCountryJson: string | null;
  followerCityJson: string | null;
  followerAgeJson: string | null;
  followerGenderJson: string | null;
}

export function isReel(m: MediaWithLatest) {
  return m.mediaProductType === "REELS";
}

// interactions / reach, the standard proxy for "engagement rate" per post.
export function engagementRate(m: MediaWithLatest): number | null {
  const s = m.latest;
  if (!s) return null;
  const interactions =
    s.totalInteractions ?? (s.likeCount ?? 0) + (s.commentsCount ?? 0) + (s.sharesCount ?? 0) + (s.savedCount ?? 0);
  if (!s.reach || s.reach === 0) return null;
  return interactions / s.reach;
}

export type RankMetric =
  | "plays"
  | "reach"
  | "engagementRate"
  | "likes"
  | "comments"
  | "shares"
  | "saved"
  | "watchTime";

export const RANK_METRIC_LABELS: Record<RankMetric, string> = {
  plays: "Plays",
  reach: "Reach",
  engagementRate: "Engagement rate",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saved: "Saves",
  watchTime: "Avg. watch time",
};

export function rankValue(m: MediaWithLatest, metric: RankMetric): number {
  const s = m.latest;
  if (!s) return 0;
  switch (metric) {
    case "plays":
      return s.playsCount ?? 0;
    case "reach":
      return s.reach ?? 0;
    case "engagementRate":
      return engagementRate(m) ?? 0;
    case "likes":
      return s.likeCount ?? 0;
    case "comments":
      return s.commentsCount ?? 0;
    case "shares":
      return s.sharesCount ?? 0;
    case "saved":
      return s.savedCount ?? 0;
    case "watchTime":
      return s.avgWatchTimeMs ?? 0;
  }
}

export function bestPerforming(
  media: MediaWithLatest[],
  filter: (m: MediaWithLatest) => boolean,
  metric: RankMetric,
  take = 5,
) {
  return media
    .filter(filter)
    .filter((m) => m.latest)
    .sort((a, b) => rankValue(b, metric) - rankValue(a, metric))
    .slice(0, take);
}

export interface FormatStats {
  count: number;
  avgReach: number | null;
  avgEngagementRate: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function formatComparison(media: MediaWithLatest[]) {
  const compute = (filter: (m: MediaWithLatest) => boolean): FormatStats => {
    const items = media.filter(filter).filter((m) => m.latest);
    const reaches = items.map((m) => m.latest!.reach).filter((v): v is number => v != null);
    const rates = items.map(engagementRate).filter((v): v is number => v != null);
    return {
      count: items.length,
      avgReach: average(reaches),
      avgEngagementRate: average(rates),
    };
  };

  return {
    posts: compute((m) => !isReel(m)),
    reels: compute((m) => isReel(m)),
  };
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayPerformance(media: MediaWithLatest[]) {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const m of media) {
    const rate = engagementRate(m);
    if (rate == null) continue;
    const day = new Date(m.timestamp).getDay();
    buckets[day].push(rate);
  }
  return WEEKDAY_LABELS.map((label, i) => ({
    label,
    avgEngagementRate: average(buckets[i]),
    count: buckets[i].length,
  }));
}

export function extractHashtags(caption: string | null): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}

export interface HashtagStats {
  tag: string;
  count: number;
  avgEngagementRate: number | null;
}

export function topHashtags(media: MediaWithLatest[], take = 8): HashtagStats[] {
  const byTag = new Map<string, number[]>();
  for (const m of media) {
    const rate = engagementRate(m);
    if (rate == null) continue;
    for (const tag of extractHashtags(m.caption)) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(rate);
    }
  }
  return Array.from(byTag.entries())
    .map(([tag, rates]) => ({ tag, count: rates.length, avgEngagementRate: average(rates) }))
    .filter((t) => t.count >= 2)
    .sort((a, b) => (b.avgEngagementRate ?? 0) - (a.avgEngagementRate ?? 0))
    .slice(0, take);
}

export function parseBreakdown(json: string | null): Record<string, number> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function topEntries(breakdown: Record<string, number> | null, take = 6) {
  if (!breakdown) return [];
  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([label, value]) => ({ label, value }));
}
