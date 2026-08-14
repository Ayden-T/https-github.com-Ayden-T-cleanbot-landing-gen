// Thin client around the Instagram API with Instagram Login (Business/Creator
// accounts only). This is Meta's direct-Instagram OAuth product - no Facebook
// Page or Facebook Login is involved.
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

async function graphGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  const body = await res.json();
  if (!res.ok) {
    const message = body?.error?.message ?? `Graph API request failed (${res.status})`;
    throw new InstagramApiError(message, res.status, body);
  }
  return body as T;
}

export function getOAuthDialogUrl(appId: string, redirectUri: string, state: string) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  // instagram_business_basic: read profile/media.
  // instagram_business_manage_insights: read account + media insights.
  url.searchParams.set(
    "scope",
    ["instagram_business_basic", "instagram_business_manage_insights"].join(","),
  );
  return url.toString();
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
  permissions: string[];
}

// Instagram Login's initial code exchange lives on a different host
// (api.instagram.com) and is a POST with a form body, unlike everything
// else in this file.
export async function exchangeCodeForToken(
  appId: string,
  appSecret: string,
  redirectUri: string,
  code: string,
) {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    const message = json?.error_message ?? json?.error?.message ?? `Token exchange failed (${res.status})`;
    throw new InstagramApiError(message, res.status, json);
  }
  return json as ShortLivedTokenResponse;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds, ~60 days
}

export async function exchangeForLongLivedToken(appSecret: string, shortLivedToken: string) {
  return graphGet<LongLivedTokenResponse>("/access_token", {
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });
}

export interface InstagramProfile {
  id: string;
  username: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url?: string;
}

export async function getProfile(igUserId: string, accessToken: string) {
  return graphGet<InstagramProfile>(`/${igUserId}`, {
    fields: "id,username,followers_count,follows_count,media_count,profile_picture_url",
    access_token: accessToken,
  });
}

interface InsightValue {
  name: string;
  period: string;
  values: { value: number }[];
}
interface InsightsResponse {
  data: InsightValue[];
}

export interface AccountInsights {
  reach: number | null;
  profileViews: number | null;
  accountsEngaged: number | null;
  websiteClicks: number | null;
}

// Account-level rolling metrics over the last 30 days. Individual metrics
// are requested one call at a time so one unsupported metric (e.g. an
// account too small for a given breakdown) doesn't fail the whole batch.
export async function getAccountInsights(
  igUserId: string,
  accessToken: string,
): Promise<AccountInsights> {
  const metrics = ["reach", "profile_views", "accounts_engaged", "website_clicks"] as const;
  const result: AccountInsights = {
    reach: null,
    profileViews: null,
    accountsEngaged: null,
    websiteClicks: null,
  };
  const keyByMetric: Record<(typeof metrics)[number], keyof AccountInsights> = {
    reach: "reach",
    profile_views: "profileViews",
    accounts_engaged: "accountsEngaged",
    website_clicks: "websiteClicks",
  };

  await Promise.all(
    metrics.map(async (metric) => {
      try {
        const res = await graphGet<InsightsResponse>(`/${igUserId}/insights`, {
          metric,
          period: "day",
          metric_type: "total_value",
          since: daysAgo(30),
          until: daysAgo(0),
          access_token: accessToken,
        });
        const total = res.data[0]?.values?.reduce((sum, v) => sum + (v.value ?? 0), 0) ?? null;
        result[keyByMetric[metric]] = total;
      } catch {
        // Metric unavailable for this account (e.g. too few followers) - skip it.
      }
    }),
  );

  return result;
}

export type FollowerBreakdownDimension = "city" | "country" | "age" | "gender";

