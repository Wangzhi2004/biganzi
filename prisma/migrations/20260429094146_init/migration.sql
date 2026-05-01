-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "subGenre" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "currentChapter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookDNA" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "subGenre" TEXT NOT NULL,
    "targetPlatform" TEXT NOT NULL,
    "targetWords" INTEGER NOT NULL,
    "updateRhythm" TEXT NOT NULL,
    "coreHook" TEXT NOT NULL,
    "protagonistTheme" TEXT NOT NULL,
    "finalEmotion" TEXT NOT NULL,
    "mainlineQuestion" TEXT NOT NULL,
    "worldKeywords" TEXT NOT NULL,
    "pleasureMechanism" TEXT NOT NULL,
    "emotionMechanism" TEXT NOT NULL,
    "forbiddenRules" JSONB NOT NULL,
    "styleDirection" TEXT NOT NULL,
    "targetReaderProfile" TEXT NOT NULL,
    "readerPromises" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookDNA_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Volume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "volumeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "goal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Volume_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Arc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volumeId" TEXT NOT NULL,
    "arcNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "goal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Arc_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "Volume" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "volumeId" TEXT,
    "arcId" TEXT,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "chapterFunction" TEXT NOT NULL,
    "sceneCards" JSONB,
    "qualityScore" REAL,
    "auditStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Chapter_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "Volume" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Chapter_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "Arc" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "characters" JSONB NOT NULL,
    "conflict" TEXT,
    "infoChange" TEXT,
    "emotionGoal" TEXT,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scene_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB,
    "roleType" TEXT NOT NULL,
    "desire" TEXT,
    "fear" TEXT,
    "wound" TEXT,
    "secret" TEXT,
    "moralBoundary" TEXT,
    "speechPattern" TEXT,
    "currentGoal" TEXT,
    "currentLocation" TEXT,
    "currentStatus" TEXT,
    "powerLevel" TEXT,
    "firstSeenChapter" INTEGER,
    "lastSeenChapter" INTEGER,
    "sourceChapters" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "characterAId" TEXT NOT NULL,
    "characterBId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startChapter" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Relationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Relationship_characterAId_fkey" FOREIGN KEY ("characterAId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Relationship_characterBId_fkey" FOREIGN KEY ("characterBId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceChapter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstSeenChapter" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "abilities" TEXT,
    "firstSeenChapter" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "limitations" TEXT,
    "ownerCharacterId" TEXT,
    "firstSeenChapter" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ability_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "members" JSONB,
    "firstSeenChapter" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "involvedCharacters" JSONB,
    "consequences" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Foreshadow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "plantedChapter" INTEGER NOT NULL,
    "clueText" TEXT NOT NULL,
    "surfaceMeaning" TEXT NOT NULL,
    "trueMeaning" TEXT NOT NULL,
    "relatedCharacters" JSONB,
    "relatedEvents" JSONB,
    "expectedPayoffStart" INTEGER,
    "expectedPayoffEnd" INTEGER,
    "payoffChapter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "heatScore" REAL NOT NULL DEFAULT 0,
    "urgencyScore" REAL NOT NULL DEFAULT 0,
    "remindedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Foreshadow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReaderPromise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "promiseText" TEXT NOT NULL,
    "plantedChapter" INTEGER NOT NULL,
    "resolvedChapter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReaderPromise_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StyleFingerprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "narrativePOV" TEXT NOT NULL,
    "narrativeDistance" TEXT NOT NULL,
    "avgSentenceLength" REAL NOT NULL,
    "dialogueRatio" REAL NOT NULL,
    "psychologicalRatio" REAL NOT NULL,
    "actionRatio" REAL NOT NULL,
    "environmentRatio" REAL NOT NULL,
    "infoDensity" REAL NOT NULL,
    "emotionExposure" REAL NOT NULL,
    "humorLevel" REAL NOT NULL,
    "rhetoricSystem" JSONB NOT NULL,
    "commonWords" JSONB NOT NULL,
    "bannedWords" JSONB NOT NULL,
    "chapterEndStyle" TEXT NOT NULL,
    "battleStyle" TEXT NOT NULL,
    "romanceStyle" TEXT NOT NULL,
    "mysteryStyle" TEXT NOT NULL,
    "presetName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StyleFingerprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "qualityScore" REAL NOT NULL,
    "mainPlotScore" REAL NOT NULL,
    "characterChangeScore" REAL NOT NULL,
    "conflictScore" REAL NOT NULL,
    "hookScore" REAL NOT NULL,
    "styleConsistencyScore" REAL NOT NULL,
    "settingConsistencyScore" REAL NOT NULL,
    "infoIncrementScore" REAL NOT NULL,
    "emotionTensionScore" REAL NOT NULL,
    "freshnessScore" REAL NOT NULL,
    "readabilityScore" REAL NOT NULL,
    "risks" JSONB NOT NULL,
    "rewriteActions" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuditReport_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inputContext" JSONB,
    "output" JSONB,
    "model" TEXT,
    "durationMs" INTEGER,
    "tokenCount" INTEGER,
    "cost" REAL,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GenerationJob_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StateDiff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "chapterSummary" TEXT NOT NULL,
    "newFacts" JSONB,
    "characterChanges" JSONB,
    "relationshipChanges" JSONB,
    "newWorldRules" JSONB,
    "newForeshadows" JSONB,
    "paidOffForeshadows" JSONB,
    "newReaderPromises" JSONB,
    "resolvedReaderPromises" JSONB,
    "riskFlags" JSONB,
    "nextChapterSuggestion" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StateDiff_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BookDNA_projectId_key" ON "BookDNA"("projectId");

