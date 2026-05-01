import { NextRequest, NextResponse } from "next/server";
import { jsonCompletion, type LogContext } from "@/lib/ai";
import {
  buildDNAPrompt,
  buildDNASceneCardsPrompt,
} from "@/lib/ai/prompts";
import { projectService } from "@/lib/services/project.service";
import { chapterService } from "@/lib/services/chapter.service";
import { styleService } from "@/lib/services/style.service";
import { generationService } from "@/lib/services/generation.service";
import { pipeline } from "@/lib/orchestrator/pipeline";
import { prisma } from "@/lib/prisma";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { genre, idea, targetWords, targetReader, style, sampleChapter } = body;

    if (!genre || !idea || !targetWords || !targetReader || !style) {
      return NextResponse.json(
        { error: "缺少必需的初始化参数" },
        { status: 400 }
      );
    }

    const project = await projectService.getById(id);

    const jobId = await generationService.createJob({
      projectId: id,
      jobType: "initialize",
      inputContext: { genre, idea, targetWords, targetReader, style },
    });

    try {
      const name = idea.slice(0, 50);
      await projectService.update(id, { name });

      const logContext: LogContext = {
        jobId,
        projectId: id,
      };

      const { data: dnaData, meta: dnaMeta } = await jsonCompletion(
        buildDNAPrompt({
          genre,
          idea,
          targetWords,
          targetReader,
          style,
          sampleChapter,
        }),
        undefined,
        { ...logContext, stepName: "DNA_GENERATION", stepOrder: 1 }
      );

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

      if (dnaData.worldRules && Array.isArray(dnaData.worldRules)) {
        for (const rule of dnaData.worldRules) {
          await prisma.worldRule.create({
            data: {
              projectId: id,
              category: rule.category,
              content: rule.content,
              status: "CONFIRMED",
            },
          });
        }
      }

      let volumeId: string | undefined;
      if (dnaData.volumeOutline) {
        const volume = await prisma.volume.create({
          data: {
            projectId: id,
            volumeNumber: 1,
            title: dnaData.volumeOutline.title,
            summary: dnaData.volumeOutline.summary,
            goal: dnaData.volumeOutline.goal,
          },
        });
        volumeId = volume.id;
      }

      if (dnaData.chapterPlan && Array.isArray(dnaData.chapterPlan)) {
        for (const chPlan of dnaData.chapterPlan) {
          const prismaFunction =
            CHAPTER_FUNCTION_MAP[chPlan.chapterFunction] || "MAIN_PLOT";

          await prisma.chapter.create({
            data: {
              projectId: id,
              volumeId,
              chapterNumber: chPlan.chapterNumber,
              title: chPlan.title,
              chapterFunction: prismaFunction as any,
              summary: chPlan.briefGoal,
            },
          });
        }
      }

      if (dnaData.chapterPlan && dnaData.chapterPlan.length >= 5) {
        const firstChapterPlan = dnaData.chapterPlan[0];
        const { data: sceneData } = await jsonCompletion(
          buildDNASceneCardsPrompt(dnaData, firstChapterPlan, 1),
          undefined,
          { ...logContext, stepName: "SCENE_CARDS", stepOrder: 6 }
        );

        if (sceneData.sceneCards) {
          const firstChapter = await prisma.chapter.findFirst({
            where: { projectId: id, chapterNumber: 1 },
          });

          if (firstChapter) {
            await chapterService.update(firstChapter.id, {
              sceneCards: sceneData.sceneCards,
            });
          }
        }
      }

      const defaultStyle = getDefaultStyle(style);
      await styleService.createOrUpdate(id, defaultStyle);

      const firstChapter = await pipeline.generateNextChapter(id, {
        jobId,
        projectId: id,
      });

      await projectService.update(id, { status: "active" });

      const durationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "completed",
        output: {
          dnaGenerated: true,
          firstChapterGenerated: true,
          chapterId: firstChapter.chapterTitle,
        },
        durationMs,
        tokenCount: dnaMeta.usage.totalTokens,
      });

      return NextResponse.json({
        success: true,
        data: {
          projectId: id,
          jobId,
          dna: bookDna,
          firstChapter,
          message: "项目初始化完成，第一章已生成",
        },
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "failed",
        errorMessage: (error as Error).message,
        durationMs,
      });
      throw error;
    }
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("不存在")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    console.error("[INITIALIZE_PROJECT_ERROR]", error);
    return NextResponse.json(
      { error: "项目初始化失败，请稍后重试" },
      { status: 500 }
    );
  }
}

