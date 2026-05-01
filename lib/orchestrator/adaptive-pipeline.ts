import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";
import { jsonCompletion, chatCompletion, type LogContext } from "@/lib/ai";
import { SelfOrganizingSwarm } from "./self-organization";
import { selfEvolution } from "./self-evolution";

interface PipelineStage {
  id: string;
  name: string;
  type: "planning" | "generation" | "audit" | "refine" | "extract" | "custom";
  executor: string;
  inputTransform?: (input: any, context: PipelineContext) => any;
  outputTransform?: (output: any, context: PipelineContext) => any;
  condition?: (context: PipelineContext) => boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    onFailure: "skip" | "abort" | "fallback";
  };
  timeoutMs: number;
}

interface PipelineContext {
  projectId: string;
  chapterId?: string;
  variables: Record<string, any>;
  stageResults: Map<string, any>;
  metrics: {
    startTime: number;
    stageDurations: Map<string, number>;
    totalTokens: number;
    errors: Array<{ stage: string; error: string; timestamp: number }>;
  };
  swarm: SelfOrganizingSwarm;
}

interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  adaptiveRules: AdaptiveRule[];
  createdAt: Date;
  updatedAt: Date;
}

interface AdaptiveRule {
  id: string;
  condition: (context: PipelineContext) => boolean;
  action: (context: PipelineContext) => Promise<void>;
  priority: number;
}

interface PipelineExecution {
  id: string;
  templateId: string;
  context: PipelineContext;
  status: "running" | "completed" | "failed" | "adapted";
  currentStage: number;
  results: any;
}

export class AdaptivePipeline extends EventEmitter {
  private templates: Map<string, PipelineTemplate> = new Map();
  private executions: Map<string, PipelineExecution> = new Map();
  private swarm: SelfOrganizingSwarm;

