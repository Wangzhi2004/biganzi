import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

const STATUS_MAP: Record<string, ProjectStatus> = {
  draft: "DRAFT",
  active: "ACTIVE",
  archived: "ARCHIVED",
};

export const projectService = {
  async create(data: {
    userId: string;
    name: string;
    genre: string;
    subGenre: string;
    description?: string;
  }) {
    try {
      return await prisma.project.create({
        data: {
          userId: data.userId,
          name: data.name,
          genre: data.genre,
          subGenre: data.subGenre,
          description: data.description,
        },
      });
    } catch (error) {
      throw new Error(`创建项目失败: ${(error as Error).message}`);
    }
  },

  async getById(id: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          bookDna: true,
          styleFingerprint: true,
          _count: {
            select: {
              chapters: true,
              characters: true,
              foreshadows: true,
              volumes: true,
            },
          },
        },
      });
      if (!project) {
        throw new Error("项目不存在");
      }
      return project;
    } catch (error) {
      throw new Error(`获取项目失败: ${(error as Error).message}`);
    }
  },

  async listByUser(userId: string) {
    try {
      return await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              chapters: true,
              characters: true,
              foreshadows: true,
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`获取项目列表失败: ${(error as Error).message}`);
    }
  },

  async update(
    id: string,
    data: Partial<{ name: string; description: string; status: string }>
  ) {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.status !== undefined) {
        const mapped = STATUS_MAP[data.status];
        if (!mapped) {
          throw new Error(`无效的项目状态: ${data.status}`);
        }
        updateData.status = mapped;
      }

      return await prisma.project.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new Error(`更新项目失败: ${(error as Error).message}`);
    }
  },

  async delete(id: string) {
    try {
      return await prisma.project.delete({ where: { id } });
    } catch (error) {
      throw new Error(`删除项目失败: ${(error as Error).message}`);
    }
  },

  async updateStats(
    id: string,
    data: { totalWords?: number; currentChapter?: number }
  ) {
    try {
      return await prisma.project.update({
        where: { id },
        data: {
          ...(data.totalWords !== undefined && { totalWords: data.totalWords }),
          ...(data.currentChapter !== undefined && {
            currentChapter: data.currentChapter,
          }),
        },
      });
    } catch (error) {
      throw new Error(`更新项目统计失败: ${(error as Error).message}`);
    }
  },
};
