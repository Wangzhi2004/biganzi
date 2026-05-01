import { prisma } from "@/lib/prisma";
import type { StylePreset } from "@/types";

const STYLE_PRESETS: StylePreset[] = [
  {
    name: "玄幻爽文",
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
  },
  {
    name: "都市言情",
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
  },
  {
    name: "悬疑推理",
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
  },
  {
    name: "历史权谋",
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
  },
];

export const styleService = {
  async getPresets(): Promise<StylePreset[]> {
    return STYLE_PRESETS;
  },

  async getByProject(projectId: string) {
    try {
      return await prisma.styleFingerprint.findUnique({
        where: { projectId },
      });
    } catch (error) {
      throw new Error(`获取项目风格指纹失败: ${(error as Error).message}`);
    }
  },

  async createOrUpdate(projectId: string, data: Record<string, unknown>) {
    try {
      return await prisma.styleFingerprint.upsert({
        where: { projectId },
        create: {
          projectId,
          narrativePOV: data.narrativePOV as string,
          narrativeDistance: data.narrativeDistance as string,
          avgSentenceLength: data.avgSentenceLength as number,
          dialogueRatio: data.dialogueRatio as number,
          psychologicalRatio: data.psychologicalRatio as number,
          actionRatio: data.actionRatio as number,
          environmentRatio: data.environmentRatio as number,
          infoDensity: data.infoDensity as number,
          emotionExposure: data.emotionExposure as number,
          humorLevel: data.humorLevel as number,
          rhetoricSystem: data.rhetoriumSystem ?? data.rhetoricSystem ?? {},
          commonWords: data.commonWords ?? [],
          bannedWords: data.bannedWords ?? [],
          chapterEndStyle: data.chapterEndStyle as string,
          battleStyle: data.battleStyle as string,
          romanceStyle: data.romanceStyle as string,
          mysteryStyle: data.mysteryStyle as string,
          presetName: data.presetName as string | undefined,
        },
        update: {
          narrativePOV: data.narrativePOV as string,
          narrativeDistance: data.narrativeDistance as string,
          avgSentenceLength: data.avgSentenceLength as number,
          dialogueRatio: data.dialogueRatio as number,
          psychologicalRatio: data.psychologicalRatio as number,
          actionRatio: data.actionRatio as number,
          environmentRatio: data.environmentRatio as number,
          infoDensity: data.infoDensity as number,
          emotionExposure: data.emotionExposure as number,
          humorLevel: data.humorLevel as number,
          rhetoricSystem: data.rhetoriumSystem ?? data.rhetoricSystem ?? {},
          commonWords: data.commonWords ?? [],
          bannedWords: data.bannedWords ?? [],
          chapterEndStyle: data.chapterEndStyle as string,
          battleStyle: data.battleStyle as string,
          romanceStyle: data.romanceStyle as string,
          mysteryStyle: data.mysteryStyle as string,
          presetName: data.presetName as string | undefined,
        },
      });
    } catch (error) {
      throw new Error(`创建或更新风格指纹失败: ${(error as Error).message}`);
    }
  },

  async delete(projectId: string) {
    try {
      return await prisma.styleFingerprint.delete({
        where: { projectId },
      });
    } catch (error) {
      throw new Error(`删除风格指纹失败: ${(error as Error).message}`);
    }
  },
};
