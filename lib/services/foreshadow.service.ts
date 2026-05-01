import { prisma } from "@/lib/prisma";
import { ForeshadowStatus } from "@prisma/client";
import type { ForeshadowStatus as TypeForeshadowStatus } from "@/types";

const STATUS_MAP: Record<string, ForeshadowStatus> = {
  inactive: "INACTIVE",
  planted: "PLANTED",
  reminded: "REMINDED",
  deepened: "DEEPENED",
  partial_payoff: "PARTIAL_PAYOFF",
  full_payoff: "FULL_PAYOFF",
  deprecated: "DEPRECATED",
  conflict: "CONFLICT",
};

export const foreshadowService = {
  async create(data: {
    projectId: string;
    plantedChapter: number;
    clueText: string;
    surfaceMeaning: string;
    trueMeaning: string;
    relatedCharacters?: unknown;
    expectedPayoffStart?: number;
    expectedPayoffEnd?: number;
  }) {
    try {
      return await prisma.foreshadow.create({
        data: {
          projectId: data.projectId,
          plantedChapter: data.plantedChapter,
          clueText: data.clueText,
          surfaceMeaning: data.surfaceMeaning,
          trueMeaning: data.trueMeaning,
          relatedCharacters: data.relatedCharacters ?? undefined,
          expectedPayoffStart: data.expectedPayoffStart,
          expectedPayoffEnd: data.expectedPayoffEnd,
          status: "PLANTED",
        },
      });
    } catch (error) {
      throw new Error(`创建伏笔失败: ${(error as Error).message}`);
    }
  },

  async getById(id: string) {
    try {
      const foreshadow = await prisma.foreshadow.findUnique({
        where: { id },
      });
      if (!foreshadow) {
        throw new Error("伏笔不存在");
      }
      return foreshadow;
    } catch (error) {
      throw new Error(`获取伏笔失败: ${(error as Error).message}`);
    }
  },

  async listByProject(projectId: string, filter?: { status?: string }) {
    try {
      const where: { projectId: string; status?: ForeshadowStatus } = {
        projectId,
      };
      if (filter?.status) {
        const mapped = STATUS_MAP[filter.status];
        if (mapped) {
          where.status = mapped;
        }
      }

      return await prisma.foreshadow.findMany({
        where,
        orderBy: [{ heatScore: "desc" }, { urgencyScore: "desc" }],
      });
    } catch (error) {
      throw new Error(`获取伏笔列表失败: ${(error as Error).message}`);
    }
  },

  async update(id: string, data: Record<string, unknown>) {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.clueText !== undefined) updateData.clueText = data.clueText;
      if (data.surfaceMeaning !== undefined)
        updateData.surfaceMeaning = data.surfaceMeaning;
      if (data.trueMeaning !== undefined)
        updateData.trueMeaning = data.trueMeaning;
      if (data.relatedCharacters !== undefined)
        updateData.relatedCharacters = data.relatedCharacters;
      if (data.expectedPayoffStart !== undefined)
        updateData.expectedPayoffStart = data.expectedPayoffStart;
      if (data.expectedPayoffEnd !== undefined)
        updateData.expectedPayoffEnd = data.expectedPayoffEnd;
      if (data.heatScore !== undefined) updateData.heatScore = data.heatScore;
      if (data.urgencyScore !== undefined)
        updateData.urgencyScore = data.urgencyScore;

      return await prisma.foreshadow.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new Error(`更新伏笔失败: ${(error as Error).message}`);
    }
  },

  async delete(id: string) {
    try {
      return await prisma.foreshadow.delete({ where: { id } });
    } catch (error) {
      throw new Error(`删除伏笔失败: ${(error as Error).message}`);
    }
  },

  async updateStatus(
    id: string,
    status: TypeForeshadowStatus,
    payoffChapter?: number
  ) {
    try {
      const mapped = STATUS_MAP[status];
      if (!mapped) {
        throw new Error(`无效的伏笔状态: ${status}`);
      }

      const updateData: Record<string, unknown> = { status: mapped };
      if (payoffChapter !== undefined) {
        updateData.payoffChapter = payoffChapter;
      }
      if (mapped === "REMINDED") {
        updateData.remindedAt = new Date();
      }

      return await prisma.foreshadow.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new Error(`更新伏笔状态失败: ${(error as Error).message}`);
    }
  },

  async calculateScores(id: string, currentChapter: number) {
    try {
      const foreshadow = await prisma.foreshadow.findUnique({
        where: { id },
      });
      if (!foreshadow) {
        throw new Error("伏笔不存在");
      }

      const chaptersSincePlanted = currentChapter - foreshadow.plantedChapter;

      let heatScore = 0;
      if (foreshadow.remindedAt) {
        const daysSinceReminded =
          (Date.now() - foreshadow.remindedAt.getTime()) / (1000 * 60 * 60 * 24);
        heatScore = Math.max(0, 10 - daysSinceReminded);
      }
      if (foreshadow.status === "PLANTED" || foreshadow.status === "REMINDED") {
        heatScore = Math.max(heatScore, Math.min(10, chaptersSincePlanted * 0.5));
      }

      let urgencyScore = 0;
      if (
        foreshadow.expectedPayoffEnd !== null &&
        foreshadow.expectedPayoffEnd !== undefined
      ) {
        const chaptersUntilEnd =
          foreshadow.expectedPayoffEnd - currentChapter;
        if (chaptersUntilEnd <= 0) {
          urgencyScore = 10;
        } else {
          const windowSize =
            foreshadow.expectedPayoffEnd -
            (foreshadow.expectedPayoffStart ?? foreshadow.plantedChapter);
          urgencyScore =
            windowSize > 0
              ? Math.min(10, ((windowSize - chaptersUntilEnd) / windowSize) * 10)
              : 10;
        }
      }

      const updated = await prisma.foreshadow.update({
        where: { id },
        data: {
          heatScore: Math.round(heatScore * 100) / 100,
          urgencyScore: Math.round(urgencyScore * 100) / 100,
        },
      });

      return updated;
    } catch (error) {
      throw new Error(`计算伏笔分数失败: ${(error as Error).message}`);
    }
  },

  async findOverdue(projectId: string, currentChapter: number) {
    try {
      return await prisma.foreshadow.findMany({
        where: {
          projectId,
          expectedPayoffEnd: { lt: currentChapter },
          status: {
            notIn: ["FULL_PAYOFF", "DEPRECATED"],
          },
        },
        orderBy: { expectedPayoffEnd: "asc" },
      });
    } catch (error) {
      throw new Error(`查找过期伏笔失败: ${(error as Error).message}`);
    }
  },

  async findLongAbsent(
    projectId: string,
    currentChapter: number,
    threshold = 15
  ) {
    try {
      return await prisma.foreshadow.findMany({
        where: {
          projectId,
          status: {
            notIn: ["FULL_PAYOFF", "DEPRECATED", "INACTIVE"],
          },
          OR: [
            {
              remindedAt: null,
              plantedChapter: { lt: currentChapter - threshold },
            },
            {
              remindedAt: { lt: new Date(Date.now() - threshold * 24 * 60 * 60 * 1000) },
            },
          ],
        },
        orderBy: { plantedChapter: "asc" },
      });
    } catch (error) {
      throw new Error(`查找长期缺失伏笔失败: ${(error as Error).message}`);
    }
  },

  async getActiveForeshadows(projectId: string) {
    try {
      return await prisma.foreshadow.findMany({
        where: {
          projectId,
          status: {
            notIn: ["FULL_PAYOFF", "DEPRECATED", "INACTIVE"],
          },
        },
        orderBy: [{ urgencyScore: "desc" }, { heatScore: "desc" }],
      });
    } catch (error) {
      throw new Error(`获取活跃伏笔失败: ${(error as Error).message}`);
    }
  },
};
