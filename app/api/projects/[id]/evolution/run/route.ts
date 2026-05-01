import { NextRequest, NextResponse } from "next/server";
import { SelfOrganizingSwarm } from "@/lib/orchestrator/self-organization";
import { AdaptivePipeline } from "@/lib/orchestrator/adaptive-pipeline";
import { MetaLearner } from "@/lib/orchestrator/meta-learner";
import { SelfEvolutionEngine } from "@/lib/orchestrator/self-evolution-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const swarm = new SelfOrganizingSwarm();
    const pipeline = new AdaptivePipeline(swarm);
    const metaLearner = new MetaLearner();
    const engine = new SelfEvolutionEngine(swarm, pipeline, metaLearner);

    const cycle = await engine.runEvolutionCycle(id);

    return NextResponse.json({
      cycleId: cycle.id,
      status: cycle.status,
      observations: cycle.observations.length,
      hypotheses: cycle.hypotheses.length,
      experiments: cycle.experiments.length,
      learnings: cycle.learnings.length,
      duration: cycle.completedAt
        ? new Date(cycle.completedAt).getTime() - new Date(cycle.startedAt).getTime()
        : 0,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
