import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const startTime = Date.now();

    // DB 健康检查
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    // 最近错误统计
    const recentErrors = await prisma.generationJob.count({
      where: {
        status: "FAILED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    // 最近 AI 调用统计
    const recentCalls = await prisma.aICallLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const recentFailedCalls = await prisma.aICallLog.count({
      where: {
        status: "FAILED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    // 活跃任务
    const activeJobs = await prisma.generationJob.count({
      where: { status: { in: ["PENDING", "RUNNING"] } },
    });

    // 项目统计
    const projectCount = await prisma.project.count();
    const totalChapters = await prisma.chapter.count();
    const totalCharacters = await prisma.character.count();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      db: { connected: true, latencyMs: dbLatency },
      stats: {
        projectCount,
        totalChapters,
        totalCharacters,
        activeJobs,
      },
      last24h: {
        generationErrors: recentErrors,
        aiCalls: recentCalls,
        aiCallErrors: recentFailedCalls,
        aiCallSuccessRate:
          recentCalls > 0
            ? (((recentCalls - recentFailedCalls) / recentCalls) * 100).toFixed(1) + "%"
            : "N/A",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
