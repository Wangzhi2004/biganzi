-- AlterTable
ALTER TABLE "AICallLog" ADD COLUMN "chapterId" TEXT;

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN "goal" TEXT;

-- CreateIndex
CREATE INDEX "AICallLog_chapterId_idx" ON "AICallLog"("chapterId");
