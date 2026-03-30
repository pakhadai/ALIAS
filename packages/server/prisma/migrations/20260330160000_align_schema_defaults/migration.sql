-- Align DB schema with current Prisma schema.
-- This fixes production drift where initial migration missed some columns.

-- User.isAdmin (added later, default false)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- WordPack.isDefault (always available packs, default false)
ALTER TABLE "WordPack"
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

