import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 最近任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    const jobs = await prisma.generationJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        projectId: true,
        chapterId: true,
        jobType: true,
        status: true,
        model: true,
        durationMs: true,
        cost: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const enriched = await Promise.all(
      jobs.map(async (job) => {
        const [project, chapter] = await Promise.all([
          prisma.project.findUnique({
            where: { id: job.projectId },
            select: { name: true },
          }),
          job.chapterId
            ? prisma.chapter.findUnique({
                where: { id: job.chapterId },
                select: { chapterNumber: true, title: true, qualityScore: true },
              })
            : Promise.resolve(null),
        ]);
        return {
          ...job,
          projectName: project?.name,
          chapter,
        };
      })
    );

    return NextResponse.json({ tasks: enriched });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: 触发新任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { projectId } = body as { projectId?: string };

    if (!projectId) {
      return NextResponse.json({ error: "缺少 projectId" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const { pipeline } = await import("@/lib/orchestrator/pipeline");
    pipeline
      .generateNextChapter(projectId, { projectId })
      .catch((err: Error) => {
        console.error("[MOBILE_GENERATE_ERROR]", err);
      });

    return NextResponse.json({ projectId, status: "started" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
