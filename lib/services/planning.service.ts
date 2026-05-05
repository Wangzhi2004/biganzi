import { jsonCompletion } from "@/lib/ai";
import { buildChapterFunctionPrompt } from "@/lib/ai/prompts";
import { contextBuilder } from "@/lib/orchestrator/context-builder";
import { prisma } from "@/lib/prisma";
import type { ChapterFunction } from "@/types";

export const planningService = {
  async checkProjectRisks(projectId: string): Promise<{
    highRiskForeshadows: any[];
    staleCharacters: any[];
    lowQualityChapters: any[];
    pacingIssues: any[];
    foreshadowBacklog: any[];
    reorderSuggestions: any[];
    summary: { totalRisks: number; highCount: number; mediumCount: number };
  }> {
    const [foreshadows, characters, chapters] = await Promise.all([
      prisma.foreshadow.findMany({
        where: { projectId },
        select: {
          id: true,
          clueText: true,
          status: true,
          urgencyScore: true,
          heatScore: true,
          plantedChapter: true,
          expectedPayoffStart: true,
          expectedPayoffEnd: true,
        },
      }),
      prisma.character.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          roleType: true,
          lastSeenChapter: true,
        },
      }),
      prisma.chapter.findMany({
        where: { projectId },
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          qualityScore: true,
          auditStatus: true,
          chapterFunction: true,
        },
      }),
    ]);

    const currentChapter = Math.max(...chapters.map((c) => c.chapterNumber), 0);

    const highRiskForeshadows = foreshadows.filter((f) => {
      const isHighUrgency = f.urgencyScore > 0.7;
      const isOverdue =
        f.expectedPayoffEnd !== null &&
        currentChapter > f.expectedPayoffEnd &&
        f.status !== "FULL_PAYOFF" &&
        f.status !== "DEPRECATED";
      const isHighHeat = f.heatScore > 0.8;
      return isHighUrgency || isOverdue || isHighHeat;
    });

    const staleCharacters = characters.filter((c) => {
      if (c.lastSeenChapter === null) return false;
      return currentChapter - c.lastSeenChapter > 10;
    });

    const lowQualityChapters = chapters.filter(
      (c) => c.qualityScore !== null && c.qualityScore < 60
    );

    const pacingIssues = [];
    const reorderSuggestions = [];

    const recentChapters = chapters.slice(-10);
    const avgScore =
      recentChapters.length > 0
        ? recentChapters.reduce((sum, c) => sum + (c.qualityScore || 0), 0) / recentChapters.length
        : 0;

    if (avgScore < 70) {
      pacingIssues.push({
        type: "warning",
        message: `最近10章质量平均分较低 (${avgScore.toFixed(1)})，建议关注`,
      });
      reorderSuggestions.push({
        type: "主线过慢",
        reason: "最近章节质量偏低，需要增加主线推进",
        action: "建议将部分章节功能调整为 main_plot 或 crisis_upgrade",
        priority: "high",
      });
    }

    const unresolvedForeshadows = foreshadows.filter(
      (f) => f.status !== "FULL_PAYOFF" && f.status !== "DEPRECATED"
    );
    if (unresolvedForeshadows.length > 15) {
      pacingIssues.push({
        type: "warning",
        message: `未回收伏笔过多 (${unresolvedForeshadows.length}个)，建议加快回收节奏`,
      });
      reorderSuggestions.push({
        type: "伏笔积压",
        reason: `有 ${unresolvedForeshadows.length} 个伏笔未回收`,
        action: "建议在后续章节中增加 foreshadow_payoff 类型章节",
        priority: "high",
      });
    }

    const tensionMap: Record<string, number> = {
      main_plot: 6, character_turn: 5, foreshadow_plant: 4,
      foreshadow_payoff: 7, pleasure_burst: 9, crisis_upgrade: 8,
      world_expansion: 3, relationship_advance: 5, villain_pressure: 7,
      emotional_settle: 2, phase_close: 4, new_arc_open: 5,
    };

    const recentFunctions = recentChapters.map((c) => c.chapterFunction.toLowerCase());
    const pleasureCount = recentFunctions.filter((f) => f === "pleasure_burst").length;
    const crisisCount = recentFunctions.filter((f) => f === "crisis_upgrade").length;
    const emotionalSettleCount = recentFunctions.filter((f) => f === "emotional_settle").length;

    if (pleasureCount > 3) {
      pacingIssues.push({
        type: "info",
        message: `最近10章中爽点章节过多 (${pleasureCount}个)，可能造成审美疲劳`,
      });
      reorderSuggestions.push({
        type: "爽点过密",
        reason: `连续爽点过多可能降低读者兴奋感`,
        action: "建议减少 pleasure_burst，增加 emotional_settle 或 world_expansion",
        priority: "medium",
      });
    }

    if (crisisCount > 4 && emotionalSettleCount === 0) {
      pacingIssues.push({
        type: "warning",
        message: "最近章节紧张度过高，缺乏情绪缓冲",
      });
      reorderSuggestions.push({
        type: "压抑过久",
        reason: "连续紧张章节可能导致读者疲劳",
        action: "建议插入 emotional_settle 章节缓解紧张氛围",
        priority: "high",
      });
    }

    if (staleCharacters.length > 3) {
      reorderSuggestions.push({
        type: "角色失踪",
        reason: `${staleCharacters.length} 个角色超过10章未出场`,
        action: `建议安排 ${staleCharacters.slice(0, 3).map((c) => c.name).join("、")} 等角色出场`,
        priority: "medium",
      });
    }

    const foreshadowBacklog = foreshadows
      .filter(
        (f) =>
          f.expectedPayoffStart !== null &&
          f.expectedPayoffStart <= currentChapter &&
          f.status !== "FULL_PAYOFF" &&
          f.status !== "DEPRECATED"
      )
      .sort((a, b) => (a.expectedPayoffStart || 0) - (b.expectedPayoffStart || 0));

    const totalRisks =
      highRiskForeshadows.length +
      staleCharacters.length +
      lowQualityChapters.length +
      pacingIssues.length;

    return {
      highRiskForeshadows,
      staleCharacters,
      lowQualityChapters,
      pacingIssues,
      foreshadowBacklog,
      reorderSuggestions,
      summary: {
        totalRisks,
        highCount: highRiskForeshadows.length + lowQualityChapters.length,
        mediumCount: staleCharacters.length + pacingIssues.length,
      },
    };
  },

  async recommendNextFunction(
    projectId: string
  ): Promise<{ suggestedFunction: string; reasoning: string }> {
    const nextChapterNumber =
      await getNextChapterNumberFromDb(projectId);

    const context = await contextBuilder.buildChapterContext(
      projectId,
      nextChapterNumber
    );

    const { data } = await jsonCompletion(
      buildChapterFunctionPrompt({
        bookDna: context.bookDna,
        volumeGoal: context.volumeGoal,
        recentChapters: context.lastChapters,
        activeForeshadows: context.activeForeshadows,
        pacingState: context.pacingState,
      })
    );

    return {
      suggestedFunction: data.suggestedFunction,
      reasoning: data.reasoning,
    };
  },

  async generateVolumePlan(
    projectId: string,
    volumeNumber: number
  ): Promise<any[]> {
    const volume = await prisma.volume.findFirst({
      where: { projectId, volumeNumber },
    });

    if (!volume) {
      throw new Error("卷不存在");
    }

    const bookDna = await prisma.bookDNA.findUnique({
      where: { projectId },
    });

    if (!bookDna) {
      throw new Error("项目缺少BookDNA");
    }

    const existingChapters = await prisma.chapter.findMany({
      where: { projectId, volumeId: volume.id },
      orderBy: { chapterNumber: "asc" },
      select: { chapterNumber: true, title: true, chapterFunction: true },
    });

    const chapterCount = 30;
    const plans = [];

    for (let i = 1; i <= chapterCount; i++) {
      const chapterNumber = existingChapters.length + i;
      const functionType = determineChapterFunction(
        chapterNumber,
        chapterCount,
        i
      );

      plans.push({
        chapterNumber,
        title: `第${chapterNumber}章`,
        chapterFunction: functionType,
        goal: generateChapterGoal(functionType, i, chapterCount),
      });
    }

    return plans;
  },

  async getPacingState(projectId: string): Promise<any> {
    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: "desc" },
      take: 20,
      select: {
        chapterNumber: true,
        chapterFunction: true,
        qualityScore: true,
        createdAt: true,
      },
    });

    const recentFunctions = chapters.slice(0, 10).map((ch) =>
      ch.chapterFunction.toLowerCase()
    );

    const functionDistribution = recentFunctions.reduce(
      (acc, func) => {
        acc[func] = (acc[func] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
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

    const tensions = chapters
      .slice(0, 10)
      .map((ch) => tensionMap[ch.chapterFunction.toLowerCase()] || 5);

    const averageTension =
      tensions.length > 0
        ? tensions.reduce((a, b) => a + b, 0) / tensions.length
        : 5;

    const tensionCurve = chapters
      .slice(0, 10)
      .reverse()
      .map((ch) => ({
        chapterNumber: ch.chapterNumber,
        tension: tensionMap[ch.chapterFunction.toLowerCase()] || 5,
      }));

    const pleasureCount = recentFunctions.filter(
      (f) => f === "pleasure_burst"
    ).length;
    const crisisCount = recentFunctions.filter(
      (f) => f === "crisis_upgrade"
    ).length;
    const worldExpandCount = recentFunctions.filter(
      (f) => f === "world_expansion"
    ).length;

    const chaptersSinceLastPleasure = findChaptersSince(
      chapters,
      "pleasure_burst"
    );
    const chaptersSinceLastCrisis = findChaptersSince(
      chapters,
      "crisis_upgrade"
    );
    const chaptersSinceLastWorldExpand = findChaptersSince(
      chapters,
      "world_expansion"
    );

    const suggestions = [];

    if (chaptersSinceLastPleasure > 5) {
      suggestions.push({
        type: "warning",
        message: `距上次爽点已过去${chaptersSinceLastPleasure}章，建议插入pleasure_burst`,
      });
    }

    if (chaptersSinceLastCrisis > 7) {
      suggestions.push({
        type: "warning",
        message: `距上次危机已过去${chaptersSinceLastCrisis}章，建议增加紧张度`,
      });
    }

    if (chaptersSinceLastWorldExpand > 10) {
      suggestions.push({
        type: "info",
        message: `距上次世界观扩展已过去${chaptersSinceLastWorldExpand}章，考虑扩展世界观`,
      });
    }

    if (averageTension > 7) {
      suggestions.push({
        type: "info",
        message: "当前紧张度较高，建议安排emotional_settle缓和节奏",
      });
    }

    if (averageTension < 3) {
      suggestions.push({
        type: "warning",
        message: "当前紧张度较低，建议安排crisis_upgrade或villain_pressure",
      });
    }

    return {
      totalChapters: chapters.length,
      recentFunctions,
      functionDistribution,
      averageTension,
      tensionCurve,
      pleasureCount,
      crisisCount,
      worldExpandCount,
      chaptersSinceLastPleasure,
      chaptersSinceLastCrisis,
      chaptersSinceLastWorldExpand,
      suggestions,
    };
  },
};

async function getNextChapterNumberFromDb(projectId: string): Promise<number> {
  const lastChapter = await prisma.chapter.findFirst({
    where: { projectId },
    orderBy: { chapterNumber: "desc" },
    select: { chapterNumber: true },
  });
  return (lastChapter?.chapterNumber ?? 0) + 1;
}

function determineChapterFunction(
  chapterNumber: number,
  totalChapters: number,
  positionInVolume: number
): ChapterFunction {
  const progress = positionInVolume / totalChapters;

  if (progress < 0.1) {
    return "new_arc_open";
  } else if (progress < 0.3) {
    const options: ChapterFunction[] = [
      "main_plot",
      "world_expansion",
      "character_turn",
      "foreshadow_plant",
    ];
    return options[positionInVolume % options.length];
  } else if (progress < 0.5) {
    const options: ChapterFunction[] = [
      "main_plot",
      "relationship_advance",
      "villain_pressure",
      "foreshadow_plant",
    ];
    return options[positionInVolume % options.length];
  } else if (progress < 0.7) {
    const options: ChapterFunction[] = [
      "crisis_upgrade",
      "foreshadow_payoff",
      "main_plot",
      "character_turn",
    ];
    return options[positionInVolume % options.length];
  } else if (progress < 0.9) {
    const options: ChapterFunction[] = [
      "pleasure_burst",
      "crisis_upgrade",
      "foreshadow_payoff",
      "main_plot",
    ];
    return options[positionInVolume % options.length];
  } else {
    return "phase_close";
  }
}

function generateChapterGoal(
  functionType: ChapterFunction,
  positionInVolume: number,
  totalChapters: number
): string {
  const goalMap: Record<ChapterFunction, string> = {
    main_plot: "推进核心剧情线，引入新的冲突或转折",
    character_turn: "主角面临重大选择或认知转变",
    foreshadow_plant: "埋下未来将回收的伏笔线索",
    foreshadow_payoff: "回收之前埋下的伏笔，带来惊喜",
    pleasure_burst: "主角展现实力，读者爽感爆发",
    crisis_upgrade: "危机升级，主角面临更大挑战",
    world_expansion: "扩展世界观，引入新势力或新设定",
    relationship_advance: "推进角色关系，深化情感连接",
    villain_pressure: "反派施压，增加紧迫感",
    emotional_settle: "沉淀情感，让读者回味",
    phase_close: "收束当前阶段，为下一阶段铺垫",
    new_arc_open: "开启新的故事弧线，引入新悬念",
  };

  return goalMap[functionType] || "推进剧情发展";
}

function findChaptersSince(
  chapters: Array<{ chapterFunction: string }>,
  functionType: string
): number {
  const index = chapters.findIndex(
    (ch) => ch.chapterFunction.toLowerCase() === functionType
  );
  return index >= 0 ? index : chapters.length;
}
