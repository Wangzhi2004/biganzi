import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";
import { jsonCompletion, chatCompletion } from "@/lib/ai";
import { SelfOrganizingSwarm } from "./self-organization";
import { AdaptivePipeline } from "./adaptive-pipeline";
import { MetaLearner } from "./meta-learner";
import { selfEvolution } from "./self-evolution";

interface EvolutionCycle {
  id: string;
  projectId: string;
  cycleNumber: number;
  observations: Observation[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  learnings: Learning[];
  status: "observing" | "hypothesizing" | "experimenting" | "learning" | "completed";
  startedAt: Date;
  completedAt?: Date;
}

interface Observation {
  id: string;
  type: "metric" | "pattern" | "anomaly" | "feedback";
  source: string;
  data: any;
  significance: number;
  timestamp: Date;
}

interface Hypothesis {
  id: string;
  statement: string;
  predictedOutcome: string;
  confidence: number;
  testable: boolean;
  derivedFrom: string[];
}

interface Experiment {
  id: string;
  hypothesisId: string;
  type: "prompt_variant" | "parameter_tuning" | "pipeline_change" | "agent_config";
  config: any;
  result?: any;
  success: boolean;
  executedAt: Date;
}

interface Learning {
  id: string;
  pattern: string;
  applicability: string;
  confidence: number;
  applied: boolean;
  sourceExperiments: string[];
}

export class SelfEvolutionEngine extends EventEmitter {
  private swarm: SelfOrganizingSwarm;
  private pipeline: AdaptivePipeline;
  private metaLearner: MetaLearner;
  private activeCycles: Map<string, EvolutionCycle> = new Map();
  private evolutionInterval?: NodeJS.Timeout;

  constructor(
    swarm: SelfOrganizingSwarm,
    pipeline: AdaptivePipeline,
    metaLearner: MetaLearner
  ) {
    super();
    this.swarm = swarm;
    this.pipeline = pipeline;
    this.metaLearner = metaLearner;
  }

  startEvolutionLoop(intervalMs: number = 3600000): void {
    console.log("[SelfEvolution] 启动自进化循环");
    
    this.evolutionInterval = setInterval(async () => {
      await this.runEvolutionCycle();
    }, intervalMs);

    this.emit("evolution:started", { intervalMs });
  }

  stopEvolutionLoop(): void {
    if (this.evolutionInterval) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = undefined;
      console.log("[SelfEvolution] 停止自进化循环");
    }
  }

  async runEvolutionCycle(projectId?: string): Promise<EvolutionCycle> {
    const cycleId = `cycle_${Date.now()}`;
    const cycle: EvolutionCycle = {
      id: cycleId,
      projectId: projectId || "global",
      cycleNumber: this.activeCycles.size + 1,
      observations: [],
      hypotheses: [],
      experiments: [],
      learnings: [],
      status: "observing",
      startedAt: new Date(),
    };

    this.activeCycles.set(cycleId, cycle);
    this.emit("cycle:started", cycle);

    try {
      await this.observe(cycle);
      await this.hypothesize(cycle);
      await this.experiment(cycle);
      await this.learn(cycle);

      cycle.status = "completed";
      cycle.completedAt = new Date();
      
      await this.saveCycle(cycle);
      this.emit("cycle:completed", cycle);

      return cycle;
    } catch (error) {
      console.error("[SelfEvolution] 进化循环失败:", error);
      this.emit("cycle:failed", { cycleId, error });
      throw error;
    }
  }

  private async observe(cycle: EvolutionCycle): Promise<void> {
    cycle.status = "observing";
    console.log(`[SelfEvolution] 观察阶段: ${cycle.id}`);

    const metrics = await this.collectMetrics(cycle.projectId);
    const patterns = this.metaLearner.getPatternStats();
    const agentStatus = this.swarm.getAgentStatus();

    const observations: Observation[] = [
      {
        id: `obs_${Date.now()}_1`,
        type: "metric",
        source: "pipeline",
        data: metrics,
        significance: this.calculateSignificance(metrics),
        timestamp: new Date(),
      },
      {
        id: `obs_${Date.now()}_2`,
        type: "pattern",
        source: "meta_learner",
        data: patterns,
        significance: patterns.avgConfidence,
        timestamp: new Date(),
      },
      {
        id: `obs_${Date.now()}_3`,
        type: "anomaly",
        source: "agents",
        data: agentStatus.filter((a) => a.performance.errorRate > 0.2),
        significance: agentStatus.some((a) => a.performance.errorRate > 0.2) ? 0.9 : 0.1,
        timestamp: new Date(),
      },
    ];

    cycle.observations = observations;
    this.emit("cycle:observed", { cycleId: cycle.id, observations });
  }