-- CreateIndex
CREATE INDEX "Volume_projectId_idx" ON "Volume"("projectId");

-- CreateIndex
CREATE INDEX "Volume_volumeNumber_idx" ON "Volume"("volumeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Volume_projectId_volumeNumber_key" ON "Volume"("projectId", "volumeNumber");

-- CreateIndex
CREATE INDEX "Arc_volumeId_idx" ON "Arc"("volumeId");

-- CreateIndex
CREATE INDEX "Arc_arcNumber_idx" ON "Arc"("arcNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Arc_volumeId_arcNumber_key" ON "Arc"("volumeId", "arcNumber");

-- CreateIndex
CREATE INDEX "Chapter_projectId_idx" ON "Chapter"("projectId");

-- CreateIndex
CREATE INDEX "Chapter_chapterNumber_idx" ON "Chapter"("chapterNumber");

-- CreateIndex
CREATE INDEX "Chapter_auditStatus_idx" ON "Chapter"("auditStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_projectId_chapterNumber_key" ON "Chapter"("projectId", "chapterNumber");

-- CreateIndex
CREATE INDEX "Scene_chapterId_idx" ON "Scene"("chapterId");

-- CreateIndex
CREATE INDEX "Scene_sceneNumber_idx" ON "Scene"("sceneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_chapterId_sceneNumber_key" ON "Scene"("chapterId", "sceneNumber");

-- CreateIndex
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

-- CreateIndex
CREATE INDEX "Character_name_idx" ON "Character"("name");

-- CreateIndex
CREATE INDEX "Character_roleType_idx" ON "Character"("roleType");

-- CreateIndex
CREATE INDEX "Relationship_projectId_idx" ON "Relationship"("projectId");

-- CreateIndex
CREATE INDEX "Relationship_characterAId_idx" ON "Relationship"("characterAId");

-- CreateIndex
CREATE INDEX "Relationship_characterBId_idx" ON "Relationship"("characterBId");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_characterAId_characterBId_key" ON "Relationship"("characterAId", "characterBId");

-- CreateIndex
CREATE INDEX "WorldRule_projectId_idx" ON "WorldRule"("projectId");

-- CreateIndex
CREATE INDEX "WorldRule_category_idx" ON "WorldRule"("category");

-- CreateIndex
CREATE INDEX "WorldRule_status_idx" ON "WorldRule"("status");

-- CreateIndex
CREATE INDEX "Location_projectId_idx" ON "Location"("projectId");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Item_projectId_idx" ON "Item"("projectId");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Ability_projectId_idx" ON "Ability"("projectId");

-- CreateIndex
CREATE INDEX "Ability_ownerCharacterId_idx" ON "Ability"("ownerCharacterId");

-- CreateIndex
CREATE INDEX "Ability_name_idx" ON "Ability"("name");

-- CreateIndex
CREATE INDEX "Organization_projectId_idx" ON "Organization"("projectId");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Event_projectId_idx" ON "Event"("projectId");

-- CreateIndex
CREATE INDEX "Event_chapterNumber_idx" ON "Event"("chapterNumber");

-- CreateIndex
CREATE INDEX "Foreshadow_projectId_idx" ON "Foreshadow"("projectId");

-- CreateIndex
CREATE INDEX "Foreshadow_status_idx" ON "Foreshadow"("status");

-- CreateIndex
CREATE INDEX "Foreshadow_heatScore_idx" ON "Foreshadow"("heatScore");

-- CreateIndex
CREATE INDEX "Foreshadow_urgencyScore_idx" ON "Foreshadow"("urgencyScore");

-- CreateIndex
CREATE INDEX "ReaderPromise_projectId_idx" ON "ReaderPromise"("projectId");

-- CreateIndex
CREATE INDEX "ReaderPromise_status_idx" ON "ReaderPromise"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StyleFingerprint_projectId_key" ON "StyleFingerprint"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditReport_chapterId_key" ON "AuditReport"("chapterId");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_idx" ON "GenerationJob"("projectId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- CreateIndex
CREATE INDEX "GenerationJob_jobType_idx" ON "GenerationJob"("jobType");

-- CreateIndex
CREATE UNIQUE INDEX "StateDiff_chapterId_key" ON "StateDiff"("chapterId");
