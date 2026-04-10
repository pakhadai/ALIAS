-- AlterTable
ALTER TABLE "WordConcept" ADD COLUMN "conceptKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WordConcept_packId_conceptKey_key" ON "WordConcept"("packId", "conceptKey");
