import { chatCompletion, jsonCompletion, type LogContext } from "@/lib/ai";
import {
  buildChapterFunctionPrompt,
  buildChapterGoalPrompt,
  buildPlannerSceneCardsPrompt,
  buildWriteChapterPrompt,
  buildMultiDraftJudgePrompt,
  buildExtractStatePrompt,
  buildStyleDriftCheckPrompt,
  buildStyleAlignPrompt,
} from "@/lib/ai/prompts";
import { contextBuilder } from "./context-builder";
import { refinePasses } from "./refine-passes";
import { multiRoundAudit } from "./multi-round-audit";
import { chapterService } from "@/lib/services/chapter.service";
import { memoryService } from "@/lib/services/memory.service";
import { auditService } from "@/lib/services/audit.service";
import { projectService } from "@/lib/services/project.service";
import { generationService } from "@/lib/services/generation.service";
import { vectorMemoryService } from "@/lib/services/vector-memory.service";
import { prisma } from "@/lib/prisma";
import type {
  ChapterGenerationInput,
  ChapterGenerationOutput,
  ChapterFunction,
  SceneCard,
  AuditReportResult,
  StateDiffResult,
} from "@/types";

export const AI_STEPS = {
  CHAPTER_FUNCTION: "chapter_function",
  CHAPTER_GOAL: "chapter_goal",
  SCENE_CARDS: "scene_cards",
  CHAPTER_BODY: "chapter_body",
  MULTI_DRAFT_JUDGE: "multi_draft_judge",
  STYLE_DRIFT_CHECK: "style_drift_check",
  STYLE_ALIGN: "style_align",
  AUDIT_CONSISTENCY: "audit_consistency",
  AUDIT_PACING: "audit_pacing",
  AUDIT_STYLE: "audit_style",
  REWRITE: "rewrite",
  STATE_DIFF: "state_diff",
} as const;

