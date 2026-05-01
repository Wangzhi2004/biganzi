import { NextRequest } from "next/server";
import { streamChatCompletion, type LogContext } from "@/lib/ai";
import {
  buildDNAPrompt,
  buildDNASceneCardsPrompt,
  buildChapterFunctionPrompt,
  buildChapterGoalPrompt,
  buildPlannerSceneCardsPrompt,
  buildWriteChapterPrompt,
  buildStyleDriftCheckPrompt,
  buildStyleAlignPrompt,
  buildAuditPrompt,
  buildExtractStatePrompt,
  buildRewritePrompt,
} from "@/lib/ai/prompts";
import { projectService } from "@/lib/services/project.service";
import { chapterService } from "@/lib/services/chapter.service";
import { styleService } from "@/lib/services/style.service";
import { generationService } from "@/lib/services/generation.service";
import { contextBuilder } from "@/lib/orchestrator/context-builder";
import { prisma } from "@/lib/prisma";
import { getModelConfig } from "@/lib/ai/gateway";

const CHAPTER_FUNCTION_MAP: Record<string, string> = {
  main_plot: "MAIN_PLOT",
  character_turn: "CHARACTER_TURN",
  foreshadow_plant: "FORESHADOW_PLANT",
  foreshadow_payoff: "FORESHADOW_PAYOFF",
  pleasure_burst: "PLEASURE_BURST",
  crisis_upgrade: "CRISIS_UPGRADE",
  world_expansion: "WORLD_EXPANSION",
  relationship_advance: "RELATIONSHIP_ADVANCE",
  villain_pressure: "VILLAIN_PRESSURE",
  emotional_settle: "EMOTIONAL_SETTLE",
  phase_close: "PHASE_CLOSE",
  new_arc_open: "NEW_ARC_OPEN",
};

interface SSEEvent {
  event: string;
  data: any;
}

