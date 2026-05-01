import { projectService } from "@/lib/services/project.service";
import { memoryService } from "@/lib/services/memory.service";
import { styleService } from "@/lib/services/style.service";
import { chapterService } from "@/lib/services/chapter.service";
import { vectorMemoryService } from "@/lib/services/vector-memory.service";
import { prisma } from "@/lib/prisma";
import type { ChapterGenerationInput } from "@/types";

export const contextBuilder = {
  async buildChapterContext(
    projectId: string,
    chapterNumber: number
  ): Promise<ChapterGenerationInput> {
    const project = await projectService.getById(projectId);

    if (!project.bookDna) {
      throw new Error("项目缺少BookDNA，请先初始化项目");
    }

    const [
      memoryContext,
      styleFingerprint,
      recentChapters,
      volumeGoal,
      pacingState,
    ] = await Promise.all([
      memoryService.recallContext(projectId, chapterNumber),
      styleService.getByProject(projectId),
      getRecentChapters(projectId, chapterNumber),
      getVolumeGoal(projectId),
      getPacingState(projectId, chapterNumber),
    ]);

    if (!styleFingerprint) {
      throw new Error("项目缺少风格指纹，请先设置风格");
    }

    const activeRelationships = await getActiveRelationships(
      memoryContext.activeCharacters.map((c: any) => c.id)
    );

    const result: ChapterGenerationInput = {
      bookDna: {
        genre: project.bookDna.genre,
        subGenre: project.bookDna.subGenre,
        coreHook: project.bookDna.coreHook,
        protagonistTheme: project.bookDna.protagonistTheme,
        finalEmotion: project.bookDna.finalEmotion,
        mainlineQuestion: project.bookDna.mainlineQuestion,
        pleasureMechanism: project.bookDna.pleasureMechanism,
        emotionMechanism: project.bookDna.emotionMechanism,
        forbiddenRules: project.bookDna.forbiddenRules,
        styleDirection: project.bookDna.styleDirection,
        targetReaderProfile: project.bookDna.targetReaderProfile,
      },
      volumeGoal: volumeGoal || "",
      arcGoal: "",
      recentChapters: recentChapters,
      lastChapters: recentChapters,
      activeCharacters: memoryContext.activeCharacters.map((c: any) => ({
        id: c.id,
        name: c.name,
        aliases: c.aliases,
        roleType: c.roleType,
        desire: c.desire,
        fear: c.fear,
        wound: c.wound,
        secret: c.secret,
        currentGoal: c.currentGoal,
        currentLocation: c.currentLocation,
        currentStatus: c.currentStatus,
        powerLevel: c.powerLevel,
        speechPattern: c.speechPattern,
      })),
      activeRelationships,
      activeForeshadows: memoryContext.unresolvedForeshadows.map((f: any) => ({
        id: f.id,
        clueText: f.clueText,
        surfaceMeaning: f.surfaceMeaning,
        trueMeaning: f.trueMeaning,
        relatedCharacters: f.relatedCharacters,
        status: f.status.toLowerCase(),
        heatScore: f.heatScore,
        urgencyScore: f.urgencyScore,
        expectedPayoffStart: f.expectedPayoffStart,
        expectedPayoffEnd: f.expectedPayoffEnd,
      })),
      readerPromises: memoryContext.activeReaderPromises.map((p: any) => ({
        id: p.id,
        promiseText: p.promiseText,
        plantedChapter: p.plantedChapter,
        status: p.status.toLowerCase(),
      })),
      worldRules: memoryContext.confirmedWorldRules.map((r: any) => ({
        category: r.category,
        content: r.content,
        status: r.status.toLowerCase(),
      })),
      styleFingerprint: {
        narrativePOV: styleFingerprint.narrativePOV,
        narrativeDistance: styleFingerprint.narrativeDistance,
        avgSentenceLength: styleFingerprint.avgSentenceLength,
        dialogueRatio: styleFingerprint.dialogueRatio,
        psychologicalRatio: styleFingerprint.psychologicalRatio,
        actionRatio: styleFingerprint.actionRatio,
        environmentRatio: styleFingerprint.environmentRatio,
        infoDensity: styleFingerprint.infoDensity,
        emotionExposure: styleFingerprint.emotionExposure,
        humorLevel: styleFingerprint.humorLevel,
        rhetoricSystem: styleFingerprint.rhetoricSystem,
        commonWords: styleFingerprint.commonWords,
        bannedWords: styleFingerprint.bannedWords,
        chapterEndStyle: styleFingerprint.chapterEndStyle,
        battleStyle: styleFingerprint.battleStyle,
        romanceStyle: styleFingerprint.romanceStyle,
        mysteryStyle: styleFingerprint.mysteryStyle,
      },
      pacingState,
      mustAdvance: [],
      mustAvoid: [],
    };

    // Add semantic recall (non-blocking, best-effort)
    try {
      const semanticContext = await vectorMemoryService.recallRelevantContext(
        projectId,
        "",
        []
      );
      if (semanticContext.length > 0) {
        (result as any).semanticContext = semanticContext;
      }
    } catch (e) {
      console.log("[VectorMemory] Semantic recall skipped:", (e as Error).message);
    }

    // Add evolution recommendations (non-blocking, best-effort)
    try {
      const { MetaLearner } = await import("./meta-learner");
      const metaLearner = new MetaLearner();
      const recommendations = await metaLearner.getRecommendations(projectId, {
        genre: project.bookDna?.genre,
      });
      if (recommendations.length > 0) {
        (result as any).evolutionRecommendations = recommendations;
      }
    } catch (e) {
      console.log("[Evolution] Recommendations skipped:", (e as Error).message);
    }

    return result;
  },
};

