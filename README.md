# Instagram Analytics

A personal dashboard for your Instagram account: follower growth, best
performing reels and posts, follower demographics, and content patterns
(best day to post, top hashtags, reels vs. posts). It connects directly to
your Instagram account via the official Instagram Graph API, and only
refreshes when you click **Refresh now** — every refresh is saved as a
snapshot, so the dashboard builds up history over time.

Everything runs locally: a Next.js app with a local SQLite database. Your
data never leaves your machine.

## What you'll see

- **Follower growth** over time, from your refresh history
- **Best performing reels and posts**, ranked by plays/reach
- **Reels vs. posts** comparison (average reach, average engagement rate)
- **Best day of the week to post**, based on your own engagement history
- **Top hashtags** by average engagement
- **Where your followers are** (country/city, from Instagram's audience
  demographics)

There's also a **"Preview with sample data"** button on the dashboard so you
can see the whole layout filled in before connecting a real account.

## Requirements

Instagram's real analytics (insights, demographics, reel performance) are
only available once your account is a **Business or Creator account**
(Instagram app → **Settings and privacy** → **Account type and tools** →
switch to **Professional account** → choose **Business** or **Creator**). A
linked Facebook Page is *not* required — this app uses Meta's direct
**Instagram API with Instagram Login**, not the older Facebook Login flow.

## One-time setup: create a Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
   and click **Create App**. Choose the **"Other"** use case, then app type
   **"Business"** — this matters, the Instagram product isn't available on
   **Consumer**-type apps.
2. In your new app's dashboard, click **Add Product** and set up
   **Instagram**.
3. In the Instagram product's setup page, under **"1. Instagram account"**,
   click **Add account** and connect the Instagram account you want to
   track (only accounts you add here can authorize the app while it's in
   Development mode).
4. Under **"3. Set up Instagram business login"**, click **Set up** and add
   this as the redirect URI. Note the **`https`** — Instagram's login
   product rejects plain `http://localhost` redirect URIs, which is why
   `npm run dev` (below) runs over HTTPS locally:
   ```
   https://localhost:3000/api/auth/instagram/callback
   ```
5. On that same setup screen, copy the **Instagram App ID** and **Instagram
   App Secret** — these are separate from the App ID/Secret shown at the top
   of the main dashboard, and are the ones this app needs.
6. Skip **"2. Configure webhooks"** and **"4. Complete app review"** — this
   app doesn't use webhooks, and App Review is only needed to let *other*
   people's accounts connect, not your own while in Development mode.

## Running it locally

```bash
npm install

cp .env.example .env
# then edit .env and fill in:
#   INSTAGRAM_APP_ID=<your Instagram App ID>
#   INSTAGRAM_APP_SECRET=<your Instagram App Secret>

npx prisma migrate deploy   # creates prisma/dev.db

npm run dev
```

Open [https://localhost:3000](https://localhost:3000) — your browser will
warn about the self-signed certificate ("Your connection isn't private" or
similar); click **Advanced → Proceed to localhost** to continue, this is
expected for local HTTPS dev. Then click **Connect Instagram** and
authorize the app through Instagram's own login dialog. Once connected,
click **Refresh now** to pull your first snapshot.

Click **Refresh now** any time afterwards to capture a new snapshot — that's
the only network activity this app ever does; nothing runs in the
background or on a schedule.

## How it works

- `src/lib/instagram.ts` — a thin client around the Instagram Graph API
  (OAuth token exchange, profile, account insights, follower demographics,
  media list, per-media insights).
- `src/app/api/auth/instagram/{start,callback}` — the OAuth connect flow.
- `src/app/api/refresh` — pulls current data from Instagram and writes a new
  `Snapshot` (+ `Media`/`MediaSnapshot` rows) to the local database.
- `src/app/api/data` — reads everything back out for the dashboard.
- `prisma/schema.prisma` — `Settings` (your connection/token),
  `Snapshot` (account stats at a point in time), `Media` (a post/reel),
  `MediaSnapshot` (that post/reel's stats at a point in time).
- `src/lib/analytics.ts` — pure functions that turn raw snapshots into the
  dashboard's derived views (best performing content, format comparison,
  weekday pattern, top hashtags).

## Notes and limitations

- Instagram doesn't expose a literal "how this follower found you" trail.
  "Where your followers are" here means geographic audience demographics
  (country/city), which is the closest first-party signal Instagram
  provides. It requires a large enough follower base for Meta to disclose a
  breakdown — small accounts may see this section stay empty.
- Access tokens are long-lived (~60 days) but do expire; if a refresh fails
  with an auth error, click **Disconnect** and **Connect Instagram** again.
- Stories are intentionally excluded (they expire after 24h and don't fit a
  historical dashboard).