  private async hypothesize(cycle: EvolutionCycle): Promise<void> {
    cycle.status = "hypothesizing";
    console.log(`[SelfEvolution] 假设阶段: ${cycle.id}`);

    const significantObservations = cycle.observations.filter(
      (o) => o.significance > 0.6
    );

    if (significantObservations.length === 0) {
      console.log("[SelfEvolution] 无显著观察，跳过假设阶段");
      return;
    }

    const { data: hypothesisData } = await jsonCompletion([
      {
        role: "system",
        content: `你是一个系统优化专家。基于观察数据，生成可测试的改进假设。
        输出格式：{"hypotheses": [{"statement": "假设描述", "predictedOutcome": "预期结果", "confidence": 0.8, "testable": true}]}`,
      },
      {
        role: "user",
        content: `观察数据：\n${JSON.stringify(significantObservations)}`,
      },
    ]);

    cycle.hypotheses = hypothesisData.hypotheses.map((h: any, i: number) => ({
      id: `hyp_${Date.now()}_${i}`,
      statement: h.statement,
      predictedOutcome: h.predictedOutcome,
      confidence: h.confidence,
      testable: h.testable,
      derivedFrom: significantObservations.map((o) => o.id),
    }));

    this.emit("cycle:hypothesized", { cycleId: cycle.id, hypotheses: cycle.hypotheses });
  }

  private async experiment(cycle: EvolutionCycle): Promise<void> {
    cycle.status = "experimenting";
    console.log(`[SelfEvolution] 实验阶段: ${cycle.id}`);

    const testableHypotheses = cycle.hypotheses.filter((h) => h.testable && h.confidence > 0.5);

    for (const hypothesis of testableHypotheses.slice(0, 3)) {
      const experiment = await this.runExperiment(hypothesis, cycle);
      cycle.experiments.push(experiment);
    }

    this.emit("cycle:experimented", { cycleId: cycle.id, experiments: cycle.experiments });
  }

  private async runExperiment(hypothesis: Hypothesis, cycle: EvolutionCycle): Promise<Experiment> {
    const experimentId = `exp_${Date.now()}`;
    
    const experimentConfig = await this.generateExperimentConfig(hypothesis);
    
    let result: any;
    let success = false;

    try {
      switch (experimentConfig.type) {
        case "prompt_variant":
          result = await this.testPromptVariant(experimentConfig);
          break;
        case "parameter_tuning":
          result = await this.testParameterTuning(experimentConfig);
          break;
        case "pipeline_change":
          result = await this.testPipelineChange(experimentConfig);
          break;
        case "agent_config":
          result = await this.testAgentConfig(experimentConfig);
          break;
      }
      success = true;
    } catch (error) {
      result = { error: (error as Error).message };
    }

    return {
      id: experimentId,
      hypothesisId: hypothesis.id,
      type: experimentConfig.type,
      config: experimentConfig,
      result,
      success,
      executedAt: new Date(),
    };
  }

  private async generateExperimentConfig(hypothesis: Hypothesis): Promise<any> {
    const { data } = await jsonCompletion([
      {
        role: "system",
        content: `将假设转换为可执行的实验配置。
        输出格式：{"type": "prompt_variant|parameter_tuning|pipeline_change|agent_config", "config": {}}`,
      },
      {
        role: "user",
        content: `假设：${hypothesis.statement}\n预期结果：${hypothesis.predictedOutcome}`,
      },
    ]);

    return data;
  }

  private async testPromptVariant(config: any): Promise<any> {
    const promptVersions = await prisma.promptVersion.findMany({
      where: { taskType: config.config.taskType },
      take: 2,
    });

    if (promptVersions.length < 2) {
      return { error: "没有足够的提示词版本进行对比" };
    }

    const comparison = await selfEvolution.compareVersions(
      promptVersions[0].id,
      promptVersions[1].id
    );

    return comparison;
  }

  private async testParameterTuning(config: any): Promise<any> {
    const testParams = config.config.parameters;
    const results = [];

    for (const params of testParams) {
      const startTime = Date.now();
      const { data } = await jsonCompletion(
        [{ role: "user", content: config.config.testInput }],
        { temperature: params.temperature, maxTokens: params.maxTokens }
      );
      
      results.push({
        params,
        duration: Date.now() - startTime,
        output: data,
      });
    }

    return { results };
  }

