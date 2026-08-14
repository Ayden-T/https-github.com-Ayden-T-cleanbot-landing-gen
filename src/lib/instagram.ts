// Thin client around the Instagram Graph API (Business/Creator accounts only).
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

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
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  // instagram_basic + instagram_manage_insights: read profile/media/insights.
  // pages_show_list + pages_read_engagement: required to resolve the Page
  // that the Instagram Business account is linked to.
  url.searchParams.set(
    "scope",
    [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ].join(","),
  );
  return url.toString();
}

interface ShortLivedTokenResponse {
  access_token: string;
  token_type: string;
}

export async function exchangeCodeForToken(
  appId: string,
  appSecret: string,
  redirectUri: string,
  code: string,
) {
  return graphGet<ShortLivedTokenResponse>("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds, ~60 days
}

export async function exchangeForLongLivedToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string,
) {
  return graphGet<LongLivedTokenResponse>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

interface PagesResponse {
  data: FacebookPage[];
}

// A personal account only has one or two Pages; take the first one that has
// an Instagram Business/Creator account linked to it.
export async function findLinkedInstagramAccount(userAccessToken: string) {
  const pages = await graphGet<PagesResponse>("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account",
    access_token: userAccessToken,
  });

  for (const page of pages.data) {
    if (page.instagram_business_account) {
      return {
        pageId: page.id,
        pageAccessToken: page.access_token,
        igUserId: page.instagram_business_account.id,
      };
    }
  }
  return null;
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

// Pulls up to `limit` most recent posts/reels (skips Stories, which expire
// after 24h and aren't meaningful for a historical dashboard).
export async function listRecentMedia(
  igUserId: string,
  accessToken: string,
  limit = 50,
): Promise<InstagramMediaItem[]> {
  const res = await graphGet<MediaListResponse>(`/${igUserId}/media`, {
    fields:
      "id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp,like_count,comments_count",
    limit: String(limit),
    access_token: accessToken,
  });
  return res.data.filter((m) => m.media_product_type !== "STORY");
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

// Metric availability differs by media type; request a type-appropriate set
// and fall back gracefully if a specific metric errors out.
export async function getMediaInsights(
  media: InstagramMediaItem,
  accessToken: string,
): Promise<MediaInsights> {
  const isReel = media.media_product_type === "REELS";
  const metrics = isReel
    ? ["reach", "likes", "comments", "shares", "saved", "plays", "total_interactions", "ig_reels_avg_watch_time"]
    : ["reach", "likes", "comments", "shares", "saved", "total_interactions"];

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
      metric: metrics.join(","),
      access_token: accessToken,
    });
    for (const item of res.data) {
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
        case "plays":
          result.playsCount = value;
          break;
        case "total_interactions":
          result.totalInteractions = value;
          break;
        case "ig_reels_avg_watch_time":
          result.avgWatchTimeMs = value;
          break;
      }
    }
  } catch {
    // Some accounts/media don't support the full metric set (e.g. an old
    // post from before the account was Business). Keep whatever defaults
    // we already had from the media list fields.
  }

  return result;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return String(Math.floor(d.getTime() / 1000));
}