// Follower demographics ("where your followers come from"). Requires the
// account to have enough followers for Meta to disclose a breakdown.
export async function getFollowerBreakdown(
  igUserId: string,
  accessToken: string,
  breakdown: FollowerBreakdownDimension,
): Promise<Record<string, number> | null> {
  try {
    interface DemographicsResponse {
      data: {
        total_value: {
          breakdowns: { results: { dimension_values: string[]; value: number }[] }[];
        };
      }[];
    }
    const res = await graphGet<DemographicsResponse>(`/${igUserId}/insights`, {
      metric: "follower_demographics",
      period: "lifetime",
      metric_type: "total_value",
      timeframe: "last_30_days",
      breakdown,
      access_token: accessToken,
    });
    const results = res.data[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    const out: Record<string, number> = {};
    for (const r of results) {
      out[r.dimension_values.join(", ")] = r.value;
    }
    return out;
  } catch {
    return null;
  }
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: "FEED" | "REELS" | "STORY" | "AD";
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface MediaListResponse {
  data: InstagramMediaItem[];
  paging?: { next?: string };
}

// Walks every page of the account's media history (skips Stories, which
// expire after 24h and aren't meaningful for a historical dashboard).
// `maxItems` is a safety ceiling, not a normal limit - it only kicks in for
// unusually large accounts so a refresh can't run away indefinitely.
export async function listRecentMedia(
  igUserId: string,
  accessToken: string,
  maxItems = 2000,
): Promise<InstagramMediaItem[]> {
  const first = new URL(`${GRAPH_BASE}/${igUserId}/media`);
  first.searchParams.set(
    "fields",
    "id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp,like_count,comments_count",
  );
  first.searchParams.set("limit", "50");
  first.searchParams.set("access_token", accessToken);

  const results: InstagramMediaItem[] = [];
  let nextUrl: string | undefined = first.toString();

  while (nextUrl && results.length < maxItems) {
    const res = await fetch(nextUrl);
    const body = await res.json();
    if (!res.ok) {
      const message = body?.error?.message ?? `Graph API request failed (${res.status})`;
      throw new InstagramApiError(message, res.status, body);
    }
    const page = body as MediaListResponse;
    results.push(...page.data);
    nextUrl = page.paging?.next;
  }

  return results.slice(0, maxItems).filter((m) => m.media_product_type !== "STORY");
}

export interface MediaInsights {
  reach: number | null;
  likeCount: number | null;
  commentsCount: number | null;
  sharesCount: number | null;
  savedCount: number | null;
  playsCount: number | null;
  avgWatchTimeMs: number | null;
  totalInteractions: number | null;
}

// Core engagement metrics have stable names across API versions and apply
// to both feed posts and reels - always request these on their own so a
// naming problem elsewhere can't null them all out.
const CORE_METRICS = ["reach", "likes", "comments", "shares", "saved", "total_interactions"] as const;

// Reels-only view/watch-time metrics have been renamed across Graph API
// versions (plays -> views, ig_reels_avg_watch_time -> avg_watch_time).
// Try the current names first, then fall back to the older ones, so a
// rename doesn't silently zero out ranking data.
const REEL_METRIC_ATTEMPTS: readonly [playsMetric: string, watchMetric: string][] = [
  ["views", "avg_watch_time"],
  ["plays", "ig_reels_avg_watch_time"],
];

function applyInsightValues(result: MediaInsights, data: InsightValue[]) {
  for (const item of data) {
    const value = item.values?.[0]?.value ?? null;
    switch (item.name) {
      case "reach":
        result.reach = value;
        break;
      case "likes":
        result.likeCount = value;
        break;
      case "comments":
        result.commentsCount = value;
        break;
      case "shares":
        result.sharesCount = value;
        break;
      case "saved":
        result.savedCount = value;
        break;
      case "total_interactions":
        result.totalInteractions = value;
        break;
      case "plays":
      case "views":
        result.playsCount = value;
        break;
      case "ig_reels_avg_watch_time":
      case "avg_watch_time":
        result.avgWatchTimeMs = value;
        break;
    }
  }
}

// Metric availability and naming differ by media type and API version;
// requests are split so one unsupported/renamed metric can't null out
// everything else for that post.
export async function getMediaInsights(
  media: InstagramMediaItem,
  accessToken: string,
): Promise<MediaInsights> {
  const isReel = media.media_product_type === "REELS";

  const result: MediaInsights = {
    reach: null,
    likeCount: media.like_count ?? null,
    commentsCount: media.comments_count ?? null,
    sharesCount: null,
    savedCount: null,
    playsCount: null,
    avgWatchTimeMs: null,
    totalInteractions: null,
  };

  try {
    const res = await graphGet<InsightsResponse>(`/${media.id}/insights`, {
      metric: CORE_METRICS.join(","),
      access_token: accessToken,
    });
    applyInsightValues(result, res.data);
  } catch {
    // Some media don't support the full core set (e.g. an old post from
    // before the account was Business). Keep whatever defaults we already
    // had from the media list fields.
  }

  if (isReel) {
    for (const [playsMetric, watchMetric] of REEL_METRIC_ATTEMPTS) {
      try {
        const res = await graphGet<InsightsResponse>(`/${media.id}/insights`, {
          metric: `${playsMetric},${watchMetric}`,
          access_token: accessToken,
        });
        applyInsightValues(result, res.data);
        break;
      } catch {
        // Try the next metric-name generation.
      }
    }
  }

  return result;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return String(Math.floor(d.getTime() / 1000));
}
