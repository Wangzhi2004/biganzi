import { Prisma } from "@prisma/client";

export type ChapterFunction =
  | "main_plot"
  | "character_turn"
  | "foreshadow_plant"
  | "foreshadow_payoff"
  | "pleasure_burst"
  | "crisis_upgrade"
  | "world_expansion"
  | "relationship_advance"
  | "villain_pressure"
  | "emotional_settle"
  | "phase_close"
  | "new_arc_open";

export type ForeshadowStatus =
  | "inactive"
  | "planted"
  | "reminded"
  | "deepened"
  | "partial_payoff"
  | "full_payoff"
  | "deprecated"
  | "conflict";

export type AuditStatus = "pending" | "green" | "yellow" | "red";

export type ProjectStatus = "draft" | "active" | "archived";

export type CanonStatus = "confirmed" | "draft" | "deprecated" | "conflict";

export interface ChapterGenerationInput {
  bookDna: {
    genre: string;
    subGenre: string;
    coreHook: string;
    protagonistTheme: string;
    finalEmotion: string;
    mainlineQuestion: string;
    pleasureMechanism: string;
    emotionMechanism: string;
    forbiddenRules: Prisma.JsonValue;
    styleDirection: string;
    targetReaderProfile: string;
  };
  volumeGoal: string;
  arcGoal: string;
  recentChapters: Array<{
    chapterNumber: number;
    title: string;
    summary: string | null;
    chapterFunction: string;
    sceneCards: Prisma.JsonValue | null;
    qualityScore: number | null;
  }>;
  lastChapters: Array<{
    chapterNumber: number;
    title: string;
    summary: string | null;
    chapterFunction: string;
    sceneCards: Prisma.JsonValue | null;
    qualityScore: number | null;
  }>;
  activeCharacters: Array<{
    id: string;
    name: string;
    aliases: Prisma.JsonValue | null;
    roleType: string;
    desire: string | null;
    fear: string | null;
    wound: string | null;
    secret: string | null;
    currentGoal: string | null;
    currentLocation: string | null;
    currentStatus: string | null;
    powerLevel: string | null;
    speechPattern: string | null;
  }>;
  activeRelationships: Array<{
    characterAId: string;
    characterBId: string;
    relationType: string;
    description: string | null;
    status: string;
  }>;
  activeForeshadows: Array<{
    id: string;
    clueText: string;
    surfaceMeaning: string;
    trueMeaning: string;
    relatedCharacters: Prisma.JsonValue | null;
    status: string;
    heatScore: number;
    urgencyScore: number;
    expectedPayoffStart: number | null;
    expectedPayoffEnd: number | null;
  }>;
  readerPromises: Array<{
    id: string;
    promiseText: string;
    plantedChapter: number;
    status: string;
  }>;
  worldRules: Array<{
    category: string;
    content: string;
    status: string;
  }>;
  styleFingerprint: {
    narrativePOV: string;
    narrativeDistance: string;
    avgSentenceLength: number;
    dialogueRatio: number;
    psychologicalRatio: number;
    actionRatio: number;
    environmentRatio: number;
    infoDensity: number;
    emotionExposure: number;
    humorLevel: number;
    rhetoricSystem: Prisma.JsonValue;
    commonWords: Prisma.JsonValue;
    bannedWords: Prisma.JsonValue;
    chapterEndStyle: string;
    battleStyle: string;
    romanceStyle: string;
    mysteryStyle: string;
  };
  pacingState: {
    currentTension: number;
    recentChapterTypes: string[];
    chaptersSinceLastPleasure: number;
    chaptersSinceLastCrisis: number;
    chaptersSinceLastWorldExpand: number;
  };
  mustAdvance: string[];
  mustAvoid: string[];
}

export interface SceneCard {
  sceneNumber: number;
  location: string;
  characters: string[];
  conflict: string;
  infoChange: string;
  emotionGoal: string;
  keyAction: string;
  hookEnding: string;
}

export interface AuditReportResult {
  overallStatus: AuditStatus;
  qualityScore: number;
  mainPlotScore: number;
  characterChangeScore: number;
  conflictScore: number;
  hookScore: number;
  styleConsistencyScore: number;
  settingConsistencyScore: number;
  infoIncrementScore: number;
  emotionTensionScore: number;
  freshnessScore: number;
  readabilityScore: number;
  risks: Array<{
    level: string;
    category: string;
    description: string;
    suggestion: string;
  }>;
  rewriteActions: Array<{
    action: string;
    target: string;
    reason: string;
    priority: number;
  }>;
  conflictPoints?: Array<{
    location: string;
    conflictType: string;
    description: string;
    relatedChapter: string;
  }>;
  enhancementSuggestions?: Array<{
    location: string;
    type: string;
    suggestion: string;
    expectedImpact: string;
  }>;
}

