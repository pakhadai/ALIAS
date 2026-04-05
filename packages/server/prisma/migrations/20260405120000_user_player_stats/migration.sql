-- AlterTable
ALTER TABLE "User" ADD COLUMN "statsGamesPlayed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "statsWordsGuessed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "statsWordsSkipped" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "statsLastPlayedAt" TIMESTAMP(3);
