import { prisma } from "@/lib/prisma";
import { jsonCompletion, chatCompletion, type LogContext } from "@/lib/ai";

interface PromptVersion {
  id: string;
  name: string;
  content: string;
  role: string;
  taskType: string;
  version: number;
  performance: {
    avgScore: number;
    successRate: number;
    avgTokens: number;
    usageCount: number;
  };
  mutations: PromptMutation[];
  createdAt: Date;
}

interface PromptMutation {
  type: "structure" | "wording" | "constraint" | "example" | "strategy";
  change: string;
  reason: string;
  source: "human" | "auto" | "evolution";
}

interface ExecutionLog {
  promptVersionId: string;
  input: any;
  output: any;
  score: number;
  tokensUsed: number;
  durationMs: number;
  success: boolean;
  errorType?: string;
}

interface EvolutionStrategy {
  name: string;
  description: string;
  applicable: (logs: ExecutionLog[]) => boolean;
  evolve: (current: PromptVersion, logs: ExecutionLog[]) => Promise<PromptVersion>;
}

const EVOLUTION_STRATEGIES: EvolutionStrategy[] = [
  {
    name: "score_driven_optimization",
    description: "当平均分低于阈值时，自动调整提示词权重和约束",
    applicable: (logs) => {
      const recent = logs.slice(-10);
      if (recent.length < 5) return false;
      const avgScore = recent.reduce((s, l) => s + l.score, 0) / recent.length;
      return avgScore < 7.5;
    },
    evolve: async (current, logs) => {
      const recent = logs.slice(-10);
      const lowScoreLogs = recent.filter((l) => l.score < 6);
      
      const analysis = await jsonCompletion([
        {
          role: "system",
          content: `你是一个提示词优化专家。分析以下低分执行记录，找出提示词的问题并提出改进方案。
          输出格式：{"issues": ["问题1", "问题2"], "improvements": ["改进1", "改进2"], "newConstraints": ["新约束1"]}`
        },
        {
          role: "user",
          content: `当前提示词：\n${current.content}\n\n低分记录：\n${JSON.stringify(lowScoreLogs.map(l => ({ input: l.input, score: l.score, errorType: l.errorType })))}`
        }
      ]);

      const mutations: PromptMutation[] = [
        ...analysis.data.issues.map((issue: string) => ({
          type: "constraint" as const,
          change: `修复问题: ${issue}`,
          reason: `基于低分日志自动识别`,
          source: "evolution" as const,
        })),
        ...analysis.data.improvements.map((imp: string) => ({
          type: "wording" as const,
          change: imp,
          reason: `自动优化`,
          source: "evolution" as const,
        })),
      ];

      const newContent = await evolvePromptContent(current.content, mutations);
      
      return {
        ...current,
        content: newContent,
        version: current.version + 1,
        mutations: [...current.mutations, ...mutations],
      };
    },
  },
  {
    name: "error_pattern_fix",
    description: "当特定错误类型频繁出现时，针对性修复",
    applicable: (logs) => {
      const recent = logs.slice(-20);
      const errors = recent.filter((l) => !l.success);
      if (errors.length < 3) return false;
      const errorTypes = errors.reduce((acc, e) => {
        acc[e.errorType || "unknown"] = (acc[e.errorType || "unknown"] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return Object.values(errorTypes).some((c) => c >= 3);
    },
    evolve: async (current, logs) => {
      const recent = logs.slice(-20);
      const errors = recent.filter((l) => !l.success);
      const errorTypes = errors.reduce((acc, e) => {
        acc[e.errorType || "unknown"] = (acc[e.errorType || "unknown"] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dominantError = Object.entries(errorTypes)
        .sort((a, b) => b[1] - a[1])[0][0];

      const mutations: PromptMutation[] = [{
        type: "structure",
        change: `添加错误防护: ${dominantError}`,
        reason: `该错误类型出现 ${errorTypes[dominantError]} 次`,
        source: "evolution",
      }];

      const newContent = await evolvePromptContent(current.content, mutations);
      
      return {
        ...current,
        content: newContent,
        version: current.version + 1,
        mutations: [...current.mutations, ...mutations],
      };
    },
  },
  {
    name: "token_efficiency",
    description: "当token消耗过高时，优化提示词简洁性",
    applicable: (logs) => {
      const recent = logs.slice(-10);
      if (recent.length < 5) return false;
      const avgTokens = recent.reduce((s, l) => s + l.tokensUsed, 0) / recent.length;
      return avgTokens > 4000;
    },
    evolve: async (current, logs) => {
      const mutations: PromptMutation[] = [{
        type: "wording",
        change: "压缩提示词，移除冗余描述，使用更精确的指令",
        reason: "token消耗过高，需要提升效率",
        source: "evolution",
      }];

      const newContent = await evolvePromptContent(current.content, mutations);
      
      return {
        ...current,
        content: newContent,
        version: current.version + 1,
        mutations: [...current.mutations, ...mutations],
      };
    },
  },
];

async function evolvePromptContent(
  currentContent: string,
  mutations: PromptMutation[]
): Promise<string> {
  const { content } = await chatCompletion([
    {
      role: "system",
      content: `你是一个提示词工程师。根据给定的改进需求，优化提示词内容。
      保持提示词的核心结构和目标不变，只应用指定的改进。
      输出完整的优化后提示词。`
    },
    {
      role: "user",
      content: `当前提示词：\n${currentContent}\n\n改进需求：\n${mutations.map(m => `- [${m.type}] ${m.change}`).join("\n")}\n\n请输出优化后的完整提示词。`
    }
  ]);

  return content;
}

export const selfEvolution = {
  async recordExecution(
    promptVersionId: string,
    log: Omit<ExecutionLog, "promptVersionId">
  ): Promise<void> {
    await prisma.executionLog.create({
      data: {
        promptVersionId,
        input: JSON.stringify(log.input),
        output: JSON.stringify(log.output),
        score: log.score,
        tokensUsed: log.tokensUsed,
        durationMs: log.durationMs,
        success: log.success,
        errorType: log.errorType,
      },
    });

    await this.updatePromptPerformance(promptVersionId);
  },

  async updatePromptPerformance(promptVersionId: string): Promise<void> {
    const logs = await prisma.executionLog.findMany({
      where: { promptVersionId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (logs.length === 0) return;

    const avgScore = logs.reduce((s, l) => s + l.score, 0) / logs.length;
    const successRate = logs.filter((l) => l.success).length / logs.length;
    const avgTokens = logs.reduce((s, l) => s + l.tokensUsed, 0) / logs.length;

    await prisma.promptVersion.update({
      where: { id: promptVersionId },
      data: {
        avgScore,
        successRate,
        avgTokens,
        usageCount: logs.length,
      },
    });
  },

  async evolvePrompt(promptVersionId: string): Promise<PromptVersion | null> {
    const current = await prisma.promptVersion.findUnique({
      where: { id: promptVersionId },
    });

    if (!current) return null;

    const logs = await prisma.executionLog.findMany({
      where: { promptVersionId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const executionLogs: ExecutionLog[] = logs.map((l) => ({
      promptVersionId: l.promptVersionId,
      input: JSON.parse(l.input || "{}"),
      output: JSON.parse(l.output || "{}"),
      score: l.score,
      tokensUsed: l.tokensUsed,
      durationMs: l.durationMs,
      success: l.success,
      errorType: l.errorType || undefined,
    }));

    const promptVersion: PromptVersion = {
      id: current.id,
      name: current.name,
      content: current.content,
      role: current.role,
      taskType: current.taskType,
      version: current.version,
      performance: {
        avgScore: current.avgScore,
        successRate: current.successRate,
        avgTokens: current.avgTokens,
        usageCount: current.usageCount,
      },
      mutations: (current.mutations as unknown as PromptMutation[]) || [],
      createdAt: current.createdAt,
    };

    for (const strategy of EVOLUTION_STRATEGIES) {
      if (strategy.applicable(executionLogs)) {
        console.log(`[SelfEvolution] 应用策略: ${strategy.name}`);
        const evolved = await strategy.evolve(promptVersion, executionLogs);
        
        const newVersion = await prisma.promptVersion.create({
          data: {
            name: evolved.name,
            content: evolved.content,
            role: evolved.role,
            taskType: evolved.taskType,
            version: evolved.version,
            mutations: evolved.mutations as any,
            parentId: current.id,
          },
        });

        return {
          ...evolved,
          id: newVersion.id,
        };
      }
    }

    return null;
  },

  async getBestPromptVersion(taskType: string, role: string): Promise<PromptVersion | null> {
    const versions = await prisma.promptVersion.findMany({
      where: { taskType, role },
      orderBy: [{ avgScore: "desc" }, { usageCount: "desc" }],
      take: 1,
    });

    if (versions.length === 0) return null;

    const v = versions[0];
    return {
      id: v.id,
      name: v.name,
      content: v.content,
      role: v.role,
      taskType: v.taskType,
      version: v.version,
      performance: {
        avgScore: v.avgScore,
        successRate: v.successRate,
        avgTokens: v.avgTokens,
        usageCount: v.usageCount,
      },
      mutations: (v.mutations as unknown as PromptMutation[]) || [],
      createdAt: v.createdAt,
    };
  },

  async compareVersions(versionAId: string, versionBId: string): Promise<{
    winner: string;
    reason: string;
    metrics: { score: number; successRate: number; tokens: number }[];
  }> {
    const [a, b] = await Promise.all([
      prisma.promptVersion.findUnique({ where: { id: versionAId } }),
      prisma.promptVersion.findUnique({ where: { id: versionBId } }),
    ]);

    if (!a || !b) throw new Error("版本不存在");

    const metricsA = { score: a.avgScore, successRate: a.successRate, tokens: a.avgTokens };
    const metricsB = { score: b.avgScore, successRate: b.successRate, tokens: b.avgTokens };

    const scoreA = metricsA.score * 0.4 + metricsA.successRate * 0.4 + (1 / metricsA.tokens) * 0.2;
    const scoreB = metricsB.score * 0.4 + metricsB.successRate * 0.4 + (1 / metricsB.tokens) * 0.2;

    const winner = scoreA > scoreB ? versionAId : versionBId;
    const reason = scoreA > scoreB
      ? `版本A综合得分更高 (${scoreA.toFixed(2)} vs ${scoreB.toFixed(2)})`
      : `版本B综合得分更高 (${scoreB.toFixed(2)} vs ${scoreA.toFixed(2)})`;

    return {
      winner,
      reason,
      metrics: [metricsA, metricsB],
    };
  },
};
