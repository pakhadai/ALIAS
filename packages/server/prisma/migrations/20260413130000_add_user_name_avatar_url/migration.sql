-- Add real-world identity fields for Telegram/other OAuth providers
ALTER TABLE "User"
ADD COLUMN     "name" TEXT,
ADD COLUMN     "avatarUrl" TEXT;