const CHAPTER_TITLE_MAP: Record<ChapterFunction, string> = {
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

const MULTI_DRAFT_FUNCTIONS: ChapterFunction[] = [
  "main_plot",
  "foreshadow_payoff",
  "pleasure_burst",
  "crisis_upgrade",
  "phase_close",
];

const MAX_RETRIES = 3;
const STYLE_DRIFT_THRESHOLD = 60;

export const pipeline = {
  async generateNextChapter(
    projectId: string,
    options?: { forceRewrite?: boolean; jobId?: string; projectId?: string }
  ): Promise<ChapterGenerationOutput> {
    const startTime = Date.now();
    let totalTokens = 0;

    const jobId = await generationService.createJob({
      projectId,
      jobType: "next_chapter",
    });

    try {
      const nextChapterNumber =
        await chapterService.getNextChapterNumber(projectId);
      const context = await contextBuilder.buildChapterContext(
        projectId,
        nextChapterNumber
      );

      const logContext: LogContext = {
        jobId: options?.jobId ?? jobId,
        projectId: options?.projectId ?? projectId,
      };

      // === VECTOR MEMORY: Semantic recall for relevant context ===
      let semanticContext: string[] = [];
      try {
        semanticContext = await vectorMemoryService.recallRelevantContext(
          projectId,
          context.volumeGoal || "",
          []
        );
        if (semanticContext.length > 0) {
          console.log(`[Pipeline] Vector recall: ${semanticContext.length} relevant memories`);
        }
      } catch (e) {
        console.log("[Pipeline] Vector recall skipped:", (e as Error).message);
      }

      // === META-LEARNING: Select optimal strategy ===
      let strategyRecommendation: any = null;
      try {
        const { MetaLearner } = await import("./meta-learner");
        const metaLearner = new MetaLearner();
        const strategy = await metaLearner.selectStrategy({
          genre: context.bookDna.genre,
          chapterFunction: "main_plot",
          tokenCount: 0,
        });
        if (strategy) {
          strategyRecommendation = strategy;
          console.log(`[Pipeline] Meta-learning strategy: ${strategy.name}`);
        }
      } catch (e) {
        console.log("[Pipeline] Meta-learning skipped:", (e as Error).message);
      }

      // === PLANNING PHASE ===

      const { data: functionResult, meta: functionMeta } =
        await jsonCompletion(
          buildChapterFunctionPrompt(context),
          undefined,
          { ...logContext, stepName: AI_STEPS.CHAPTER_FUNCTION, stepOrder: 1 }
        );
      totalTokens += functionMeta.usage.totalTokens;

      const chapterFunction =
        functionResult.suggestedFunction as ChapterFunction;

      const { data: goalResult, meta: goalMeta } = await jsonCompletion(
        buildChapterGoalPrompt({
          ...context,
          chapterFunction,
        }),
        undefined,
        { ...logContext, stepName: AI_STEPS.CHAPTER_GOAL, stepOrder: 2 }
      );
      totalTokens += goalMeta.usage.totalTokens;

      const chapterGoal = goalResult.chapterGoal;

      const { data: sceneResult, meta: sceneMeta } = await jsonCompletion(
        buildPlannerSceneCardsPrompt({
          ...context,
          chapterGoal,
          chapterFunction,
        }),
        undefined,
        { ...logContext, stepName: AI_STEPS.SCENE_CARDS, stepOrder: 3 }
      );
      totalTokens += sceneMeta.usage.totalTokens;

      const sceneCards: SceneCard[] = sceneResult.sceneCards;

      // === GENERATION PHASE (multi-draft for key chapters) ===

      const useMultiDraft = MULTI_DRAFT_FUNCTIONS.includes(chapterFunction);
      let chapterText: string;

      if (useMultiDraft) {
        const draftPromises = [0.7, 0.9, 1.1].map(async (temp, index) => {
          const { content, usage } = await chatCompletion(
            buildWriteChapterPrompt({
              bookDna: context.bookDna,
              chapterGoal,
              sceneCards,
              activeCharacters: context.activeCharacters,
              styleFingerprint: context.styleFingerprint,
              recentChapters: context.recentChapters,
              worldRules: context.worldRules,
              semanticContext,
            }),
            { temperature: temp },
            {
              ...logContext,
              stepName: `draft_${index + 1}`,
              stepOrder: 4 + index,
            }
          );
          return { index, text: content, tokens: usage.totalTokens };
        });

        const drafts = await Promise.all(draftPromises);
        totalTokens += drafts.reduce((sum, d) => sum + d.tokens, 0);

        const { data: judgeResult, meta: judgeMeta } = await jsonCompletion(
          buildMultiDraftJudgePrompt({
            drafts: drafts.map((d) => ({ index: d.index, text: d.text })),
            chapterGoal,
            sceneCards,
            styleFingerprint: context.styleFingerprint,
          }),
          undefined,
          {
            ...logContext,
            stepName: AI_STEPS.MULTI_DRAFT_JUDGE,
            stepOrder: 7,
          }
        );
        totalTokens += judgeMeta.usage.totalTokens;

        const selectedIndex = judgeResult.selectedIndex || 0;
        chapterText = drafts[selectedIndex].text;
      } else {
        const { content, usage } = await chatCompletion(
          buildWriteChapterPrompt({
            bookDna: context.bookDna,
            chapterGoal,
            sceneCards,
            activeCharacters: context.activeCharacters,
            styleFingerprint: context.styleFingerprint,
            recentChapters: context.recentChapters,
            worldRules: context.worldRules,
            semanticContext,
          }),
          undefined,
          { ...logContext, stepName: AI_STEPS.CHAPTER_BODY, stepOrder: 4 }
        );
        totalTokens += usage.totalTokens;
        chapterText = content;
      }

      // === STYLE DRIFT CHECK & ALIGN ===
      if (context.styleFingerprint) {
        try {
          const { data: driftResult, meta: driftMeta } = await jsonCompletion(
            buildStyleDriftCheckPrompt({
              text: chapterText.slice(0, 3000),
              styleFingerprint: context.styleFingerprint,
            }),
            undefined,
            {
              ...logContext,
              stepName: AI_STEPS.STYLE_DRIFT_CHECK,
              stepOrder: 8,
            }
          );
          totalTokens += driftMeta.usage.totalTokens;

          const driftScore = driftResult.driftScore || 0;
          console.log(`[Pipeline] Style drift score: ${driftScore}`);

          if (driftScore > STYLE_DRIFT_THRESHOLD) {
            console.log(`[Pipeline] Style drift detected (${driftScore}), aligning...`);
            const { content: alignedText, meta: alignMeta } = await chatCompletion(
              buildStyleAlignPrompt({
                text: chapterText,
                styleFingerprint: context.styleFingerprint,
                direction: "全面对齐",
              }),
              undefined,
              {
                ...logContext,
                stepName: AI_STEPS.STYLE_ALIGN,
                stepOrder: 9,
              }
            );
            totalTokens += alignMeta.usage.totalTokens;
            chapterText = alignedText;
            console.log("[Pipeline] Style alignment completed");
          }
        } catch (e) {
          console.log("[Pipeline] Style drift check skipped:", (e as Error).message);
        }
      }

      // === REFINEMENT + AUDIT LOOP ===

      let auditResult: Awaited<
        ReturnType<typeof multiRoundAudit.execute>
      >;
      let retryCount = 0;

      do {
        auditResult = await multiRoundAudit.execute(
          {
            chapterContent: chapterText,
            chapterGoal,
            chapterFunction,
            bookDna: context.bookDna,
            activeCharacters: context.activeCharacters,
            activeForeshadows: context.activeForeshadows,
            worldRules: context.worldRules,
            styleFingerprint: context.styleFingerprint,
            recentChapters: context.recentChapters,
            pacingState: context.pacingState,
          },
          logContext
        );

        if (auditResult.overallStatus === "green") break;

        const refineResult = await refinePasses.execute(
          {
            text: chapterText,
            activeCharacters: context.activeCharacters,
            styleFingerprint: context.styleFingerprint,
            chapterGoal,
          },
          auditResult.refineHints,
          logContext
        );

        if (refineResult.passesRun.length === 0) break;

        chapterText = refineResult.text;
        retryCount++;
      } while (retryCount < MAX_RETRIES);

      // === STATE EXTRACTION ===

      const { data: stateDiff, meta: stateMeta } = await jsonCompletion(
        buildExtractStatePrompt({
          chapterContent: chapterText,
          chapterNumber: nextChapterNumber,
          activeCharacters: context.activeCharacters,
          activeForeshadows: context.activeForeshadows,
          worldRules: context.worldRules,
        }),
        undefined,
        { ...logContext, stepName: AI_STEPS.STATE_DIFF, stepOrder: 20 }
      );
      totalTokens += stateMeta.usage.totalTokens;

      // === VECTOR MEMORY: Store embeddings ===
      try {
        await vectorMemoryService.storeChapterEmbeddings(
          projectId,
          "temp",
          stateDiff.chapterSummary,
          sceneCards.map((s) => ({
            sceneNumber: s.sceneNumber,
            content: `${s.location}: ${s.conflict} → ${s.infoChange}`,
          })),
          (stateDiff.characterChanges || []).map((c: any) => ({
            characterName: c.characterName,
            change: `${c.field}: ${c.oldValue} → ${c.newValue}`,
          }))
        );
      } catch (e) {
        console.log("[Pipeline] Vector storage skipped:", (e as Error).message);
      }

      // === SAVE ===

      const chapterTitle = `第${nextChapterNumber}章 ${
        CHAPTER_TITLE_MAP[chapterFunction] || "未命名"
      }`;

      const chapter = await chapterService.create({
        projectId,
        chapterNumber: nextChapterNumber,
        title: chapterTitle,
        content: chapterText,
        summary: stateDiff.chapterSummary,
        chapterFunction,
        sceneCards: sceneCards,
        goal: chapterGoal,
        qualityScore: auditResult.finalScore * 10,
      });

      // Update vector memory with actual chapterId
      try {
        await vectorMemoryService.storeChapterEmbeddings(
          projectId,
          chapter.id,
          stateDiff.chapterSummary,
          sceneCards.map((s) => ({
            sceneNumber: s.sceneNumber,
            content: `${s.location}: ${s.conflict} → ${s.infoChange}`,
          })),
          (stateDiff.characterChanges || []).map((c: any) => ({
            characterName: c.characterName,
            change: `${c.field}: ${c.oldValue} → ${c.newValue}`,
          }))
        );
      } catch (e) {
        console.log("[Pipeline] Vector storage with chapterId skipped:", (e as Error).message);
      }

      await prisma.aICallLog.updateMany({
        where: { jobId: logContext.jobId },
        data: { chapterId: chapter.id },
      });

      const legacyAuditReport: AuditReportResult = {
        overallStatus: auditResult.overallStatus,
        qualityScore: auditResult.finalScore * 10,
        mainPlotScore: auditResult.styleReport.mainPlotScore || 0,
        characterChangeScore:
          auditResult.styleReport.characterChangeScore || 0,
        conflictScore: auditResult.styleReport.conflictScore || 0,
        hookScore: auditResult.refineHints.hookScore
          ? auditResult.refineHints.hookScore * 10
          : 0,
        styleConsistencyScore: auditResult.styleScore * 10,
        settingConsistencyScore: auditResult.consistencyScore * 10,
        infoIncrementScore: auditResult.styleReport.infoIncrementScore || 0,
        emotionTensionScore:
          auditResult.styleReport.emotionTensionScore || 0,
        freshnessScore: auditResult.styleReport.freshnessScore || 0,
        readabilityScore: auditResult.refineHints.readabilityScore
          ? auditResult.refineHints.readabilityScore * 10
          : 0,
        risks: [
          ...auditResult.consistencyIssues.map((i: any) => ({
            level: i.severity,
            category: "consistency",
            description: i.description,
            suggestion: i.suggestion,
          })),
          ...auditResult.pacingIssues.map((i: any) => ({
            level: i.severity,
            category: "pacing",
            description: i.description,
            suggestion: i.suggestion,
          })),
        ],
        rewriteActions: [],
      };

      await auditService.saveAuditReport(chapter.id, legacyAuditReport);
      await memoryService.saveStateDiff(chapter.id, stateDiff);

      // === SELF-EVOLUTION: Record execution for prompt evolution ===
      try {
        const { selfEvolution } = await import("./self-evolution");
        const promptVersion = await selfEvolution.getBestPromptVersion("chapter_generation", "writer");
        if (promptVersion) {
          await selfEvolution.recordExecution(promptVersion.id, {
            input: { chapterFunction, chapterGoal: chapterGoal.slice(0, 200) },
            output: { chapterId: chapter.id, qualityScore: auditResult.finalScore * 10 },
            score: auditResult.finalScore,
            tokensUsed: totalTokens,
            durationMs: Date.now() - startTime,
            success: auditResult.overallStatus !== "red",
            errorType: auditResult.overallStatus === "red" ? "quality_check_failed" : undefined,
          });
        }
      } catch (e) {
        console.log("[Pipeline] Self-evolution recording skipped:", (e as Error).message);
      }

      // === META-LEARNING: Record episode ===
      try {
        const { MetaLearner } = await import("./meta-learner");
        const metaLearner = new MetaLearner();
        await metaLearner.recordEpisode({
          projectId,
          chapterId: chapter.id,
          taskType: "chapter_generation",
          input: { chapterFunction, chapterGoal: chapterGoal.slice(0, 200), strategy: strategyRecommendation?.name },
          expectedOutput: { qualityScore: 80 },
          actualOutput: { qualityScore: auditResult.finalScore * 10, driftScore: 0 },
          score: auditResult.finalScore,
          feedback: auditResult.overallStatus,
        });
      } catch (e) {
        console.log("[Pipeline] Meta-learning recording skipped:", (e as Error).message);
      }

      // === AUTO FORESHADOW DETECTION ===
      try {
        await detectAndCreateForeshadows(projectId, chapter.id, chapterText, nextChapterNumber);
      } catch (e) {
        console.log("[Pipeline] Foreshadow detection skipped:", (e as Error).message);
      }

      for (const scene of sceneCards) {
        await chapterService.createScene({
          chapterId: chapter.id,
          sceneNumber: scene.sceneNumber,
          location: scene.location,
          characters: scene.characters,
          conflict: scene.conflict,
          infoChange: scene.infoChange,
          emotionGoal: scene.emotionGoal,
        });
      }

      await projectService.updateStats(projectId, {
        currentChapter: nextChapterNumber,
        totalWords: chapterText.replace(/\s/g, "").length,
      });

      const durationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "completed",
        output: {
          chapterId: chapter.id,
          chapterNumber: nextChapterNumber,
          qualityScore: auditResult.finalScore * 10,
        },
        durationMs,
        tokenCount: totalTokens,
      });

      return {
        chapterTitle,
        chapterFunction,
        chapterGoal,
        sceneCards,
        chapterBody: chapterText,
        qualityScore: auditResult.finalScore * 10,
        auditReport: legacyAuditReport,
        stateDiff,
        nextChapterSeed: stateDiff.nextChapterSuggestion,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "failed",
        errorMessage: (error as Error).message,
        durationMs,
      });
      throw error;
    }
  },

  async confirmAndApplyState(
    projectId: string,
    chapterId: string
  ): Promise<void> {
    const stateDiff = await memoryService.getStateDiff(chapterId);
    if (!stateDiff) {
      throw new Error("章节状态差异不存在");
    }

    await chapterService.confirmChapter(chapterId);
    await memoryService.applyStateDiff(
      chapterId,
      stateDiff as unknown as StateDiffResult
    );

    // Trigger evolution cycle on confirm (non-blocking)
    try {
      const { SelfEvolutionEngine } = await import("./self-evolution-engine");
      const { SelfOrganizingSwarm } = await import("./self-organization");
      const { AdaptivePipeline } = await import("./adaptive-pipeline");
      const { MetaLearner } = await import("./meta-learner");

      const swarm = new SelfOrganizingSwarm();
      const adaptivePipeline = new AdaptivePipeline(swarm);
      const metaLearner = new MetaLearner();
      const engine = new SelfEvolutionEngine(swarm, adaptivePipeline, metaLearner);

      await engine.runEvolutionCycle(projectId);
      console.log("[Pipeline] Evolution cycle triggered on confirm");
    } catch (e) {
      console.log("[Pipeline] Evolution cycle skipped:", (e as Error).message);
    }
  },
};

