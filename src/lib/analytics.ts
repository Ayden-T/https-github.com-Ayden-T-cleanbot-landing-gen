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
  onlineFollowersJson: string | null;
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

const countryDisplayNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

// Instagram's follower_demographics "country" breakdown uses ISO 3166-1
// alpha-2 codes (e.g. "US"). Expand those to full names for display;
// anything that isn't a 2-letter code (e.g. demo data) passes through as-is.
export function countryLabel(code: string): string {
  if (!countryDisplayNames || !/^[A-Za-z]{2}$/.test(code)) return code;
  try {
    return countryDisplayNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export interface HourlyPoint {
  hour: number;
  label: string;
  value: number;
}

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

// Fills in all 24 hours (account's local time) in chronological order, so
// gaps read as zero rather than being skipped.
export function onlineFollowersSeries(json: string | null): HourlyPoint[] {
  const breakdown = parseBreakdown(json);
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHour(hour),
    value: breakdown?.[String(hour)] ?? 0,
  }));
}

export interface PostingFrequencyPoint {
  fromDate: string;
  toDate: string;
  postsCount: number;
  followerDelta: number;
}

// Pairs each refresh interval (between two consecutive snapshots) with how
// many posts/reels went out in that window and how followers changed over
// it - a table rather than a chart, since post counts and follower deltas
// are different units and don't belong on one axis together.
export function postingFrequencyVsGrowth(
  snapshots: SnapshotLike[],
  media: MediaWithLatest[],
  take = 12,
): PostingFrequencyPoint[] {
  const points: PostingFrequencyPoint[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const from = snapshots[i - 1];
    const to = snapshots[i];
    const fromTime = new Date(from.takenAt).getTime();
    const toTime = new Date(to.takenAt).getTime();
    const postsCount = media.filter((m) => {
      const t = new Date(m.timestamp).getTime();
      return t > fromTime && t <= toTime;
    }).length;
    points.push({
      fromDate: from.takenAt,
      toDate: to.takenAt,
      postsCount,
      followerDelta: to.followersCount - from.followersCount,
    });
  }
  return points.reverse().slice(0, take);
}
