import { prisma } from "@/lib/prisma";
import type { StateDiffResult } from "@/types";

export const memoryService = {
  async applyStateDiff(chapterId: string, stateDiff: StateDiffResult) {
    try {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: { projectId: true, chapterNumber: true },
      });
      if (!chapter) {
        throw new Error("章节不存在");
      }

      const { projectId, chapterNumber } = chapter;

      await prisma.$transaction(async (tx) => {
        for (const fact of stateDiff.newFacts) {
          await tx.event.create({
            data: {
              projectId,
              title: fact.slice(0, 100),
              description: fact,
              chapterNumber,
            },
          });
        }

        for (const change of stateDiff.characterChanges) {
          const updateData: Record<string, unknown> = {};
          updateData[change.field] = change.newValue;

          const character = await tx.character.findUnique({
            where: { id: change.characterId },
            select: { sourceChapters: true },
          });

          const existingChapters = Array.isArray(character?.sourceChapters)
            ? (character.sourceChapters as number[])
            : [];
          if (!existingChapters.includes(chapterNumber)) {
            existingChapters.push(chapterNumber);
          }

          await tx.character.update({
            where: { id: change.characterId },
            data: {
              ...updateData,
              lastSeenChapter: chapterNumber,
              sourceChapters: existingChapters,
            },
          });
        }

        for (const relChange of stateDiff.relationshipChanges) {
          const existing = await tx.relationship.findUnique({
            where: {
              characterAId_characterBId: {
                characterAId: relChange.characterAId,
                characterBId: relChange.characterBId,
              },
            },
          });

          if (existing) {
            await tx.relationship.update({
              where: { id: existing.id },
              data: {
                description: relChange.description,
                status: relChange.changeType === "end" ? "ended" : "active",
              },
            });
          } else {
            await tx.relationship.create({
              data: {
                projectId,
                characterAId: relChange.characterAId,
                characterBId: relChange.characterBId,
                relationType: relChange.changeType,
                description: relChange.description,
                startChapter: chapterNumber,
              },
            });
          }
        }

        for (const rule of stateDiff.newWorldRules) {
          await tx.worldRule.create({
            data: {
              projectId,
              category: rule.category,
              content: rule.content,
              sourceChapter: chapterNumber,
              status: "CONFIRMED",
            },
          });
        }

        for (const fs of stateDiff.newForeshadows) {
          await tx.foreshadow.create({
            data: {
              projectId,
              plantedChapter: chapterNumber,
              clueText: fs.clueText,
              surfaceMeaning: fs.surfaceMeaning,
              trueMeaning: fs.trueMeaning,
              relatedCharacters: fs.relatedCharacters,
              expectedPayoffStart: fs.expectedPayoffStart,
              expectedPayoffEnd: fs.expectedPayoffEnd,
              status: "PLANTED",
            },
          });
        }

        for (const paidOff of stateDiff.paidOffForeshadows) {
          const statusMap: Record<string, "PARTIAL_PAYOFF" | "FULL_PAYOFF"> = {
            partial: "PARTIAL_PAYOFF",
            full: "FULL_PAYOFF",
          };
          await tx.foreshadow.update({
            where: { id: paidOff.foreshadowId },
            data: {
              status: statusMap[paidOff.payoffType] ?? "FULL_PAYOFF",
              payoffChapter: chapterNumber,
            },
          });
        }

        for (const promise of stateDiff.newReaderPromises) {
          await tx.readerPromise.create({
            data: {
              projectId,
              promiseText: promise.promiseText,
              plantedChapter: chapterNumber,
              status: "ACTIVE",
            },
          });
        }

        for (const resolved of stateDiff.resolvedReaderPromises) {
          const statusMap: Record<string, "RESOLVED" | "BROKEN"> = {
            fulfilled: "RESOLVED",
            broken: "BROKEN",
          };
          await tx.readerPromise.update({
            where: { id: resolved.promiseId },
            data: {
              status: statusMap[resolved.resolutionType] ?? "RESOLVED",
              resolvedChapter: chapterNumber,
            },
          });
        }
      });
    } catch (error) {
      throw new Error(`应用状态差异失败: ${(error as Error).message}`);
    }
  },

  async recallContext(projectId: string, chapterNumber: number) {
    try {
      const tenChaptersAgo = Math.max(1, chapterNumber - 10);
      const fiveChaptersAgo = Math.max(1, chapterNumber - 5);

      const [
        activeCharacters,
        unresolvedForeshadows,
        activeReaderPromises,
        confirmedWorldRules,
        recentChapters,
      ] = await Promise.all([
        prisma.character.findMany({
          where: {
            projectId,
            lastSeenChapter: { gte: tenChaptersAgo },
          },
          include: {
            relationshipsA: true,
            relationshipsB: true,
            abilities: true,
          },
        }),

        prisma.foreshadow.findMany({
          where: {
            projectId,
            status: {
              notIn: ["FULL_PAYOFF", "DEPRECATED"],
            },
          },
        }),

        prisma.readerPromise.findMany({
          where: {
            projectId,
            status: "ACTIVE",
          },
        }),

        prisma.worldRule.findMany({
          where: {
            projectId,
            status: "CONFIRMED",
          },
          orderBy: { category: "asc" },
        }),

        prisma.chapter.findMany({
          where: {
            projectId,
            chapterNumber: { gte: fiveChaptersAgo, lt: chapterNumber },
          },
          orderBy: { chapterNumber: "asc" },
          select: {
            chapterNumber: true,
            title: true,
            summary: true,
            chapterFunction: true,
            sceneCards: true,
            qualityScore: true,
          },
        }),
      ]);

      return {
        activeCharacters,
        unresolvedForeshadows,
        activeReaderPromises,
        confirmedWorldRules,
        recentChapters,
      };
    } catch (error) {
      throw new Error(`回忆上下文失败: ${(error as Error).message}`);
    }
  },

  async saveStateDiff(chapterId: string, stateDiff: StateDiffResult) {
    try {
      return await prisma.stateDiff.upsert({
        where: { chapterId },
        create: {
          chapterId,
          chapterSummary: stateDiff.chapterSummary,
          newFacts: stateDiff.newFacts,
          characterChanges: stateDiff.characterChanges,
          relationshipChanges: stateDiff.relationshipChanges,
          newWorldRules: stateDiff.newWorldRules,
          newForeshadows: stateDiff.newForeshadows,
          paidOffForeshadows: stateDiff.paidOffForeshadows,
          newReaderPromises: stateDiff.newReaderPromises,
          resolvedReaderPromises: stateDiff.resolvedReaderPromises,
          riskFlags: stateDiff.riskFlags,
          nextChapterSuggestion: stateDiff.nextChapterSuggestion,
        },
        update: {
          chapterSummary: stateDiff.chapterSummary,
          newFacts: stateDiff.newFacts,
          characterChanges: stateDiff.characterChanges,
          relationshipChanges: stateDiff.relationshipChanges,
          newWorldRules: stateDiff.newWorldRules,
          newForeshadows: stateDiff.newForeshadows,
          paidOffForeshadows: stateDiff.paidOffForeshadows,
          newReaderPromises: stateDiff.newReaderPromises,
          resolvedReaderPromises: stateDiff.resolvedReaderPromises,
          riskFlags: stateDiff.riskFlags,
          nextChapterSuggestion: stateDiff.nextChapterSuggestion,
        },
      });
    } catch (error) {
      throw new Error(`保存状态差异失败: ${(error as Error).message}`);
    }
  },

  async getStateDiff(chapterId: string) {
    try {
      return await prisma.stateDiff.findUnique({
        where: { chapterId },
      });
    } catch (error) {
      throw new Error(`获取状态差异失败: ${(error as Error).message}`);
    }
  },
};
