-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "avgScore" REAL NOT NULL DEFAULT 0,
    "successRate" REAL NOT NULL DEFAULT 0,
    "avgTokens" REAL NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "mutations" JSONB,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptVersionId" TEXT NOT NULL,
    "input" TEXT,
    "output" TEXT,
    "score" REAL NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentPerformance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "avgScore" REAL NOT NULL DEFAULT 0,
    "errorRate" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PipelineExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "status" TEXT NOT NULL,
    "results" JSONB,
    "metrics" JSONB,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LearningEpisode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "taskType" TEXT NOT NULL,
    "input" JSONB,
    "expectedOutput" JSONB,
    "actualOutput" JSONB,
    "score" REAL NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LearningRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "applicability" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0,
    "sourceExperiments" JSONB,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EvolutionCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "observations" JSONB,
    "hypotheses" JSONB,
    "experiments" JSONB,
    "learnings" JSONB,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "PromptVersion_taskType_idx" ON "PromptVersion"("taskType");

-- CreateIndex
CREATE INDEX "PromptVersion_role_idx" ON "PromptVersion"("role");

-- CreateIndex
CREATE INDEX "PromptVersion_version_idx" ON "PromptVersion"("version");

-- CreateIndex
CREATE INDEX "ExecutionLog_promptVersionId_idx" ON "ExecutionLog"("promptVersionId");

-- CreateIndex
CREATE INDEX "ExecutionLog_createdAt_idx" ON "ExecutionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPerformance_agentId_key" ON "AgentPerformance"("agentId");

-- CreateIndex
CREATE INDEX "AgentPerformance_agentId_idx" ON "AgentPerformance"("agentId");

-- CreateIndex
CREATE INDEX "PipelineExecution_templateId_idx" ON "PipelineExecution"("templateId");

-- CreateIndex
CREATE INDEX "PipelineExecution_projectId_idx" ON "PipelineExecution"("projectId");

-- CreateIndex
CREATE INDEX "PipelineExecution_status_idx" ON "PipelineExecution"("status");

-- CreateIndex
CREATE INDEX "LearningEpisode_projectId_idx" ON "LearningEpisode"("projectId");

-- CreateIndex
CREATE INDEX "LearningEpisode_taskType_idx" ON "LearningEpisode"("taskType");

-- CreateIndex
CREATE INDEX "LearningEpisode_createdAt_idx" ON "LearningEpisode"("createdAt");

-- CreateIndex
CREATE INDEX "LearningRecord_applied_idx" ON "LearningRecord"("applied");

-- CreateIndex
CREATE INDEX "LearningRecord_createdAt_idx" ON "LearningRecord"("createdAt");

-- CreateIndex
CREATE INDEX "EvolutionCycle_projectId_idx" ON "EvolutionCycle"("projectId");

-- CreateIndex
CREATE INDEX "EvolutionCycle_status_idx" ON "EvolutionCycle"("status");

-- CreateIndex
CREATE INDEX "EvolutionCycle_startedAt_idx" ON "EvolutionCycle"("startedAt");
