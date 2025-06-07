-- AlterTable
ALTER TABLE "Match" ADD COLUMN "loserEloAfter" INTEGER;
ALTER TABLE "Match" ADD COLUMN "loserEloBefore" INTEGER;
ALTER TABLE "Match" ADD COLUMN "winnerEloAfter" INTEGER;
ALTER TABLE "Match" ADD COLUMN "winnerEloBefore" INTEGER;
