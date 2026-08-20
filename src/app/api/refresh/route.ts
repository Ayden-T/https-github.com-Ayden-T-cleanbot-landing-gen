import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapLimit } from "@/lib/concurrency";
import {
  getAccountInsights,
  getFollowerBreakdown,
  getMediaInsights,
  getOnlineFollowers,
  getProfile,
  InstagramApiError,
  listRecentMedia,
} from "@/lib/instagram";

export async function POST() {
  const settings = await db.settings.findUnique({ where: { id: 1 } });
  if (!settings?.accessToken || !settings.igUserId) {
    return NextResponse.json(
      { error: "Instagram account isn't connected yet." },
      { status: 400 },
    );
  }
  if (settings.tokenExpiresAt && settings.tokenExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "Your connection expired. Please reconnect your Instagram account." },
      { status: 401 },
    );
  }

  const { igUserId, accessToken } = settings;

  try {
    const [profile, accountInsights, country, city, age, gender, onlineFollowers] = await Promise.all([
      getProfile(igUserId, accessToken),
      getAccountInsights(igUserId, accessToken),
      getFollowerBreakdown(igUserId, accessToken, "country"),
      getFollowerBreakdown(igUserId, accessToken, "city"),
      getFollowerBreakdown(igUserId, accessToken, "age"),
      getFollowerBreakdown(igUserId, accessToken, "gender"),
      getOnlineFollowers(igUserId, accessToken),
    ]);

    const snapshot = await db.snapshot.create({
      data: {
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        mediaCount: profile.media_count,
        profileViews: accountInsights.profileViews,
        reach: accountInsights.reach,
        accountsEngaged: accountInsights.accountsEngaged,
        websiteClicks: accountInsights.websiteClicks,
        followerCountryJson: country ? JSON.stringify(country) : null,
        followerCityJson: city ? JSON.stringify(city) : null,
        followerAgeJson: age ? JSON.stringify(age) : null,
        followerGenderJson: gender ? JSON.stringify(gender) : null,
        onlineFollowersJson: onlineFollowers ? JSON.stringify(onlineFollowers) : null,
      },
    });

    const media = await listRecentMedia(igUserId, accessToken);

    await mapLimit(media, 5, async (item) => {
      await db.media.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          mediaType: item.media_type,
          mediaProductType: item.media_product_type ?? null,
          caption: item.caption ?? null,
          permalink: item.permalink ?? null,
          thumbnailUrl: item.thumbnail_url ?? null,
          timestamp: new Date(item.timestamp),
        },
        update: {
          caption: item.caption ?? null,
          thumbnailUrl: item.thumbnail_url ?? null,
        },
      });

      const insights = await getMediaInsights(item, accessToken);
      await db.mediaSnapshot.create({
        data: {
          mediaId: item.id,
          snapshotId: snapshot.id,
          likeCount: insights.likeCount,
          commentsCount: insights.commentsCount,
          sharesCount: insights.sharesCount,
          savedCount: insights.savedCount,
          reach: insights.reach,
          playsCount: insights.playsCount,
          avgWatchTimeMs: insights.avgWatchTimeMs,
          totalInteractions: insights.totalInteractions,
        },
      });
    });

    await db.settings.update({
      where: { id: 1 },
      data: { username: profile.username },
    });

    return NextResponse.json({ ok: true, snapshotId: snapshot.id, mediaRefreshed: media.length });
  } catch (err) {
    const message =
      err instanceof InstagramApiError ? err.message : "Failed to refresh data from Instagram.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
