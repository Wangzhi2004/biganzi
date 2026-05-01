import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [agents, recentCycles] = await Promise.all([
      prisma.agentPerformance.findMany({
        orderBy: { updatedAt: "desc" },
      }),
      prisma.evolutionCycle.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          id: true,
          projectId: true,
          cycleNumber: true,
          status: true,
          observations: true,
          hypotheses: true,
          experiments: true,
          learnings: true,
          startedAt: true,
          completedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      agents: agents.map((a) => ({
        id: a.agentId,
        tasksCompleted: a.tasksCompleted,
        avgScore: a.avgScore,
        errorRate: a.errorRate,
        updatedAt: a.updatedAt,
      })),
      recentCycles: recentCycles.map((c) => ({
        ...c,
        observations: Array.isArray(c.observations) ? c.observations.length : 0,
        hypotheses: Array.isArray(c.hypotheses) ? c.hypotheses.length : 0,
        experiments: Array.isArray(c.experiments) ? c.experiments.length : 0,
        learnings: Array.isArray(c.learnings) ? c.learnings.length : 0,
        durationMs: c.completedAt
          ? new Date(c.completedAt).getTime() - new Date(c.startedAt).getTime()
          : null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
