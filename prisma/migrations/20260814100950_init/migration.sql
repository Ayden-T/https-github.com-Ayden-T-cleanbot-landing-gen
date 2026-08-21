-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "igUserId" TEXT,
    "username" TEXT,
    "pageId" TEXT,
    "accessToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "connectedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followersCount" INTEGER NOT NULL,
    "followsCount" INTEGER NOT NULL,
    "mediaCount" INTEGER NOT NULL,
    "profileViews" INTEGER,
    "reach" INTEGER,
    "accountsEngaged" INTEGER,
    "websiteClicks" INTEGER,
    "followerCountryJson" TEXT,
    "followerCityJson" TEXT,
    "followerAgeJson" TEXT,
    "followerGenderJson" TEXT
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaType" TEXT NOT NULL,
    "mediaProductType" TEXT,
    "caption" TEXT,
    "permalink" TEXT,
    "thumbnailUrl" TEXT,
    "timestamp" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MediaSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaId" TEXT NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "likeCount" INTEGER,
    "commentsCount" INTEGER,
    "sharesCount" INTEGER,
    "savedCount" INTEGER,
    "reach" INTEGER,
    "playsCount" INTEGER,
    "avgWatchTimeMs" INTEGER,
    "totalInteractions" INTEGER,
    CONSTRAINT "MediaSnapshot_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Snapshot_takenAt_idx" ON "Snapshot"("takenAt");

-- CreateIndex
CREATE INDEX "Media_timestamp_idx" ON "Media"("timestamp");

-- CreateIndex
CREATE INDEX "MediaSnapshot_mediaId_idx" ON "MediaSnapshot"("mediaId");

-- CreateIndex
CREATE INDEX "MediaSnapshot_snapshotId_idx" ON "MediaSnapshot"("snapshotId");