function createSSEResponse(handler: (controller: ReadableStreamDefaultController, sendEvent: (event: string, data: any) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        if (closed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {}
      };

      try {
        await handler(controller, sendEvent);
      } catch (error) {
        sendEvent("error", {
          message: (error as Error).message || "未知错误",
          step: "unknown",
        });
      } finally {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "项目ID是必需的" }), { status: 400 });
  }

  const body = await request.json();
  const { genre, idea, targetWords, targetReader, style, sampleChapter } = body;

  if (!genre || !idea || !targetWords || !targetReader || !style) {
    return new Response(JSON.stringify({ error: "缺少必需的初始化参数" }), { status: 400 });
  }

  return createSSEResponse(async (controller, sendEvent) => {
    const startTime = Date.now();

    // Step 0: Connection check
    try {
      const config = getModelConfig();
      sendEvent("connected", {
        message: "AI 服务连接正常",
        model: config.model,
        baseURL: config.baseURL,
      });
    } catch (e) {
      sendEvent("error", { message: "AI 配置异常: " + (e as Error).message, step: "connect" });
      return;
    }

    // Create project name
    const name = idea.slice(0, 50);
    await projectService.update(id, { name });

    const jobId = await generationService.createJob({
      projectId: id,
      jobType: "initialize",
      inputContext: { genre, idea, targetWords, targetReader, style },
    });

    const logContext: LogContext = { jobId, projectId: id };

    try {
      // ─── STEP 1: DNA Generation ───
      const dnaMessages = buildDNAPrompt({
        genre, idea, targetWords: parseInt(targetWords), targetReader, style, sampleChapter,
      });

      sendEvent("step_start", { step: "DNA_GENERATION", order: 1, label: "作品DNA生成" });
      sendEvent("prompt", { step: "DNA_GENERATION", messages: dnaMessages });

      let dnaAccumulated = "";
      const dnaResult = await streamChatCompletion(
        dnaMessages,
        { responseFormat: { type: "json_object" } },
        { ...logContext, stepName: "DNA_GENERATION", stepOrder: 1 },
        {
          onToken: (delta, acc) => {
            dnaAccumulated = acc;
            sendEvent("token", { step: "DNA_GENERATION", delta, accumulated: acc });
          },
        }
      );

      let dnaData: any;
      try {
        dnaData = JSON.parse(dnaAccumulated);
      } catch {
        throw new Error("DNA 生成结果解析失败");
      }

      sendEvent("step_end", {
        step: "DNA_GENERATION", order: 1,
        durationMs: dnaResult.durationMs,
        tokens: dnaResult.usage.totalTokens,
      });

      // Save DNA to DB
      const bookDna = await prisma.bookDNA.upsert({
        where: { projectId: id },
        create: {
          projectId: id,
          genre: dnaData.genre,
          subGenre: dnaData.subGenre,
          targetPlatform: dnaData.targetPlatform,
          targetWords: dnaData.targetWords,
          updateRhythm: dnaData.updateRhythm,
          coreHook: dnaData.coreHook,
          protagonistTheme: dnaData.protagonistTheme,
          finalEmotion: dnaData.finalEmotion,
          mainlineQuestion: dnaData.mainlineQuestion,
          worldKeywords: dnaData.worldKeywords,
          pleasureMechanism: dnaData.pleasureMechanism,
          emotionMechanism: dnaData.emotionMechanism,
          forbiddenRules: dnaData.forbiddenRules,
          styleDirection: dnaData.styleDirection,
          targetReaderProfile: dnaData.targetReaderProfile,
          readerPromises: dnaData.readerPromises,
        },
        update: {
          genre: dnaData.genre,
          subGenre: dnaData.subGenre,
          targetPlatform: dnaData.targetPlatform,
          targetWords: dnaData.targetWords,
          updateRhythm: dnaData.updateRhythm,
          coreHook: dnaData.coreHook,
          protagonistTheme: dnaData.protagonistTheme,
          finalEmotion: dnaData.finalEmotion,
          mainlineQuestion: dnaData.mainlineQuestion,
          worldKeywords: dnaData.worldKeywords,
          pleasureMechanism: dnaData.pleasureMechanism,
          emotionMechanism: dnaData.emotionMechanism,
          forbiddenRules: dnaData.forbiddenRules,
          styleDirection: dnaData.styleDirection,
          targetReaderProfile: dnaData.targetReaderProfile,
          readerPromises: dnaData.readerPromises,
        },
      });

      // Save protagonist
      if (dnaData.protagonist) {
        const protag = dnaData.protagonist;
        await prisma.character.create({
          data: {
            projectId: id,
            name: protag.name,
            aliases: protag.aliases || [],
            roleType: protag.roleType || "主角",
            desire: protag.desire,
            fear: protag.fear,
            wound: protag.wound,
            secret: protag.secret,
            speechPattern: protag.speechPattern,
            currentGoal: protag.currentGoal,
            powerLevel: protag.powerLevel,
            firstSeenChapter: 1,
            lastSeenChapter: 0,
          },
        });
      }

      // Save world rules
      if (dnaData.worldRules && Array.isArray(dnaData.worldRules)) {
        for (const rule of dnaData.worldRules) {
          await prisma.worldRule.create({
            data: { projectId: id, category: rule.category, content: rule.content, status: "CONFIRMED" },
          });
        }
      }

      // Save volume & chapter plan
      let volumeId: string | undefined;
      if (dnaData.volumeOutline) {
        const volume = await prisma.volume.create({
          data: {
            projectId: id, volumeNumber: 1,
            title: dnaData.volumeOutline.title,
            summary: dnaData.volumeOutline.summary,
            goal: dnaData.volumeOutline.goal,
          },
        });
        volumeId = volume.id;
      }

      if (dnaData.chapterPlan && Array.isArray(dnaData.chapterPlan)) {
        for (const chPlan of dnaData.chapterPlan) {
          const prismaFunction = CHAPTER_FUNCTION_MAP[chPlan.chapterFunction] || "MAIN_PLOT";
          await prisma.chapter.create({
            data: {
              projectId: id, volumeId,
              chapterNumber: chPlan.chapterNumber,
              title: chPlan.title,
              chapterFunction: prismaFunction as any,
              summary: chPlan.briefGoal,
            },
          });
        }
      }

      // ─── STEP 2: Scene Cards ───
      if (dnaData.chapterPlan && dnaData.chapterPlan.length >= 5) {
        const firstChapterPlan = dnaData.chapterPlan[0];
        const sceneMessages = buildDNASceneCardsPrompt(dnaData, firstChapterPlan, 1);

        sendEvent("step_start", { step: "SCENE_CARDS", order: 2, label: "场景卡设计" });
        sendEvent("prompt", { step: "SCENE_CARDS", messages: sceneMessages });

        let sceneAccumulated = "";
        const sceneResult = await streamChatCompletion(
          sceneMessages,
          { responseFormat: { type: "json_object" } },
          { ...logContext, stepName: "SCENE_CARDS", stepOrder: 2 },
          {
            onToken: (delta, acc) => {
              sceneAccumulated = acc;
              sendEvent("token", { step: "SCENE_CARDS", delta, accumulated: acc });
            },
          }
        );

        let sceneData: any;
        try {
          sceneData = JSON.parse(sceneAccumulated);
        } catch {
          sceneData = { sceneCards: [] };
        }

        sendEvent("step_end", {
          step: "SCENE_CARDS", order: 2,
          durationMs: sceneResult.durationMs,
          tokens: sceneResult.usage.totalTokens,
        });

        if (sceneData.sceneCards) {
          const firstChapter = await prisma.chapter.findFirst({
            where: { projectId: id, chapterNumber: 1 },
          });
          if (firstChapter) {
            await chapterService.update(firstChapter.id, { sceneCards: sceneData.sceneCards });
          }
        }
      }

      // Save style
      const defaultStyle = getDefaultStyle(style);
      await styleService.createOrUpdate(id, defaultStyle);

      // ─── STEP 3: Chapter Generation (inline pipeline with streaming) ───
      const chapterStartTime = Date.now();
      let totalChapterTokens = 0;

      // Build context
      const context = await contextBuilder.buildChapterContext(id, 1);

      // 3a. Chapter Function
      const funcMessages = buildChapterFunctionPrompt(context);
      sendEvent("prompt", { step: "CHAPTER_FUNCTION", messages: funcMessages });

      let funcAccumulated = "";
      const funcResult = await streamChatCompletion(
        funcMessages,
        { responseFormat: { type: "json_object" } },
        { ...logContext, stepName: "chapter_function", stepOrder: 3 },
        {
          onToken: (delta, acc) => {
            funcAccumulated = acc;
            sendEvent("token", { step: "CHAPTER_FUNCTION", delta, accumulated: acc });
          },
        }
      );
      totalChapterTokens += funcResult.usage.totalTokens;

      let funcData: any;
      try { funcData = JSON.parse(funcAccumulated); } catch { funcData = { suggestedFunction: "main_plot", reasoning: "" }; }

      sendEvent("step_end", {
        step: "CHAPTER_FUNCTION", order: 3,
        durationMs: funcResult.durationMs,
        tokens: funcResult.usage.totalTokens,
      });

      const chapterFunction = funcData.suggestedFunction;

      // 3b. Chapter Goal
      const goalMessages = buildChapterGoalPrompt({ ...context, chapterFunction });
      sendEvent("prompt", { step: "CHAPTER_GOAL", messages: goalMessages });

      let goalAccumulated = "";
      const goalResult = await streamChatCompletion(
        goalMessages,
        { responseFormat: { type: "json_object" } },
        { ...logContext, stepName: "chapter_goal", stepOrder: 4 },
        {
          onToken: (delta, acc) => {
            goalAccumulated = acc;
            sendEvent("token", { step: "CHAPTER_GOAL", delta, accumulated: acc });
          },
        }
      );
      totalChapterTokens += goalResult.usage.totalTokens;

      let goalData: any;
      try { goalData = JSON.parse(goalAccumulated); } catch { goalData = { chapterGoal: "", mustHappen: [], mustNotHappen: [], endingHook: {} }; }

      sendEvent("step_end", {
        step: "CHAPTER_GOAL", order: 4,
        durationMs: goalResult.durationMs,
        tokens: goalResult.usage.totalTokens,
      });

      const chapterGoal = goalData.chapterGoal;

      // 3c. Scene Cards for chapter
      const planSceneMessages = buildPlannerSceneCardsPrompt({ ...context, chapterGoal, chapterFunction });
      sendEvent("prompt", { step: "PLANNER_SCENE_CARDS", messages: planSceneMessages });

      let planSceneAccumulated = "";
      const planSceneResult = await streamChatCompletion(
        planSceneMessages,
        { responseFormat: { type: "json_object" } },
        { ...logContext, stepName: "scene_cards", stepOrder: 5 },
        {
          onToken: (delta, acc) => {
            planSceneAccumulated = acc;
            sendEvent("token", { step: "PLANNER_SCENE_CARDS", delta, accumulated: acc });
          },
        }
      );
      totalChapterTokens += planSceneResult.usage.totalTokens;

      let planSceneData: any;
      try { planSceneData = JSON.parse(planSceneAccumulated); } catch { planSceneData = { sceneCards: [] }; }

      sendEvent("step_end", {
        step: "PLANNER_SCENE_CARDS", order: 5,
        durationMs: planSceneResult.durationMs,
        tokens: planSceneResult.usage.totalTokens,
      });

      const sceneCards = planSceneData.sceneCards || [];

      // 3d. Write Chapter Body
      const writeMessages = buildWriteChapterPrompt({
        bookDna: context.bookDna,
        chapterGoal,
        sceneCards,
        activeCharacters: context.activeCharacters,
        styleFingerprint: context.styleFingerprint,
        recentChapters: context.lastChapters,
        worldRules: context.worldRules,
      });
      sendEvent("prompt", { step: "CHAPTER_BODY", messages: writeMessages });

      let chapterText = "";
      const writeResult = await streamChatCompletion(
        writeMessages,
        undefined,
        { ...logContext, stepName: "chapter_body", stepOrder: 6 },
        {
          onToken: (delta, acc) => {
            chapterText = acc;
            sendEvent("token", { step: "CHAPTER_BODY", delta, accumulated: acc });
          },
        }
      );
      totalChapterTokens += writeResult.usage.totalTokens;

      sendEvent("step_end", {
        step: "CHAPTER_BODY", order: 6,
        durationMs: writeResult.durationMs,
        tokens: writeResult.usage.totalTokens,
      });

      // 3e. Style Drift Check
      const driftMessages = buildStyleDriftCheckPrompt({
        text: chapterText,
        styleFingerprint: context.styleFingerprint,
      });
      sendEvent("prompt", { step: "STYLE_DRIFT_CHECK", messages: driftMessages });

      let driftAccumulated = "";
      const driftResult = await streamChatCompletion(
        driftMessages,
        { responseFormat: { type: "json_object" } },
        { ...logContext, stepName: "style_drift_check", stepOrder: 7 },
        {
          onToken: (delta, acc) => {
            driftAccumulated = acc;
            sendEvent("token", { step: "STYLE_DRIFT_CHECK", delta, accumulated: acc });
          },
        }
      );
      totalChapterTokens += driftResult.usage.totalTokens;

      let driftData: any;
      try { driftData = JSON.parse(driftAccumulated); } catch { driftData = { driftScore: 0 }; }

      sendEvent("step_end", {
        step: "STYLE_DRIFT_CHECK", order: 7,
        durationMs: driftResult.durationMs,
        tokens: driftResult.usage.totalTokens,
      });

      // 3f. Style alignment if needed
      if (driftData.driftScore > 30) {
        const alignMessages = buildStyleAlignPrompt({
          text: chapterText,
          styleFingerprint: context.styleFingerprint,
          direction: "全面对齐",
        });
        sendEvent("prompt", { step: "STYLE_ALIGN", messages: alignMessages });

        let alignedText = "";
        const alignResult = await streamChatCompletion(
          alignMessages,
          undefined,
          { ...logContext, stepName: "style_align", stepOrder: 8 },
          {
            onToken: (delta, acc) => {
              alignedText = acc;
              sendEvent("token", { step: "STYLE_ALIGN", delta, accumulated: acc });
            },
          }
        );
        totalChapterTokens += alignResult.usage.totalTokens;
        chapterText = alignedText;

        sendEvent("step_end", {
          step: "STYLE_ALIGN", order: 8,
          durationMs: alignResult.durationMs,
          tokens: alignResult.usage.totalTokens,
        });
      }

      // 3g. Audit
      const auditMessages = buildAuditPrompt({
        chapterContent: chapterText,
        chapterGoal,
        bookDna: context.bookDna,
        activeCharacters: context.activeCharacters,
        activeForeshadows: context.activeForeshadows,
        worldRules: context.worldRules,
        styleFingerprint: context.styleFingerprint,
        recentChapters: context.lastChapters,
      });
      sendEvent("prompt", { step: "AUDIT", messages: auditMessages });

      let auditAccumulated = "";
      const auditResult = await streamChatCompletion(
        auditMessages,
        { responseFormat: { type: "json_object" } },
        { ...logContext, stepName: "audit", stepOrder: 9 },
        {
          onToken: (delta, acc) => {
            auditAccumulated = acc;
            sendEvent("token", { step: "AUDIT", delta, accumulated: acc });
          },
        }
      );
      totalChapterTokens += auditResult.usage.totalTokens;

      let auditReport: any;
      try { auditReport = JSON.parse(auditAccumulated); } catch { auditReport = { qualityScore: 70, risks: [], rewriteActions: [] }; }

      sendEvent("step_end", {
        step: "AUDIT", order: 9,
        durationMs: auditResult.durationMs,
        tokens: auditResult.usage.totalTokens,
      });

      // Rewrite if quality < 70
      let qualityScore = auditReport.qualityScore || 70;
      if (qualityScore < 70 && auditReport.rewriteActions?.length > 0) {
        const rewriteInstructions = auditReport.rewriteActions
          .sort((a: any, b: any) => a.priority - b.priority)
          .slice(0, 3)
          .map((a: any) => `${a.action}: ${a.reason}`)
          .join("\n");

        const rewriteMessages = buildRewritePrompt({
          originalText: chapterText,
          instruction: rewriteInstructions,
          chapterGoal,
          styleFingerprint: context.styleFingerprint,
        });
        sendEvent("prompt", { step: "REWRITE", messages: rewriteMessages });

        let rewrittenText = "";
        const rewriteResult = await streamChatCompletion(
          rewriteMessages,
          undefined,
          { ...logContext, stepName: "rewrite", stepOrder: 10 },
          {
            onToken: (delta, acc) => {
              rewrittenText = acc;
              sendEvent("token", { step: "REWRITE", delta, accumulated: acc });
            },
          }
        );
        totalChapterTokens += rewriteResult.usage.totalTokens;
        chapterText = rewrittenText;

        sendEvent("step_end", {
          step: "REWRITE", order: 10,
          durationMs: rewriteResult.durationMs,
          tokens: rewriteResult.usage.totalTokens,
        });
      }

      // 3h. State Diff
      const stateMessages = buildExtractStatePrompt({
        chapterContent: chapterText,
        chapterNumber: 1,
        activeCharacters: context.activeCharacters,
        activeForeshadows: context.activeForeshadows,
        worldRules: context.worldRules,
      });
      sendEvent("prompt", { step: "STATE_DIFF", messages: stateMessages });

      let stateAccumulated = "";
      const stateResult = await streamChatCompletion(
        stateMessages,
        { responseFormat: { type: "json_object" } },
        { ...logContext, stepName: "state_diff", stepOrder: 11 },
        {
          onToken: (delta, acc) => {
            stateAccumulated = acc;
            sendEvent("token", { step: "STATE_DIFF", delta, accumulated: acc });
          },
        }
      );
      totalChapterTokens += stateResult.usage.totalTokens;

      let stateDiff: any;
      try { stateDiff = JSON.parse(stateAccumulated); } catch { stateDiff = { chapterSummary: "", newFacts: [] }; }

      sendEvent("step_end", {
        step: "STATE_DIFF", order: 11,
        durationMs: stateResult.durationMs,
        tokens: stateResult.usage.totalTokens,
      });

      // Save chapter to DB
      const CHAPTER_TITLE_MAP: Record<string, string> = {
        main_plot: "主线推进", character_turn: "人物转折",
        foreshadow_plant: "伏笔埋设", foreshadow_payoff: "伏笔回收",
        pleasure_burst: "爽点爆发", crisis_upgrade: "危机升级",
        world_expansion: "世界观扩展", relationship_advance: "关系推进",
        villain_pressure: "反派施压", emotional_settle: "情感沉淀",
        phase_close: "阶段收束", new_arc_open: "新弧开启",
      };

      const chapterTitle = `第1章 ${CHAPTER_TITLE_MAP[chapterFunction] || "未命名"}`;

      const chapter = await chapterService.create({
        projectId: id,
        chapterNumber: 1,
        title: chapterTitle,
        content: chapterText,
        summary: stateDiff.chapterSummary,
        chapterFunction,
        sceneCards,
        goal: chapterGoal,
        qualityScore,
      });

      await projectService.update(id, { status: "active" });

      // ─── COMPLETE ───
      const totalDurationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "completed",
        output: { dnaGenerated: true, firstChapterGenerated: true, chapterId: chapter.id },
        durationMs: totalDurationMs,
        tokenCount: totalChapterTokens,
      });

      sendEvent("complete", {
        projectId: id,
        jobId,
        data: {
          dna: bookDna,
          firstChapter: {
            chapterTitle,
            chapterBody: chapterText,
            sceneCards,
            chapterGoal,
            qualityScore,
            auditReport,
            stateDiff,
          },
        },
        durationMs: totalDurationMs,
      });

    } catch (error) {
      const durationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "failed",
        errorMessage: (error as Error).message,
        durationMs,
      }).catch(() => {});

      sendEvent("error", {
        message: (error as Error).message || "生成失败",
        step: "unknown",
        durationMs,
      });
    }
  });
}

