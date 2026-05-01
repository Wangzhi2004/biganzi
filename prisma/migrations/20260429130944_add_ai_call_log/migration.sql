-- CreateTable
CREATE TABLE "AICallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "projectId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "messages" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AICallLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AICallLog_projectId_idx" ON "AICallLog"("projectId");

-- CreateIndex
CREATE INDEX "AICallLog_jobId_idx" ON "AICallLog"("jobId");

-- CreateIndex
CREATE INDEX "AICallLog_createdAt_idx" ON "AICallLog"("createdAt");
