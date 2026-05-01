import { prisma } from "@/lib/prisma";
import { ChapterFunction } from "@prisma/client";

const CHAPTER_FUNCTION_MAP: Record<string, ChapterFunction> = {
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

export const chapterService = {
  async create(data: {
    projectId: string;
    volumeId?: string;
    arcId?: string;
    chapterNumber: number;
    title: string;
    content?: string;
    summary?: string;
    chapterFunction: string;
    sceneCards?: unknown;
    goal?: string;
    qualityScore?: number;
  }) {
    try {
      const chapterFunction = CHAPTER_FUNCTION_MAP[data.chapterFunction];
      if (!chapterFunction) {
        throw new Error(`无效的章节功能类型: ${data.chapterFunction}`);
      }

      const wordCount = data.content
        ? data.content.replace(/\s/g, "").length
        : 0;

      return await prisma.chapter.upsert({
        where: {
          projectId_chapterNumber: {
            projectId: data.projectId,
            chapterNumber: data.chapterNumber,
          },
        },
        create: {
          projectId: data.projectId,
          volumeId: data.volumeId,
          arcId: data.arcId,
          chapterNumber: data.chapterNumber,
          title: data.title,
          content: data.content,
          summary: data.summary,
          chapterFunction,
          sceneCards: data.sceneCards ?? undefined,
          goal: data.goal,
          qualityScore: data.qualityScore,
          wordCount,
        },
        update: {
          title: data.title,
          content: data.content,
          summary: data.summary,
          chapterFunction,
          sceneCards: data.sceneCards ?? undefined,
          goal: data.goal,
          qualityScore: data.qualityScore,
          wordCount,
        },
      });
    } catch (error) {
      throw new Error(`创建章节失败: ${(error as Error).message}`);
    }
  },

  async getById(id: string) {
    try {
      const chapter = await prisma.chapter.findUnique({
        where: { id },
        include: {
          scenes: { orderBy: { sceneNumber: "asc" } },
          auditReport: true,
          stateDiff: true,
          volume: true,
          arc: true,
        },
      });
      if (!chapter) {
        throw new Error("章节不存在");
      }
      return chapter;
    } catch (error) {
      throw new Error(`获取章节失败: ${(error as Error).message}`);
    }
  },

  async listByProject(projectId: string) {
    try {
      return await prisma.chapter.findMany({
        where: { projectId },
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          summary: true,
          chapterFunction: true,
          qualityScore: true,
          auditStatus: true,
          isConfirmed: true,
          wordCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      throw new Error(`获取章节列表失败: ${(error as Error).message}`);
    }
  },

  async getChapterTree(projectId: string) {
    try {
      const chapters = await prisma.chapter.findMany({
        where: { projectId },
        orderBy: { chapterNumber: "asc" },
        include: {
          volume: true,
        },
      });

      const volumeMap = new Map<
        string | null,
        {
          volumeId: string | null;
          volumeTitle: string | null;
          chapters: typeof chapters;
        }
      >();

      for (const chapter of chapters) {
        const key = chapter.volumeId ?? "__no_volume__";
        if (!volumeMap.has(key)) {
          volumeMap.set(key, {
            volumeId: chapter.volumeId,
            volumeTitle: chapter.volume?.title ?? null,
            chapters: [],
          });
        }
        volumeMap.get(key)!.chapters.push(chapter);
      }

      return Array.from(volumeMap.values());
    } catch (error) {
      throw new Error(`获取章节树失败: ${(error as Error).message}`);
    }
  },

  async update(id: string, data: Record<string, unknown>) {
    try {
      const updateData: Record<string, unknown> = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) {
        updateData.content = data.content;
        updateData.wordCount = (data.content as string).replace(/\s/g, "").length;
      }
      if (data.summary !== undefined) updateData.summary = data.summary;
      if (data.chapterFunction !== undefined) {
        const mapped = CHAPTER_FUNCTION_MAP[data.chapterFunction as string];
        if (!mapped) {
          throw new Error(`无效的章节功能类型: ${data.chapterFunction}`);
        }
        updateData.chapterFunction = mapped;
      }
      if (data.sceneCards !== undefined) updateData.sceneCards = data.sceneCards;
      if (data.goal !== undefined) updateData.goal = data.goal;
      if (data.qualityScore !== undefined)
        updateData.qualityScore = data.qualityScore;
      if (data.volumeId !== undefined) updateData.volumeId = data.volumeId;
      if (data.arcId !== undefined) updateData.arcId = data.arcId;

      const oldChapter = await prisma.chapter.findUnique({ where: { id } });
      const updated = await prisma.chapter.update({
        where: { id },
        data: updateData,
      });

      // Write version log
      if (oldChapter) {
        try {
          const changes: Record<string, { old: any; new: any }> = {};
          for (const key of Object.keys(updateData)) {
            if ((oldChapter as any)[key] !== (updated as any)[key]) {
              changes[key] = { old: (oldChapter as any)[key], new: (updated as any)[key] };
            }
          }
          if (Object.keys(changes).length > 0) {
            await prisma.versionLog.create({
              data: {
                projectId: oldChapter.projectId,
                entityType: "chapter",
                entityId: id,
                changeType: "update",
                oldValue: changes as any,
                newValue: updateData as any,
                description: `章节 ${oldChapter.chapterNumber} 更新: ${Object.keys(changes).join(", ")}`,
              },
            });
          }
        } catch (e) {
          console.log("[VersionLog] 写入失败:", (e as Error).message);
        }
      }

      return updated;
    } catch (error) {
      throw new Error(`更新章节失败: ${(error as Error).message}`);
    }
  },

  async delete(id: string) {
    try {
      return await prisma.chapter.delete({ where: { id } });
    } catch (error) {
      throw new Error(`删除章节失败: ${(error as Error).message}`);
    }
  },

  async getNextChapterNumber(projectId: string) {
    try {
      const lastChapter = await prisma.chapter.findFirst({
        where: { projectId },
        orderBy: { chapterNumber: "desc" },
        select: { chapterNumber: true },
      });
      return (lastChapter?.chapterNumber ?? 0) + 1;
    } catch (error) {
      throw new Error(`获取下一章节号失败: ${(error as Error).message}`);
    }
  },

  async confirmChapter(id: string) {
    try {
      return await prisma.chapter.update({
        where: { id },
        data: { isConfirmed: true },
      });
    } catch (error) {
      throw new Error(`确认章节失败: ${(error as Error).message}`);
    }
  },

  async createScene(data: {
    chapterId: string;
    sceneNumber: number;
    location: string;
    characters: any;
    conflict?: string;
    infoChange?: string;
    emotionGoal?: string;
    content?: string;
  }) {
    try {
      return await prisma.scene.create({
        data: {
          chapterId: data.chapterId,
          sceneNumber: data.sceneNumber,
          location: data.location,
          characters: data.characters,
          conflict: data.conflict,
          infoChange: data.infoChange,
          emotionGoal: data.emotionGoal,
          content: data.content,
        },
      });
    } catch (error) {
      throw new Error(`创建场景失败: ${(error as Error).message}`);
    }
  },

  async updateScene(id: string, data: Record<string, unknown>) {
    try {
      return await prisma.scene.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new Error(`更新场景失败: ${(error as Error).message}`);
    }
  },

  async getScenesByChapter(chapterId: string) {
    try {
      return await prisma.scene.findMany({
        where: { chapterId },
        orderBy: { sceneNumber: "asc" },
      });
    } catch (error) {
      throw new Error(`获取场景列表失败: ${(error as Error).message}`);
    }
  },
};