function getDefaultStyle(styleName: string) {
  const styles: Record<string, any> = {
    玄幻爽文: {
      narrativePOV: "第三人称有限", narrativeDistance: "近", avgSentenceLength: 15,
      dialogueRatio: 0.4, psychologicalRatio: 0.2, actionRatio: 0.3, environmentRatio: 0.1,
      infoDensity: 0.3, emotionExposure: 0.8, humorLevel: 0.3,
      rhetoricSystem: { metaphor: "moderate", parallelism: "frequent" },
      commonWords: ["气势", "威压", "震惊", "不可能", "怎么可能"],
      bannedWords: ["突然", "忽然", "于是", "接着"],
      chapterEndStyle: "cliffhanger", battleStyle: "dynamic", romanceStyle: "subtle", mysteryStyle: "none",
      presetName: "玄幻爽文",
    },
    都市言情: {
      narrativePOV: "第三人称有限", narrativeDistance: "近", avgSentenceLength: 18,
      dialogueRatio: 0.5, psychologicalRatio: 0.3, actionRatio: 0.1, environmentRatio: 0.1,
      infoDensity: 0.4, emotionExposure: 0.9, humorLevel: 0.5,
      rhetoricSystem: { metaphor: "frequent", parallelism: "moderate" },
      commonWords: ["心跳", "呼吸", "目光", "温柔", "嘴角微扬"],
      bannedWords: ["说道", "喊道", "吼道"],
      chapterEndStyle: "emotional_hook", battleStyle: "none", romanceStyle: "intense", mysteryStyle: "none",
      presetName: "都市言情",
    },
    悬疑推理: {
      narrativePOV: "第一人称", narrativeDistance: "极近", avgSentenceLength: 20,
      dialogueRatio: 0.45, psychologicalRatio: 0.25, actionRatio: 0.15, environmentRatio: 0.15,
      infoDensity: 0.7, emotionExposure: 0.5, humorLevel: 0.2,
      rhetoricSystem: { metaphor: "subtle", parallelism: "rare" },
      commonWords: ["线索", "疑点", "证据", "推理", "真相"],
      bannedWords: ["显然", "明显", "毫无疑问"],
      chapterEndStyle: "revelation_hook", battleStyle: "psychological", romanceStyle: "subtle", mysteryStyle: "detailed",
      presetName: "悬疑推理",
    },
    历史权谋: {
      narrativePOV: "第三人称全知", narrativeDistance: "中", avgSentenceLength: 22,
      dialogueRatio: 0.35, psychologicalRatio: 0.2, actionRatio: 0.2, environmentRatio: 0.25,
      infoDensity: 0.6, emotionExposure: 0.4, humorLevel: 0.2,
      rhetoricSystem: { metaphor: "classical", parallelism: "frequent" },
      commonWords: ["朝堂", "权谋", "势力", "暗棋", "大局"],
      bannedWords: ["然后", "所以", "因为"],
      chapterEndStyle: "political_tension", battleStyle: "strategic", romanceStyle: "restrained", mysteryStyle: "political",
      presetName: "历史权谋",
    },
  };
  return styles[styleName] || styles["玄幻爽文"];
}
