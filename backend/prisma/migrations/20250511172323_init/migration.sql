-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "puzzle" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL
);
