import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  await db.settings.deleteMany({ where: { id: 1 } });
  return NextResponse.json({ ok: true });
}
