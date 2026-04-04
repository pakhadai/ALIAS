-- CreateIndex
CREATE INDEX "WordPack_language_category_idx" ON "WordPack"("language", "category");

-- CreateIndex
CREATE INDEX "Purchase_status_createdAt_idx" ON "Purchase"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GameSession_createdAt_idx" ON "GameSession"("createdAt");
