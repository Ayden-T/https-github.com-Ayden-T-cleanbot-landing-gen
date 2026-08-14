import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getInstagramAppConfig } from "@/lib/env";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  findLinkedInstagramAccount,
  getProfile,
  InstagramApiError,
} from "@/lib/instagram";

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("connect_error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const config = getInstagramAppConfig();
  if (!config) {
    return redirectWithError(request, "Server is missing Instagram app credentials.");
  }

  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  if (error) {
    return redirectWithError(request, error);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("ig_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(request, "Invalid or expired login attempt. Please try again.");
  }

  try {
    const shortLived = await exchangeCodeForToken(
      config.appId,
      config.appSecret,
      config.redirectUri,
      code,
    );
    const longLived = await exchangeForLongLivedToken(
      config.appId,
      config.appSecret,
      shortLived.access_token,
    );

    const linked = await findLinkedInstagramAccount(longLived.access_token);
    if (!linked) {
      return redirectWithError(
        request,
        "No Instagram Business/Creator account linked to any of your Facebook Pages was found.",
      );
    }

    const profile = await getProfile(linked.igUserId, linked.pageAccessToken);

    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);
    await db.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        igUserId: linked.igUserId,
        username: profile.username,
        pageId: linked.pageId,
        accessToken: linked.pageAccessToken,
        tokenExpiresAt: expiresAt,
        connectedAt: new Date(),
      },
      update: {
        igUserId: linked.igUserId,
        username: profile.username,
        pageId: linked.pageId,
        accessToken: linked.pageAccessToken,
        tokenExpiresAt: expiresAt,
        connectedAt: new Date(),
      },
    });

    const response = NextResponse.redirect(new URL("/?connected=1", request.url));
    response.cookies.delete("ig_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof InstagramApiError ? err.message : "Failed to connect Instagram account.";
    return redirectWithError(request, message);
  }
}
