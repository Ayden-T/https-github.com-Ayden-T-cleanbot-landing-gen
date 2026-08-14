import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getInstagramAppConfig } from "@/lib/env";
import { getOAuthDialogUrl } from "@/lib/instagram";

export async function GET() {
  const config = getInstagramAppConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Missing INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / INSTAGRAM_REDIRECT_URI. See README.md.",
      },
      { status: 500 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const dialogUrl = getOAuthDialogUrl(config.appId, config.redirectUri, state);

  const response = NextResponse.redirect(dialogUrl);
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