async function getRecentChapters(projectId: string, chapterNumber: number) {
  const start = Math.max(1, chapterNumber - 5);
  const chapters = await prisma.chapter.findMany({
    where: {
      projectId,
      chapterNumber: { gte: start, lt: chapterNumber },
    },
    orderBy: { chapterNumber: "asc" },
    select: {
      chapterNumber: true,
      title: true,
      summary: true,
      chapterFunction: true,
      sceneCards: true,
      qualityScore: true,
    },
  });

  return chapters.map((ch) => ({
    chapterNumber: ch.chapterNumber,
    title: ch.title,
    summary: ch.summary,
    chapterFunction: ch.chapterFunction.toLowerCase(),
    sceneCards: ch.sceneCards,
    qualityScore: ch.qualityScore,
  }));
}

async function getVolumeGoal(projectId: string) {
  const volume = await prisma.volume.findFirst({
    where: { projectId },
    orderBy: { volumeNumber: "asc" },
    select: { goal: true },
  });
  return volume?.goal || "";
}

async function getActiveRelationships(characterIds: string[]) {
  if (characterIds.length === 0) return [];

  const relationships = await prisma.relationship.findMany({
    where: {
      characterAId: { in: characterIds },
      characterBId: { in: characterIds },
      status: "active",
    },
  });

  return relationships.map((r) => ({
    characterAId: r.characterAId,
    characterBId: r.characterBId,
    relationType: r.relationType,
    description: r.description,
    status: r.status,
  }));
}

async function getPacingState(projectId: string, chapterNumber: number) {
  const recentChapters = await prisma.chapter.findMany({
    where: {
      projectId,
      chapterNumber: { gte: Math.max(1, chapterNumber - 10), lt: chapterNumber },
    },
    orderBy: { chapterNumber: "desc" },
    select: { chapterFunction: true, chapterNumber: true },
  });

  const recentChapterTypes = recentChapters.map((ch) =>
    ch.chapterFunction.toLowerCase()
  );

  const chaptersSinceLastPleasure = findChaptersSince(
    recentChapters,
    "pleasure_burst",
    chapterNumber
  );
  const chaptersSinceLastCrisis = findChaptersSince(
    recentChapters,
    "crisis_upgrade",
    chapterNumber
  );
  const chaptersSinceLastWorldExpand = findChaptersSince(
    recentChapters,
    "world_expansion",
    chapterNumber
  );

  const tensionMap: Record<string, number> = {
    main_plot: 6,
    character_turn: 5,
    foreshadow_plant: 4,
    foreshadow_payoff: 7,
    pleasure_burst: 9,
    crisis_upgrade: 8,
    world_expansion: 3,
    relationship_advance: 5,
    villain_pressure: 7,
    emotional_settle: 2,
    phase_close: 4,
    new_arc_open: 5,
  };

  const recentTensions = recentChapterTypes.slice(0, 3).map((t) => tensionMap[t] || 5);
  const currentTension =
    recentTensions.length > 0
      ? recentTensions.reduce((a, b) => a + b, 0) / recentTensions.length
      : 5;

  return {
    currentTension,
    recentChapterTypes,
    chaptersSinceLastPleasure,
    chaptersSinceLastCrisis,
    chaptersSinceLastWorldExpand,
  };
}

function findChaptersSince(
  chapters: Array<{ chapterFunction: string; chapterNumber: number }>,
  functionType: string,
  currentChapter: number
): number {
  const found = chapters.find(
    (ch) => ch.chapterFunction.toLowerCase() === functionType
  );
  return found ? currentChapter - found.chapterNumber : 10;
}
