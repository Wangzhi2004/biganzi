import { prisma } from "@/lib/prisma";
import { jsonCompletion } from "@/lib/ai";

interface LearningEpisode {
  id: string;
  projectId: string;
  chapterId?: string;
  taskType: string;
  input: any;
  expectedOutput: any;
  actualOutput: any;
  score: number;
  feedback?: string;
  timestamp: Date;
}

interface Pattern {
  id: string;
  type: "success" | "failure" | "optimization";
  context: string;
  action: string;
  result: string;
  frequency: number;
  confidence: number;
  lastObserved: Date;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  applicability: (context: any) => boolean;
  execute: (context: any) => Promise<any>;
  successRate: number;
  usageCount: number;
}

export class MetaLearner {
  private patterns: Map<string, Pattern> = new Map();
  private strategies: Map<string, Strategy> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    const strategies: Strategy[] = [
      {
        id: "context_compression",
        name: "上下文压缩",
        description: "当上下文过长时，自动压缩非关键信息",
        applicability: (ctx) => ctx.tokenCount > 8000,
        execute: async (ctx) => {
          const { data } = await jsonCompletion([
            {
              role: "system",
              content: "你是一个上下文压缩专家。保留关键信息，压缩冗余内容。",
            },
            {
              role: "user",
              content: `请压缩以下上下文，保留关键信息：\n${JSON.stringify(ctx.input)}`,
            },
          ]);
          return { ...ctx, input: data.compressed };
        },
        successRate: 0.85,
        usageCount: 0,
      },
      {
        id: "multi_draft",
        name: "多草稿生成",
        description: "关键章节生成多个版本并选择最优",
        applicability: (ctx) => ctx.chapterFunction === "pleasure_burst" || ctx.chapterFunction === "foreshadow_payoff",
        execute: async (ctx) => {
          const drafts = await Promise.all(
            [0.7, 0.9, 1.1].map((temp) =>
              jsonCompletion(ctx.prompt, { temperature: temp })
            )
          );
          return { ...ctx, drafts: drafts.map((d) => d.data) };
        },
        successRate: 0.78,
        usageCount: 0,
      },
      {
        id: "incremental_planning",
        name: "增量规划",
        description: "基于已有规划进行增量调整而非重新生成",
        applicability: (ctx) => ctx.existingPlan != null && ctx.changeScope === "minor",
        execute: async (ctx) => {
          const { data } = await jsonCompletion([
            {
              role: "system",
              content: "你是一个增量规划专家。基于现有规划进行最小必要调整。",
            },
            {
              role: "user",
              content: `现有规划：${JSON.stringify(ctx.existingPlan)}\n调整需求：${JSON.stringify(ctx.changes)}`,
            },
          ]);
          return { ...ctx, plan: data };
        },
        successRate: 0.92,
        usageCount: 0,
      },
    ];

