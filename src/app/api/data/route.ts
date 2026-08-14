import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const settings = await db.settings.findUnique({ where: { id: 1 } });

  if (!settings?.igUserId) {
    return NextResponse.json({ connected: false });
  }

  const snapshots = await db.snapshot.findMany({
    orderBy: { takenAt: "asc" },
  });

  const media = await db.media.findMany({
    orderBy: { timestamp: "desc" },
    include: {
      snapshots: {
        orderBy: { id: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    connected: true,
    username: settings.username,
    connectedAt: settings.connectedAt,
    tokenExpiresAt: settings.tokenExpiresAt,
    snapshots,
    media: media.map((m) => ({
      id: m.id,
      mediaType: m.mediaType,
      mediaProductType: m.mediaProductType,
      caption: m.caption,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnailUrl,
      timestamp: m.timestamp,
      latest: m.snapshots[0] ?? null,
    })),
  });
}
