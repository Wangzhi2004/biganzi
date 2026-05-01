import { prisma } from "@/lib/prisma";

export const characterService = {
  async create(data: {
    projectId: string;
    name: string;
    aliases?: unknown;
    roleType: string;
    desire?: string;
    fear?: string;
    wound?: string;
    secret?: string;
    moralBoundary?: string;
    speechPattern?: string;
    currentGoal?: string;
    currentLocation?: string;
    currentStatus?: string;
    powerLevel?: string;
  }) {
    try {
      return await prisma.character.create({
        data: {
          projectId: data.projectId,
          name: data.name,
          aliases: data.aliases ?? undefined,
          roleType: data.roleType,
          desire: data.desire,
          fear: data.fear,
          wound: data.wound,
          secret: data.secret,
          moralBoundary: data.moralBoundary,
          speechPattern: data.speechPattern,
          currentGoal: data.currentGoal,
          currentLocation: data.currentLocation,
          currentStatus: data.currentStatus,
          powerLevel: data.powerLevel,
        },
      });
    } catch (error) {
      throw new Error(`创建角色失败: ${(error as Error).message}`);
    }
  },

  async getById(id: string) {
    try {
      const character = await prisma.character.findUnique({
        where: { id },
        include: {
          relationshipsA: {
            include: { characterB: { select: { id: true, name: true } } },
          },
          relationshipsB: {
            include: { characterA: { select: { id: true, name: true } } },
          },
          abilities: true,
        },
      });
      if (!character) {
        throw new Error("角色不存在");
      }
      return character;
    } catch (error) {
      throw new Error(`获取角色失败: ${(error as Error).message}`);
    }
  },

  async listByProject(projectId: string) {
    try {
      return await prisma.character.findMany({
        where: { projectId },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { abilities: true, relationshipsA: true, relationshipsB: true },
          },
        },
      });
    } catch (error) {
      throw new Error(`获取角色列表失败: ${(error as Error).message}`);
    }
  },

  async update(id: string, data: Record<string, unknown>) {
    try {
      return await prisma.character.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new Error(`更新角色失败: ${(error as Error).message}`);
    }
  },

  async delete(id: string) {
    try {
      return await prisma.character.delete({ where: { id } });
    } catch (error) {
      throw new Error(`删除角色失败: ${(error as Error).message}`);
    }
  },

  async updateFromStateDiff(
    characterId: string,
    changes: { field: string; newValue: string }[]
  ) {
    try {
      const updateData: Record<string, unknown> = {};
      for (const change of changes) {
        updateData[change.field] = change.newValue;
      }
      return await prisma.character.update({
        where: { id: characterId },
        data: updateData,
      });
    } catch (error) {
      throw new Error(`通过状态差异更新角色失败: ${(error as Error).message}`);
    }
  },

  async getAppearanceHistory(characterId: string) {
    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: {
          id: true,
          name: true,
          firstSeenChapter: true,
          lastSeenChapter: true,
          sourceChapters: true,
          projectId: true,
        },
      });
      if (!character) {
        throw new Error("角色不存在");
      }

      const chapters = await prisma.chapter.findMany({
        where: {
          projectId: character.projectId,
          chapterNumber: {
            in: Array.isArray(character.sourceChapters)
              ? (character.sourceChapters as number[])
              : [],
          },
        },
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          summary: true,
        },
      });

      return { character, chapters };
    } catch (error) {
      throw new Error(`获取角色出场历史失败: ${(error as Error).message}`);
    }
  },

  async getCharactersInChapter(projectId: string, chapterNumber: number) {
    try {
      const characters = await prisma.character.findMany({
        where: { projectId },
        orderBy: { name: "asc" },
      });

      return characters.filter((c) => {
        const chapters = c.sourceChapters as number[] | null;
        return chapters?.includes(chapterNumber) ?? false;
      });
    } catch (error) {
      throw new Error(`获取章节中角色列表失败: ${(error as Error).message}`);
    }
  },

  async createRelationship(data: {
    projectId: string;
    characterAId: string;
    characterBId: string;
    relationType: string;
    description?: string;
    startChapter?: number;
  }) {
    try {
      return await prisma.relationship.create({
        data: {
          projectId: data.projectId,
          characterAId: data.characterAId,
          characterBId: data.characterBId,
          relationType: data.relationType,
          description: data.description,
          startChapter: data.startChapter,
        },
      });
    } catch (error) {
      throw new Error(`创建关系失败: ${(error as Error).message}`);
    }
  },

  async updateRelationship(id: string, data: Record<string, unknown>) {
    try {
      return await prisma.relationship.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new Error(`更新关系失败: ${(error as Error).message}`);
    }
  },

  async getRelationships(projectId: string) {
    try {
      return await prisma.relationship.findMany({
        where: { projectId },
        include: {
          characterA: { select: { id: true, name: true } },
          characterB: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      throw new Error(`获取关系列表失败: ${(error as Error).message}`);
    }
  },
};
