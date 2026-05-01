-- AlterTable
ALTER TABLE "AICallLog" ADD COLUMN "taskType" TEXT;

-- AlterTable
ALTER TABLE "WorldRule" ADD COLUMN "checkPrompt" TEXT;
ALTER TABLE "WorldRule" ADD COLUMN "checkType" TEXT;

-- CreateTable
CREATE TABLE "MemoryEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "contentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoryEmbedding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsistencyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "voiceDriftScore" REAL,
    "settingConflicts" JSONB,
    "foreshadowErrors" JSONB,
    "timelineGaps" JSONB,
    "missingCharacters" JSONB,
    "overallScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsistencyReport_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MemoryEmbedding_projectId_idx" ON "MemoryEmbedding"("projectId");

-- CreateIndex
CREATE INDEX "MemoryEmbedding_contentType_idx" ON "MemoryEmbedding"("contentType");

-- CreateIndex
CREATE INDEX "MemoryEmbedding_chapterId_idx" ON "MemoryEmbedding"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsistencyReport_chapterId_key" ON "ConsistencyReport"("chapterId");