function getDefaultStyle(styleName: string) {
  const styles: Record<string, any> = {
    玄幻爽文: {
      narrativePOV: "第三人称有限",
      narrativeDistance: "近",
      avgSentenceLength: 15,
      dialogueRatio: 0.4,
      psychologicalRatio: 0.2,
      actionRatio: 0.3,
      environmentRatio: 0.1,
      infoDensity: 0.3,
      emotionExposure: 0.8,
      humorLevel: 0.3,
      rhetoricSystem: { metaphor: "moderate", parallelism: "frequent" },
      commonWords: ["气势", "威压", "震惊", "不可能", "怎么可能"],
      bannedWords: ["突然", "忽然", "于是", "接着"],
      chapterEndStyle: "cliffhanger",
      battleStyle: "dynamic",
      romanceStyle: "subtle",
      mysteryStyle: "none",
      presetName: "玄幻爽文",
    },
    都市言情: {
      narrativePOV: "第三人称有限",
      narrativeDistance: "近",
      avgSentenceLength: 18,
      dialogueRatio: 0.5,
      psychologicalRatio: 0.3,
      actionRatio: 0.1,
      environmentRatio: 0.1,
      infoDensity: 0.4,
      emotionExposure: 0.9,
      humorLevel: 0.5,
      rhetoricSystem: { metaphor: "frequent", parallelism: "moderate" },
      commonWords: ["心跳", "呼吸", "目光", "温柔", "嘴角微扬"],
      bannedWords: ["说道", "喊道", "吼道"],
      chapterEndStyle: "emotional_hook",
      battleStyle: "none",
      romanceStyle: "intense",
      mysteryStyle: "none",
      presetName: "都市言情",
    },
    悬疑推理: {
      narrativePOV: "第一人称",
      narrativeDistance: "极近",
      avgSentenceLength: 20,
      dialogueRatio: 0.45,
      psychologicalRatio: 0.25,
      actionRatio: 0.15,
      environmentRatio: 0.15,
      infoDensity: 0.7,
      emotionExposure: 0.5,
      humorLevel: 0.2,
      rhetoricSystem: { metaphor: "subtle", parallelism: "rare" },
      commonWords: ["线索", "疑点", "证据", "推理", "真相"],
      bannedWords: ["显然", "明显", "毫无疑问"],
      chapterEndStyle: "revelation_hook",
      battleStyle: "psychological",
      romanceStyle: "subtle",
      mysteryStyle: "detailed",
      presetName: "悬疑推理",
    },
    历史权谋: {
      narrativePOV: "第三人称全知",
      narrativeDistance: "中",
      avgSentenceLength: 22,
      dialogueRatio: 0.35,
      psychologicalRatio: 0.2,
      actionRatio: 0.2,
      environmentRatio: 0.25,
      infoDensity: 0.6,
      emotionExposure: 0.4,
      humorLevel: 0.2,
      rhetoricSystem: { metaphor: "classical", parallelism: "frequent" },
      commonWords: ["朝堂", "权谋", "势力", "暗棋", "大局"],
      bannedWords: ["然后", "所以", "因为"],
      chapterEndStyle: "political_tension",
      battleStyle: "strategic",
      romanceStyle: "restrained",
      mysteryStyle: "political",
      presetName: "历史权谋",
    },
  };

  return styles[styleName] || styles["玄幻爽文"];
}