  private async testPipelineChange(config: any): Promise<any> {
    const template = this.pipeline.getTemplate(config.config.templateId);
    if (!template) {
      return { error: "模板不存在" };
    }

    const modifiedTemplate = {
      ...template,
      stages: template.stages.map((s) =>
        s.id === config.config.stageId
          ? { ...s, ...config.config.modifications }
          : s
      ),
    };

    return { modifiedTemplate, originalStageCount: template.stages.length };
  }

  private async testAgentConfig(config: any): Promise<any> {
    const agents = this.swarm.getAgentStatus();
    const targetAgent = agents.find((a) => a.id === config.config.agentId);
    
    if (!targetAgent) {
      return { error: "Agent不存在" };
    }

    return {
      agentId: targetAgent.id,
      currentCapabilities: targetAgent.capabilities,
      proposedChanges: config.config.capabilityChanges,
    };
  }

  private async learn(cycle: EvolutionCycle): Promise<void> {
    cycle.status = "learning";
    console.log(`[SelfEvolution] 学习阶段: ${cycle.id}`);

    for (const experiment of cycle.experiments) {
      if (!experiment.success) continue;

      const learning = await this.extractLearning(experiment, cycle);
      if (learning) {
        cycle.learnings.push(learning);
        await this.applyLearning(learning);
      }
    }

    this.emit("cycle:learned", { cycleId: cycle.id, learnings: cycle.learnings });
  }

  private async extractLearning(experiment: Experiment, cycle: EvolutionCycle): Promise<Learning | null> {
    const { data } = await jsonCompletion([
      {
        role: "system",
        content: `从实验结果中提取可复用的学习。
        输出格式：{"pattern": "发现的模式", "applicability": "适用场景", "confidence": 0.8}`,
      },
      {
        role: "user",
        content: `假设：${cycle.hypotheses.find((h) => h.id === experiment.hypothesisId)?.statement}\n实验结果：${JSON.stringify(experiment.result)}`,
      },
    ]);

    if (!data.pattern) return null;

    return {
      id: `learn_${Date.now()}`,
      pattern: data.pattern,
      applicability: data.applicability,
      confidence: data.confidence,
      applied: false,
      sourceExperiments: [experiment.id],
    };
  }

  private async applyLearning(learning: Learning): Promise<void> {
    console.log(`[SelfEvolution] 应用学习: ${learning.pattern}`);

    await prisma.learningRecord.create({
      data: {
        pattern: learning.pattern,
        applicability: learning.applicability,
        confidence: learning.confidence,
        sourceExperiments: learning.sourceExperiments,
      },
    });

    learning.applied = true;
    this.emit("learning:applied", learning);
  }

  private async collectMetrics(projectId: string): Promise<any> {
    const [
      recentExecutions,
      recentAudits,
      generationJobs,
    ] = await Promise.all([
      prisma.pipelineExecution.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.auditReport.findMany({
        where: {
          chapter: { projectId },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.generationJob.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const avgQuality = recentAudits.reduce((s, a) => s + (a.qualityScore || 0), 0) / recentAudits.length || 0;
    const avgDuration = recentExecutions.reduce((s, e) => s + e.duration, 0) / recentExecutions.length || 0;
    const successRate = generationJobs.filter((j) => j.status === "COMPLETED").length / generationJobs.length || 0;

    return {
      avgQuality,
      avgDuration,
      successRate,
      totalExecutions: recentExecutions.length,
      totalAudits: recentAudits.length,
    };
  }

  private calculateSignificance(metrics: any): number {
    const factors = [
      metrics.avgQuality < 70 ? 0.8 : 0.2,
      metrics.successRate < 0.8 ? 0.7 : 0.1,
      metrics.avgDuration > 120000 ? 0.5 : 0.1,
    ];
    return Math.max(...factors);
  }

  private async saveCycle(cycle: EvolutionCycle): Promise<void> {
    await prisma.evolutionCycle.create({
      data: {
        id: cycle.id,
        projectId: cycle.projectId,
        cycleNumber: cycle.cycleNumber,
        observations: cycle.observations as any,
        hypotheses: cycle.hypotheses as any,
        experiments: cycle.experiments as any,
        learnings: cycle.learnings as any,
        status: cycle.status,
        startedAt: cycle.startedAt,
        completedAt: cycle.completedAt,
      },
    });
  }

  getActiveCycles(): EvolutionCycle[] {
    return Array.from(this.activeCycles.values());
  }

  async getEvolutionHistory(projectId?: string): Promise<any[]> {
    return prisma.evolutionCycle.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { startedAt: "desc" },
      take: 50,
    });
  }
}