  constructor(swarm: SelfOrganizingSwarm) {
    super();
    this.swarm = swarm;
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const chapterGenerationTemplate: PipelineTemplate = {
      id: "chapter_generation",
      name: "章节生成流水线",
      description: "自适应章节生成、审稿、重写流水线",
      stages: [
        {
          id: "context_build",
          name: "构建上下文",
          type: "custom",
          executor: "context_builder",
          retryPolicy: { maxRetries: 2, backoffMs: 1000, onFailure: "abort" },
          timeoutMs: 10000,
        },
        {
          id: "function_select",
          name: "选择章节功能",
          type: "planning",
          executor: "planner",
          condition: (ctx) => !ctx.variables.skipPlanning,
          retryPolicy: { maxRetries: 2, backoffMs: 1000, onFailure: "fallback" },
          timeoutMs: 30000,
        },
        {
          id: "goal_generate",
          name: "生成章节目标",
          type: "planning",
          executor: "planner",
          condition: (ctx) => !ctx.variables.skipPlanning,
          retryPolicy: { maxRetries: 2, backoffMs: 1000, onFailure: "fallback" },
          timeoutMs: 30000,
        },
        {
          id: "scene_cards",
          name: "生成场景卡",
          type: "planning",
          executor: "planner",
          retryPolicy: { maxRetries: 2, backoffMs: 1000, onFailure: "fallback" },
          timeoutMs: 30000,
        },
        {
          id: "write_draft",
          name: "写作初稿",
          type: "generation",
          executor: "writer",
          retryPolicy: { maxRetries: 1, backoffMs: 2000, onFailure: "abort" },
          timeoutMs: 120000,
        },
        {
          id: "style_align",
          name: "风格对齐",
          type: "refine",
          executor: "writer",
          condition: (ctx) => ctx.variables.styleFingerprint != null,
          retryPolicy: { maxRetries: 1, backoffMs: 1000, onFailure: "skip" },
          timeoutMs: 60000,
        },
        {
          id: "multi_audit",
          name: "多轮审稿",
          type: "audit",
          executor: "auditor",
          retryPolicy: { maxRetries: 2, backoffMs: 1000, onFailure: "fallback" },
          timeoutMs: 90000,
        },
        {
          id: "auto_refine",
          name: "自动精修",
          type: "refine",
          executor: "writer",
          condition: (ctx) => {
            const auditResult = ctx.stageResults.get("multi_audit");
            return auditResult?.overallStatus !== "green";
          },
          retryPolicy: { maxRetries: 2, backoffMs: 1500, onFailure: "skip" },
          timeoutMs: 90000,
        },
        {
          id: "state_extract",
          name: "状态抽取",
          type: "extract",
          executor: "extractor",
          retryPolicy: { maxRetries: 2, backoffMs: 1000, onFailure: "fallback" },
          timeoutMs: 60000,
        },
      ],
      adaptiveRules: [
        {
          id: "quality_gate",
          priority: 1,
          condition: (ctx) => {
            const auditResult = ctx.stageResults.get("multi_audit");
            return auditResult?.overallStatus === "red";
          },
          action: async (ctx) => {
            this.emit("pipeline:adapt", { type: "quality_gate_triggered", context: ctx });
            ctx.variables.forceRewrite = true;
            ctx.variables.rewriteIntensity = "deep";
          },
        },
        {
          id: "token_budget",
          priority: 2,
          condition: (ctx) => ctx.metrics.totalTokens > 15000,
          action: async (ctx) => {
            this.emit("pipeline:adapt", { type: "token_budget_exceeded", context: ctx });
            ctx.variables.skipPlanning = true;
            ctx.variables.useFastModel = true;
          },
        },
        {
          id: "style_drift",
          priority: 3,
          condition: (ctx) => {
            const auditResult = ctx.stageResults.get("multi_audit");
            return auditResult?.styleScore < 6;
          },
          action: async (ctx) => {
            this.emit("pipeline:adapt", { type: "style_drift_detected", context: ctx });
            ctx.variables.enhanceStyle = true;
            ctx.variables.stylePassCount = (ctx.variables.stylePassCount || 0) + 1;
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(chapterGenerationTemplate.id, chapterGenerationTemplate);
  }

  async executePipeline(
    templateId: string,
    projectId: string,
    initialVariables: Record<string, any> = {}
  ): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`模板不存在: ${templateId}`);

    const executionId = `exec_${Date.now()}_${templateId}`;
    const context: PipelineContext = {
      projectId,
      variables: { ...initialVariables },
      stageResults: new Map(),
      metrics: {
        startTime: Date.now(),
        stageDurations: new Map(),
        totalTokens: 0,
        errors: [],
      },
      swarm: this.swarm,
    };

    const execution: PipelineExecution = {
      id: executionId,
      templateId,
      context,
      status: "running",
      currentStage: 0,
      results: null,
    };

    this.executions.set(executionId, execution);
    this.emit("pipeline:started", execution);

    try {
      for (let i = 0; i < template.stages.length; i++) {
        const stage = template.stages[i];
        execution.currentStage = i;

        if (stage.condition && !stage.condition(context)) {
          console.log(`[AdaptivePipeline] 跳过阶段: ${stage.name}`);
          continue;
        }

        const stageStart = Date.now();
        let stageResult: any;
        let retries = 0;

        while (retries <= stage.retryPolicy.maxRetries) {
          try {
            stageResult = await this.executeStage(stage, context);
            break;
          } catch (error) {
            retries++;
            context.metrics.errors.push({
              stage: stage.id,
              error: (error as Error).message,
              timestamp: Date.now(),
            });

            if (retries > stage.retryPolicy.maxRetries) {
              switch (stage.retryPolicy.onFailure) {
                case "abort":
                  throw error;
                case "skip":
                  console.log(`[AdaptivePipeline] 跳过失败阶段: ${stage.name}`);
                  stageResult = null;
                  break;
                case "fallback":
                  stageResult = await this.executeFallback(stage, context);
                  break;
              }
              break;
            }

            await this.delay(stage.retryPolicy.backoffMs * retries);
          }
        }

        context.stageResults.set(stage.id, stageResult);
        context.metrics.stageDurations.set(stage.id, Date.now() - stageStart);

        await this.applyAdaptiveRules(template, context);

        this.emit("stage:completed", { executionId, stage: stage.id, result: stageResult });
      }

      execution.status = "completed";
      execution.results = this.compileResults(context);

      await this.saveExecutionMetrics(execution);
      this.emit("pipeline:completed", execution);

      return execution.results;
    } catch (error) {
      execution.status = "failed";
      this.emit("pipeline:failed", { executionId, error });
      throw error;
    }
  }

  private async executeStage(stage: PipelineStage, context: PipelineContext): Promise<any> {
    const input = stage.inputTransform
      ? stage.inputTransform(context.variables, context)
      : context.variables;

    const task = await this.swarm.submitTask({
      id: `task_${stage.id}_${Date.now()}`,
      type: stage.type,
      priority: 5,
      data: {
        stageName: stage.name,
        input,
        projectId: context.projectId,
      },
      dependencies: [],
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`阶段超时: ${stage.name}`));
      }, stage.timeoutMs);

      this.swarm.once("task:completed", (completedTask) => {
        if (completedTask.id === task.id) {
          clearTimeout(timeout);
          const output = stage.outputTransform
            ? stage.outputTransform(completedTask.result, context)
            : completedTask.result;
          resolve(output);
        }
      });

      this.swarm.once("task:failed", (failedTask) => {
        if (failedTask.id === task.id) {
          clearTimeout(timeout);
          reject(new Error(`阶段执行失败: ${stage.name}`));
        }
      });
    });
  }

  private async executeFallback(stage: PipelineStage, context: PipelineContext): Promise<any> {
    console.log(`[AdaptivePipeline] 执行降级方案: ${stage.name}`);

    const fallbackPrompt: Array<{ role: "system" | "user"; content: string }> = [
      {
        role: "system",
        content: `你是一个降级执行器。阶段 "${stage.name}" 执行失败，请基于已有上下文生成一个简化但可用的结果。`,
      },
      {
        role: "user",
        content: `上下文：${JSON.stringify(context.variables)}\n已有结果：${JSON.stringify(Object.fromEntries(context.stageResults))}`,
      },
    ];

    const { data } = await jsonCompletion(fallbackPrompt);
    return data;
  }

  private async applyAdaptiveRules(template: PipelineTemplate, context: PipelineContext): Promise<void> {
    const applicableRules = template.adaptiveRules
      .filter((rule) => rule.condition(context))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      console.log(`[AdaptivePipeline] 应用自适应规则: ${rule.id}`);
      await rule.action(context);
    }
  }

  private compileResults(context: PipelineContext): any {
    return {
      variables: context.variables,
      stageResults: Object.fromEntries(context.stageResults),
      metrics: {
        totalDuration: Date.now() - context.metrics.startTime,
        stageDurations: Object.fromEntries(context.metrics.stageDurations),
        totalTokens: context.metrics.totalTokens,
        errorCount: context.metrics.errors.length,
      },
    };
  }

  private async saveExecutionMetrics(execution: PipelineExecution): Promise<void> {
    await prisma.pipelineExecution.create({
      data: {
        id: execution.id,
        templateId: execution.templateId,
        projectId: execution.context.projectId,
        chapterId: execution.context.chapterId,
        status: execution.status,
        results: execution.results as any,
        metrics: execution.results?.metrics as any,
        duration: execution.results?.metrics?.totalDuration || 0,
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createTemplate(template: Omit<PipelineTemplate, "id" | "createdAt" | "updatedAt">): Promise<PipelineTemplate> {
    const newTemplate: PipelineTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  getTemplate(templateId: string): PipelineTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): PipelineTemplate[] {
    return Array.from(this.templates.values());
  }

  getExecution(executionId: string): PipelineExecution | undefined {
    return this.executions.get(executionId);
  }
}
