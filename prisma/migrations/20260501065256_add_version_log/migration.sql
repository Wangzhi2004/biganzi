-- CreateTable
CREATE TABLE "VersionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VersionLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VersionLog_projectId_idx" ON "VersionLog"("projectId");

-- CreateIndex
CREATE INDEX "VersionLog_entityType_idx" ON "VersionLog"("entityType");

-- CreateIndex
CREATE INDEX "VersionLog_entityId_idx" ON "VersionLog"("entityId");

-- CreateIndex
CREATE INDEX "VersionLog_createdAt_idx" ON "VersionLog"("createdAt");