export interface StateDiffResult {
  chapterSummary: string;
  newFacts: string[];
  characterChanges: Array<{
    characterId: string;
    characterName: string;
    field: string;
    oldValue: string | null;
    newValue: string;
  }>;
  relationshipChanges: Array<{
    characterAId: string;
    characterBId: string;
    changeType: string;
    description: string;
  }>;
  newWorldRules: Array<{
    category: string;
    content: string;
  }>;
  newForeshadows: Array<{
    clueText: string;
    surfaceMeaning: string;
    trueMeaning: string;
    relatedCharacters: string[];
    expectedPayoffStart: number;
    expectedPayoffEnd: number;
  }>;
  paidOffForeshadows: Array<{
    foreshadowId: string;
    payoffType: string;
  }>;
  newReaderPromises: Array<{
    promiseText: string;
  }>;
  resolvedReaderPromises: Array<{
    promiseId: string;
    resolutionType: string;
  }>;
  riskFlags: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  nextChapterSuggestion: {
    suggestedFunction: ChapterFunction;
    suggestedGoal: string;
    tensionDirection: string;
    reasoning: string;
  };
}

export interface ChapterGenerationOutput {
  chapterTitle: string;
  chapterFunction: ChapterFunction;
  chapterGoal: string;
  sceneCards: SceneCard[];
  chapterBody: string;
  qualityScore: number;
  auditReport: AuditReportResult;
  stateDiff: StateDiffResult;
  nextChapterSeed: {
    suggestedFunction: ChapterFunction;
    suggestedGoal: string;
    tensionDirection: string;
    reasoning: string;
  };
}

export interface StylePreset {
  name: string;
  narrativePOV: string;
  narrativeDistance: string;
  avgSentenceLength: number;
  dialogueRatio: number;
  psychologicalRatio: number;
  actionRatio: number;
  environmentRatio: number;
  infoDensity: number;
  emotionExposure: number;
  humorLevel: number;
  rhetoricSystem: Record<string, unknown>;
  commonWords: string[];
  bannedWords: string[];
  chapterEndStyle: string;
  battleStyle: string;
  romanceStyle: string;
  mysteryStyle: string;
}

export const CHAPTER_FUNCTIONS: ChapterFunction[] = [
  "main_plot",
  "character_turn",
  "foreshadow_plant",
  "foreshadow_payoff",
  "pleasure_burst",
  "crisis_upgrade",
  "world_expansion",
  "relationship_advance",
  "villain_pressure",
  "emotional_settle",
  "phase_close",
  "new_arc_open",
];

export const CHAPTER_FUNCTION_LABELS: Record<ChapterFunction, string> = {
  main_plot: "主线推进",
  character_turn: "人物转折",
  foreshadow_plant: "伏笔埋设",
  foreshadow_payoff: "伏笔回收",
  pleasure_burst: "爽点爆发",
  crisis_upgrade: "危机升级",
  world_expansion: "世界观扩展",
  relationship_advance: "关系推进",
  villain_pressure: "反派施压",
  emotional_settle: "情感沉淀",
  phase_close: "阶段收束",
  new_arc_open: "新弧开启",
};

export const FORESHADOW_STATUSES: ForeshadowStatus[] = [
  "inactive",
  "planted",
  "reminded",
  "deepened",
  "partial_payoff",
  "full_payoff",
  "deprecated",
  "conflict",
];

export const FORESHADOW_STATUS_LABELS: Record<ForeshadowStatus, string> = {
  inactive: "未激活",
  planted: "已埋设",
  reminded: "已提醒",
  deepened: "已深化",
  partial_payoff: "部分回收",
  full_payoff: "完全回收",
  deprecated: "已废弃",
  conflict: "存在冲突",
};

export const AUDIT_STATUSES: AuditStatus[] = [
  "pending",
  "green",
  "yellow",
  "red",
];

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  pending: "待审核",
  green: "通过",
  yellow: "需修改",
  red: "严重问题",
};

export const PROJECT_STATUSES: ProjectStatus[] = [
  "draft",
  "active",
  "archived",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "草稿",
  active: "创作中",
  archived: "已归档",
};

export const CANON_STATUSES: CanonStatus[] = [
  "confirmed",
  "draft",
  "deprecated",
  "conflict",
];

export const CANON_STATUS_LABELS: Record<CanonStatus, string> = {
  confirmed: "已确认",
  draft: "草稿",
  deprecated: "已废弃",
  conflict: "存在冲突",
};