    strategies.forEach((s) => this.strategies.set(s.id, s));
  }

  async recordEpisode(episode: Omit<LearningEpisode, "id" | "timestamp">): Promise<void> {
    const newEpisode: LearningEpisode = {
      ...episode,
      id: `ep_${Date.now()}`,
      timestamp: new Date(),
    };

    await prisma.learningEpisode.create({
      data: {
        projectId: newEpisode.projectId,
        chapterId: newEpisode.chapterId,
        taskType: newEpisode.taskType,
        input: newEpisode.input,
        expectedOutput: newEpisode.expectedOutput,
        actualOutput: newEpisode.actualOutput,
        score: newEpisode.score,
        feedback: newEpisode.feedback,
      },
    });

    await this.extractPatterns(newEpisode);
  }

  private async extractPatterns(episode: LearningEpisode): Promise<void> {
    const context = this.summarizeContext(episode.input);
    const action = this.summarizeAction(episode.taskType, episode.input);
    const result = episode.score >= 8 ? "success" : episode.score >= 5 ? "partial" : "failure";

    const patternKey = `${context}::${action}`;
    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.frequency++;
      existing.confidence = this.updateConfidence(existing.confidence, result === "success");
      existing.lastObserved = new Date();
    } else {
      this.patterns.set(patternKey, {
        id: `pattern_${Date.now()}`,
        type: result === "success" ? "success" : "failure",
        context,
        action,
        result,
        frequency: 1,
        confidence: result === "success" ? 0.7 : 0.3,
        lastObserved: new Date(),
      });
    }
  }

  private summarizeContext(input: any): string {
    const keyFactors = [
      input.genre,
      input.chapterFunction,
      input.characterCount > 5 ? "many_chars" : "few_chars",
      input.wordCount > 3000 ? "long" : "short",
    ].filter(Boolean);
    return keyFactors.join("|");
  }

  private summarizeAction(taskType: string, input: any): string {
    return `${taskType}:${input.chapterFunction || "general"}`;
  }

  private updateConfidence(current: number, success: boolean): number {
    const alpha = 0.1;
    return success
      ? current + alpha * (1 - current)
      : current - alpha * current;
  }

  async selectStrategy(context: any): Promise<Strategy | null> {
    const applicable = Array.from(this.strategies.values()).filter((s) =>
      s.applicability(context)
    );

    if (applicable.length === 0) return null;

    const scored = applicable.map((s) => ({
      strategy: s,
      score: s.successRate * Math.log(s.usageCount + 1),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].strategy;
  }

  async learnFromProject(projectId: string): Promise<void> {
    const episodes = await prisma.learningEpisode.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (episodes.length < 10) return;

    const analysis = await this.analyzeEpisodes(episodes);
    
    for (const insight of analysis.insights) {
      await this.applyInsight(insight);
    }
  }

  private async analyzeEpisodes(episodes: any[]): Promise<any> {
    const { data } = await jsonCompletion([
      {
        role: "system",
        content: `你是一个元学习分析器。分析执行记录，提取可复用的策略和模式。
        输出格式：{"insights": [{"type": "strategy"|"pattern", "description": "", "applicability": "", "expectedImprovement": 0}]}`,
      },
      {
        role: "user",
        content: `分析以下执行记录：\n${JSON.stringify(episodes.map((e) => ({
          taskType: e.taskType,
          score: e.score,
          feedback: e.feedback,
        })))}`,
      },
    ]);

    return data;
  }

  private async applyInsight(insight: any): Promise<void> {
    if (insight.type === "strategy") {
      const newStrategy: Strategy = {
        id: `strategy_${Date.now()}`,
        name: insight.description,
        description: insight.applicability,
        applicability: new Function("ctx", `return ${insight.applicability}`) as any,
        execute: async (ctx) => ctx,
        successRate: insight.expectedImprovement || 0.5,
        usageCount: 0,
      };

      this.strategies.set(newStrategy.id, newStrategy);
    }
  }

  async getRecommendations(projectId: string, currentContext: any): Promise<any[]> {
    const relevantPatterns = Array.from(this.patterns.values())
      .filter((p) => p.context.includes(currentContext.genre))
      .sort((a, b) => b.confidence * b.frequency - a.confidence * a.frequency)
      .slice(0, 5);

    const recommendations = relevantPatterns.map((p) => ({
      type: p.type,
      pattern: p.action,
      confidence: p.confidence,
      frequency: p.frequency,
      suggestion: p.type === "success"
        ? "建议继续使用此策略"
        : "建议避免此策略或进行改进",
    }));

    return recommendations;
  }

  getPatternStats(): { totalPatterns: number; avgConfidence: number; topPatterns: Pattern[] } {
    const patterns = Array.from(this.patterns.values());
    return {
      totalPatterns: patterns.length,
      avgConfidence: patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length || 0,
      topPatterns: patterns
        .sort((a, b) => b.confidence * b.frequency - a.confidence * a.frequency)
        .slice(0, 10),
    };
  }
}
