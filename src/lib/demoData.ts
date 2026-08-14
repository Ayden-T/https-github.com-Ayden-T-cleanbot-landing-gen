import type { MediaWithLatest, SnapshotLike } from "@/lib/analytics";

// Illustrative-only data so the dashboard layout can be previewed before an
// Instagram account is connected. Never written to the database.
export function buildDemoData(): { snapshots: SnapshotLike[]; media: MediaWithLatest[] } {
  const now = Date.now();
  const day = 86_400_000;

  const snapshots: SnapshotLike[] = Array.from({ length: 12 }, (_, i) => {
    const followers = 4200 + i * 65 + Math.round(Math.sin(i) * 20);
    return {
      id: i + 1,
      takenAt: new Date(now - (11 - i) * 3 * day).toISOString(),
      followersCount: followers,
      followsCount: 310,
      mediaCount: 148 + i,
      profileViews: 900 + i * 30,
      reach: 18000 + i * 400,
      accountsEngaged: 2200 + i * 60,
      websiteClicks: 40 + i,
      followerCountryJson: JSON.stringify({
        "United States": 1800 + i * 10,
        "United Kingdom": 640,
        Canada: 410,
        Australia: 300,
        Germany: 210,
        India: 190,
      }),
      followerCityJson: JSON.stringify({
        "Los Angeles, CA": 320,
        "New York, NY": 290,
        "London, England": 260,
        "Toronto, ON": 150,
        "Austin, TX": 120,
      }),
      followerAgeJson: JSON.stringify({
        "18-24": 1450,
        "25-34": 1900,
        "35-44": 620,
        "45-54": 210,
        "13-17": 90,
      }),
      followerGenderJson: JSON.stringify({ Female: 2600, Male: 1550, Unknown: 50 }),
    };
  });

  const captions = [
    "Behind the scenes of today's shoot #bts #process",
    "3 tips nobody tells you about starting out #tips #smallbusiness",
    "New reel dropped 🎬 #reels #trending",
    "Q&A with the community #qanda #community",
    "Weekend recap #weekend #vlog",
    "This changed how I work #productivity #tips",
    "Client spotlight ✨ #clientlove #smallbusiness",
    "A day in the life #dayinthelife #bts",
  ];

  const media: MediaWithLatest[] = Array.from({ length: 24 }, (_, i) => {
    const isReel = i % 3 !== 0;
    const timestamp = new Date(now - i * 2 * day - (i % 7) * 3_600_000);
    const reach = Math.round((isReel ? 9000 : 4000) + Math.random() * 6000);
    const likes = Math.round(reach * (0.04 + Math.random() * 0.05));
    const comments = Math.round(likes * 0.05);
    const shares = Math.round(likes * (isReel ? 0.08 : 0.02));
    const saved = Math.round(likes * 0.1);
    return {
      id: `demo-${i}`,
      mediaType: isReel ? "VIDEO" : i % 2 === 0 ? "IMAGE" : "CAROUSEL_ALBUM",
      mediaProductType: isReel ? "REELS" : "FEED",
      caption: captions[i % captions.length],
      permalink: "https://instagram.com",
      thumbnailUrl: null,
      timestamp: timestamp.toISOString(),
      latest: {
        likeCount: likes,
        commentsCount: comments,
        sharesCount: shares,
        savedCount: saved,
        reach,
        playsCount: isReel ? Math.round(reach * 1.3) : null,
        avgWatchTimeMs: isReel ? Math.round(4000 + Math.random() * 6000) : null,
        totalInteractions: likes + comments + shares + saved,
      },
    };
  });

  return { snapshots, media };
}