// === AI FORESHADOW DETECTION ===
async function detectAndCreateForeshadows(
  projectId: string,
  chapterId: string,
  chapterText: string,
  chapterNumber: number
): Promise<void> {
  const { data } = await jsonCompletion([
    {
      role: "system",
      content: `你是一个专业的伏笔识别专家。你从小说章节中识别潜在的伏笔线索。
      伏笔定义：当前章节中提到的、可能在后续章节产生重要影响的线索、暗示、异常或未完成的事件。
      只识别真正有伏笔潜力的内容，不要过度解读。
      输出格式：{"foreshadows": [{"clueText": "伏笔文本", "surfaceMeaning": "表面意思", "trueMeaning": "潜在含义", "relatedCharacters": ["角色名"], "expectedPayoffStart": 章节数, "expectedPayoffEnd": 章节数, "heatScore": 0-1, "urgencyScore": 0-1}]}`
    },
    {
      role: "user",
      content: `请从以下第${chapterNumber}章内容中识别潜在的伏笔线索：\n\n${chapterText.slice(0, 5000)}`
    }
  ]);

  if (!data.foreshadows || data.foreshadows.length === 0) return;

  for (const fw of data.foreshadows) {
    try {
      await prisma.foreshadow.create({
        data: {
          projectId,
          clueText: fw.clueText,
          surfaceMeaning: fw.surfaceMeaning,
          trueMeaning: fw.trueMeaning,
          relatedCharacters: fw.relatedCharacters || [],
          plantedChapter: chapterNumber,
          expectedPayoffStart: fw.expectedPayoffStart || chapterNumber + 3,
          expectedPayoffEnd: fw.expectedPayoffEnd || chapterNumber + 10,
          heatScore: fw.heatScore || 0.5,
          urgencyScore: fw.urgencyScore || 0.3,
          status: "planted",
        },
      });
      console.log(`[Pipeline] Auto-created foreshadow: ${fw.clueText.slice(0, 50)}...`);
    } catch (e) {
      console.log("[Pipeline] Foreshadow creation failed:", (e as Error).message);
    }
  }
}
