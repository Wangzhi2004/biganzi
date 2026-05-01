import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = await params;

    const [
      latestCycle,
      cyclesCount,
      promptVersions,
      executionLogs,
      learningEpisodes,
      agentPerformances,
      pipelineExecutions,
      learningRecords,
      chapters,
    ] = await Promise.all([
      prisma.evolutionCycle.findFirst({
        where: { projectId },
        orderBy: { startedAt: "desc" },
      }).catch(() => null),
      prisma.evolutionCycle.count({ where: { projectId } }).catch(() => 0),
      prisma.promptVersion.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => []),
      prisma.executionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }).catch(() => []),
      prisma.learningEpisode.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => []),
      prisma.agentPerformance.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
      }).catch(() => []),
      prisma.pipelineExecution.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => []),
      prisma.learningRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => []),
      prisma.chapter.findMany({
        where: { projectId },
        orderBy: { chapterNumber: "desc" },
        take: 5,
        select: { id: true, chapterNumber: true, title: true, qualityScore: true, createdAt: true },
      }).catch(() => []),
    ]);

    const totalExecutions = executionLogs.length;
    const avgScore = totalExecutions > 0
      ? executionLogs.reduce((s, l) => s + l.score, 0) / totalExecutions
      : 0;
    const successRate = totalExecutions > 0
      ? executionLogs.filter((l) => l.success).length / totalExecutions
      : 0;
    const totalTokens = executionLogs.reduce((s, l) => s + l.tokensUsed, 0);

    const strategyStats = {
      score_driven: executionLogs.filter((l) => l.score < 7.5 && l.success).length,
      error_pattern: executionLogs.filter((l) => !l.success && l.errorType).length,
      token_efficiency: executionLogs.filter((l) => l.tokensUsed > 4000).length,
    };

    return NextResponse.json({
      overview: {
        cyclesCount,
        latestCycle: latestCycle ? {
          id: latestCycle.id,
          cycleNumber: latestCycle.cycleNumber,
          status: latestCycle.status,
          startedAt: latestCycle.startedAt,
          completedAt: latestCycle.completedAt,
          learningsCount: Array.isArray(latestCycle.learnings) ? latestCycle.learnings.length : 0,
          experimentsCount: Array.isArray(latestCycle.experiments) ? latestCycle.experiments.length : 0,
        } : null,
        totalExecutions,
        avgScore: Number(avgScore.toFixed(2)),
        successRate: Number((successRate * 100).toFixed(1)),
        totalTokens,
        learningEpisodesCount: learningEpisodes.length,
        promptVersionsCount: promptVersions.length,
      },
      promptVersions: promptVersions.map((v) => ({
        id: v.id,
        name: v.name,
        taskType: v.taskType,
        version: v.version,
        avgScore: v.avgScore,
        successRate: v.successRate,
        avgTokens: v.avgTokens,
        usageCount: v.usageCount,
        createdAt: v.createdAt,
      })),
      executionLogs: executionLogs.map((l) => ({
        id: l.id,
        score: l.score,
        tokensUsed: l.tokensUsed,
        durationMs: l.durationMs,
        success: l.success,
        errorType: l.errorType,
        createdAt: l.createdAt,
      })),
      learningEpisodes: learningEpisodes.map((e) => ({
        id: e.id,
        taskType: e.taskType,
        score: e.score,
        feedback: e.feedback,
        createdAt: e.createdAt,
      })),
      agentPerformances: agentPerformances.map((a) => ({
        id: a.id,
        agentId: a.agentId,
        tasksCompleted: a.tasksCompleted,
        avgScore: a.avgScore,
        errorRate: a.errorRate,
        updatedAt: a.updatedAt,
      })),
      pipelineExecutions: pipelineExecutions.map((p) => ({
        id: p.id,
        templateId: p.templateId,
        status: p.status,
        duration: p.duration,
        createdAt: p.createdAt,
      })),
      learningRecords: learningRecords.map((r) => ({
        id: r.id,
        pattern: r.pattern,
        applicability: r.applicability,
        confidence: r.confidence,
        applied: r.applied,
        createdAt: r.createdAt,
      })),
      strategyStats,
      recentChapters: chapters.map((c) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        title: c.title,
        qualityScore: c.qualityScore,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("[EvolutionDashboard API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data", details: (error as Error).message },
      { status: 500 }
    );
  }
}
