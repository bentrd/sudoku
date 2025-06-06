-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winnerId" INTEGER,
    "loserId" INTEGER,
    "timeTaken" INTEGER DEFAULT 0,
    CONSTRAINT "Match_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "gameId", "id", "loserId", "winnerId") SELECT "createdAt", "gameId", "id", "loserId", "winnerId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_MatchParticipant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "boardState" JSONB NOT NULL DEFAULT [],
    CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MatchParticipant" ("id", "matchId", "userId") SELECT "id", "matchId", "userId" FROM "MatchParticipant";
DROP TABLE "MatchParticipant";
ALTER TABLE "new_MatchParticipant" RENAME TO "MatchParticipant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
