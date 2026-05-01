import { chatCompletion, jsonCompletion, type LogContext } from "@/lib/ai";
import {
  buildChapterFunctionPrompt,
  buildChapterGoalPrompt,
  buildPlannerSceneCardsPrompt,
  buildWriteChapterPrompt,
  buildMultiDraftJudgePrompt,
  buildExtractStatePrompt,
} from "@/lib/ai/prompts";
import { contextBuilder } from "./context-builder";
import { refinePasses } from "./refine-passes";
import { multiRoundAudit } from "./multi-round-audit";
import { chapterService } from "@/lib/services/chapter.service";
import { memoryService } from "@/lib/services/memory.service";
import { auditService } from "@/lib/services/audit.service";
import { projectService } from "@/lib/services/project.service";
import { generationService } from "@/lib/services/generation.service";
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
              recentChapters: context.lastChapters,
              worldRules: context.worldRules,
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
            recentChapters: context.lastChapters,
            worldRules: context.worldRules,
          }),
          undefined,
          { ...logContext, stepName: AI_STEPS.CHAPTER_BODY, stepOrder: 4 }
        );
        totalTokens += usage.totalTokens;
        chapterText = content;
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
            recentChapters: context.lastChapters,
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

      // Store embeddings for vector memory (non-blocking)
      try {
        const { vectorMemoryService } = await import("@/lib/services/vector-memory.service");
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
        console.log("[VectorMemory] Embedding storage skipped:", (e as Error).message);
      }

      // Record for self-evolution system (non-blocking)
      try {
        const { MetaLearner } = await import("./meta-learner");
        const metaLearner = new MetaLearner();
        await metaLearner.recordEpisode({
          projectId,
          chapterId: chapter.id,
          taskType: "chapter_generation",
          input: { chapterFunction, chapterGoal: chapterGoal.slice(0, 200) },
          expectedOutput: { qualityScore: 80 },
          actualOutput: { qualityScore: auditResult.finalScore * 10 },
          score: auditResult.finalScore,
          feedback: auditResult.overallStatus,
        });
      } catch (e) {
        console.log("[Evolution] Episode recording skipped:", (e as Error).message);
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
  },
};
