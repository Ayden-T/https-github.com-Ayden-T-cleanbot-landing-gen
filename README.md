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
only available through the **Instagram Graph API**, which has two
requirements that the old "Instagram Basic Display" login doesn't:

1. Your Instagram account must be a **Business or Creator account**
   (Settings → Account type in the Instagram app).
2. It must be **linked to a Facebook Page** that you're an admin of.

If you haven't done this yet:

1. Open the Instagram app → **Settings and privacy** → **Account type and
   tools** → switch to **Professional account** → choose **Business** or
   **Creator**.
2. During that flow (or afterwards under **Settings → Account →
   Sharing to other apps → Facebook**), link the account to a Facebook
   Page. If you don't have a Page yet, you can create one for free at
   [facebook.com/pages/create](https://www.facebook.com/pages/create).

## One-time setup: create a Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
   and click **Create App**. Choose the **"Other"** use case, then app type
   **"Business"**.
2. In your new app's dashboard, click **Add Product** and set up
   **Instagram** (Instagram Graph API) and **Facebook Login**.
3. Under **App settings → Basic**, copy the **App ID** and **App Secret** —
   you'll need these below.
4. Under **Facebook Login → Settings**, add this to **Valid OAuth Redirect
   URIs**:
   ```
   http://localhost:3000/api/auth/instagram/callback
   ```
5. Under **App roles → Roles**, add your own Facebook account as an **Admin**
   (or **Tester**, while the app is in Development mode) so you're allowed
   to authorize it. While the app is in Development mode, only accounts
   added as Admin/Developer/Tester can connect — which is exactly what you
   want for a personal dashboard, so there's no need to submit it for App
   Review.

## Running it locally

```bash
npm install

cp .env.example .env
# then edit .env and fill in:
#   INSTAGRAM_APP_ID=<your App ID>
#   INSTAGRAM_APP_SECRET=<your App Secret>

npx prisma migrate deploy   # creates prisma/dev.db

npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Connect
Instagram**, and authorize the app. You'll be sent through Facebook's login
dialog (this is expected — the Instagram Graph API is accessed via your
linked Facebook Page). Once connected, click **Refresh now** to pull your
first snapshot.

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
