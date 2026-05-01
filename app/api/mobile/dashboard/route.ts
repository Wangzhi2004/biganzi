import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        genre: true,
        status: true,
        totalWords: true,
        currentChapter: true,
        updatedAt: true,
      },
    });

    // 每个项目的最新状态
    const projectDetails = await Promise.all(
      projects.map(async (p) => {
        const [latestChapter, avgQuality, pendingJobs, agentPerfs, recentCycle] =
          await Promise.all([
            prisma.chapter.findFirst({
              where: { projectId: p.id },
              orderBy: { chapterNumber: "desc" },
              select: { chapterNumber: true, title: true, qualityScore: true, auditStatus: true },
            }),
            prisma.auditReport.aggregate({
              where: { chapter: { projectId: p.id } },
              _avg: { qualityScore: true },
            }),
            prisma.generationJob.count({
              where: { projectId: p.id, status: { in: ["PENDING", "RUNNING"] } },
            }),
            prisma.agentPerformance.findMany({
              orderBy: { updatedAt: "desc" },
              take: 5,
            }),
            prisma.evolutionCycle.findFirst({
              where: { projectId: p.id },
              orderBy: { startedAt: "desc" },
              select: { cycleNumber: true, status: true, startedAt: true },
            }),
          ]);

        const characterCount = await prisma.character.count({ where: { projectId: p.id } });
        const foreshadowCount = await prisma.foreshadow.count({
          where: { projectId: p.id, status: { notIn: ["FULL_PAYOFF", "DEPRECATED"] } },
        });

        return {
          ...p,
          latestChapter,
          avgQuality: avgQuality._avg.qualityScore || 0,
          pendingJobs,
          characterCount,
          foreshadowCount,
          agents: agentPerfs.map((a) => ({
            id: a.agentId,
            tasksCompleted: a.tasksCompleted,
            avgScore: a.avgScore,
          })),
          recentCycle,
        };
      })
    );

    return NextResponse.json({ projects: projectDetails });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
