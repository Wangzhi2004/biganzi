-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "limitations" TEXT,
    "ownerCharacterId" TEXT,
    "firstSeenChapter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ability_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ability" ("createdAt", "description", "firstSeenChapter", "id", "limitations", "name", "ownerCharacterId", "projectId", "updatedAt") SELECT "createdAt", "description", "firstSeenChapter", "id", "limitations", "name", "ownerCharacterId", "projectId", "updatedAt" FROM "Ability";
DROP TABLE "Ability";
ALTER TABLE "new_Ability" RENAME TO "Ability";
CREATE INDEX "Ability_projectId_idx" ON "Ability"("projectId");
CREATE INDEX "Ability_ownerCharacterId_idx" ON "Ability"("ownerCharacterId");
CREATE INDEX "Ability_name_idx" ON "Ability"("name");
CREATE TABLE "new_Character" (
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
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("aliases", "createdAt", "currentGoal", "currentLocation", "currentStatus", "desire", "fear", "firstSeenChapter", "id", "lastSeenChapter", "moralBoundary", "name", "powerLevel", "projectId", "roleType", "secret", "sourceChapters", "speechPattern", "updatedAt", "wound") SELECT "aliases", "createdAt", "currentGoal", "currentLocation", "currentStatus", "desire", "fear", "firstSeenChapter", "id", "lastSeenChapter", "moralBoundary", "name", "powerLevel", "projectId", "roleType", "secret", "sourceChapters", "speechPattern", "updatedAt", "wound" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");
CREATE INDEX "Character_name_idx" ON "Character"("name");
CREATE INDEX "Character_roleType_idx" ON "Character"("roleType");
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "abilities" TEXT,
    "firstSeenChapter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("abilities", "createdAt", "description", "firstSeenChapter", "id", "name", "projectId", "updatedAt") SELECT "abilities", "createdAt", "description", "firstSeenChapter", "id", "name", "projectId", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_projectId_idx" ON "Item"("projectId");
CREATE INDEX "Item_name_idx" ON "Item"("name");
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstSeenChapter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("createdAt", "description", "firstSeenChapter", "id", "name", "projectId", "updatedAt") SELECT "createdAt", "description", "firstSeenChapter", "id", "name", "projectId", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE INDEX "Location_projectId_idx" ON "Location"("projectId");
CREATE INDEX "Location_name_idx" ON "Location"("name");
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "members" JSONB,
    "firstSeenChapter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Organization" ("createdAt", "description", "firstSeenChapter", "id", "members", "name", "projectId", "updatedAt") SELECT "createdAt", "description", "firstSeenChapter", "id", "members", "name", "projectId", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE INDEX "Organization_projectId_idx" ON "Organization"("projectId");
CREATE INDEX "Organization_name_idx" ON "Organization"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
