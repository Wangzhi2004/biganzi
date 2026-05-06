import { prisma } from "@/lib/prisma";
import { projectService } from "./project.service";
import { chapterService } from "./chapter.service";
import { SelfEvolutionEngine } from "../orchestrator/self-evolution-engine";
import { SelfOrganizingSwarm } from "../orchestrator/self-organization";
import { AdaptivePipeline } from "../orchestrator/adaptive-pipeline";
import { MetaLearner } from "../orchestrator/meta-learner";

export interface SerialTask {
  id: string;
  projectId: string;
  chapterNumber: number;
  status: "pending" | "generating" | "auditing" | "rewriting" | "approved" | "rejected" | "published";
  qualityScore: number | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  chapterId?: string;
}

export interface SerialDailyStats {
  date: string;
  projectId: string;
  chaptersGenerated: number;
  chaptersApproved: number;
  chaptersRejected: number;
  avgQualityScore: number;
  totalWords: number;
}

export const autoSerialService = {
  async getPendingTasks(projectId: string): Promise<SerialTask[]> {
    return prisma.serialTask.findMany({
      where: { projectId, status: "pending" },
      orderBy: { chapterNumber: "asc" },
    });
  },

  async getTasksByStatus(projectId: string, status: string): Promise<SerialTask[]> {
    return prisma.serialTask.findMany({
      where: { projectId, status },
      orderBy: { createdAt: "desc" },
    });
  },

  async createTasks(projectId: string, count: number): Promise<SerialTask[]> {
    const project = await projectService.getProject(projectId);
    if (!project) throw new Error("项目不存在");

    const lastChapter = await prisma.chapter.findFirst({
      where: { projectId },
      orderBy: { chapterNumber: "desc" },
    });

    const nextChapterNumber = (lastChapter?.chapterNumber || 0) + 1;
    const tasks: any[] = [];

    for (let i = 0; i < count; i++) {
      tasks.push({
        projectId,
        chapterNumber: nextChapterNumber + i,
        status: "pending",
        qualityScore: null,
        retryCount: 0,
      });
    }

    return prisma.serialTask.createManyAndReturn({ data: tasks });
  },

  async executeTask(taskId: string): Promise<SerialTask> {
    const task = await prisma.serialTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("任务不存在");

    await prisma.serialTask.update({
      where: { id: taskId },
      data: { status: "generating" },
    });

    try {
      const config = await prisma.autoSerialConfig.findUnique({
        where: { projectId: task.projectId },
      });

      const swarm = new SelfOrganizingSwarm();
      const pipeline = new AdaptivePipeline(swarm);
      const metaLearner = new MetaLearner();
      const engine = new SelfEvolutionEngine(swarm, pipeline, metaLearner);

      const result = await engine.runEvolutionCycle(task.projectId);

      const chapter = await chapterService.createChapter({
        projectId: task.projectId,
        chapterNumber: task.chapterNumber,
        title: result.observations?.[0]?.data?.title || `第${task.chapterNumber}章`,
        content: "",
      });

      const auditResult = await this.auditChapter(chapter.id);
      const score = auditResult.qualityScore || 0;

      await prisma.serialTask.update({
        where: { id: taskId },
        data: {
          status: score >= (config?.autoRewriteThreshold || 70) ? "approved" : "rewriting",
          qualityScore: score,
          chapterId: chapter.id,
        },
      });

      if (score < (config?.autoRewriteThreshold || 70)) {
        return this.autoRewrite(taskId, config?.autoRewriteThreshold || 70);
      }

      return prisma.serialTask.findUnique({ where: { id: taskId } })!;
    } catch (error) {
      await prisma.serialTask.update({
        where: { id: taskId },
        data: { status: "rejected" },
      });
      throw error;
    }
  },

  async autoRewrite(taskId: string, threshold: number): Promise<SerialTask> {
    const task = await prisma.serialTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("任务不存在");

    if (task.retryCount >= 3) {
      await prisma.serialTask.update({
        where: { id: taskId },
        data: { status: "rejected" },
      });
      return task;
    }

    await prisma.serialTask.update({
      where: { id: taskId },
      data: { status: "rewriting", retryCount: task.retryCount + 1 },
    });

    try {
      if (!task.chapterId) return task;

      const chapter = await chapterService.getChapter(task.chapterId);
      if (!chapter) return task;

      await chapterService.rewriteChapter(task.chapterId, {
        mode: "style_only_rewrite",
      });

      const auditResult = await this.auditChapter(task.chapterId);
      const score = auditResult.qualityScore || 0;

      await prisma.serialTask.update({
        where: { id: taskId },
        data: {
          status: score >= threshold ? "approved" : "rewriting",
          qualityScore: score,
        },
      });

      if (score < threshold && task.retryCount + 1 < 3) {
        return this.autoRewrite(taskId, threshold);
      }

      return prisma.serialTask.findUnique({ where: { id: taskId } })!;
    } catch {
      await prisma.serialTask.update({
        where: { id: taskId },
        data: { status: "rejected" },
      });
      throw new Error("自动重写失败");
    }
  },

  async auditChapter(chapterId: string): Promise<{ qualityScore: number; issues: any[] }> {
    const chapter = await chapterService.getChapter(chapterId);
    if (!chapter) throw new Error("章节不存在");

    const auditResult = await chapterService.auditChapter(chapterId);
    return {
      qualityScore: auditResult.qualityScore || 0,
      issues: auditResult.issues || [],
    };
  },

  async approveTask(taskId: string): Promise<SerialTask> {
    return prisma.serialTask.update({
      where: { id: taskId },
      data: { status: "approved" },
    });
  },

  async rejectTask(taskId: string): Promise<SerialTask> {
    return prisma.serialTask.update({
      where: { id: taskId },
      data: { status: "rejected" },
    });
  },

  async publishTask(taskId: string): Promise<SerialTask> {
    const task = await prisma.serialTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("任务不存在");

    if (task.chapterId) {
      await chapterService.publishChapter(task.chapterId);
    }

    return prisma.serialTask.update({
      where: { id: taskId },
      data: { status: "published" },
    });
  },

  async getDailyStats(projectId: string, date: string): Promise<SerialDailyStats | null> {
    return prisma.serialDailyStats.findUnique({
      where: { projectId_date: { projectId, date } },
    });
  },

  async recordDailyStats(projectId: string, date: string, stats: Omit<SerialDailyStats, "date" | "projectId">) {
    await prisma.serialDailyStats.upsert({
      where: { projectId_date: { projectId, date } },
      update: stats,
      create: { projectId, date, ...stats },
    });
  },

  async runDailyGeneration(projectId: string): Promise<void> {
    const config = await prisma.autoSerialConfig.findUnique({
      where: { projectId },
    });

    if (!config || !config.enabled) return;

    const today = new Date().toISOString().split("T")[0];
    const existingStats = await this.getDailyStats(projectId, today);
    
    if (existingStats && existingStats.chaptersGenerated >= config.dailyChapterCount) {
      return;
    }

    const tasks = await this.createTasks(projectId, config.dailyChapterCount);
    
    for (const task of tasks) {
      await this.executeTask(task.id);
    }

    const completedTasks = await prisma.serialTask.findMany({
      where: { projectId, createdAt: { gte: new Date(today) } },
    });

    const approved = completedTasks.filter(t => t.status === "approved").length;
    const rejected = completedTasks.filter(t => t.status === "rejected").length;
    const avgScore = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.qualityScore || 0), 0) / completedTasks.length
      : 0;

    await this.recordDailyStats(projectId, today, {
      chaptersGenerated: completedTasks.length,
      chaptersApproved: approved,
      chaptersRejected: rejected,
      avgQualityScore: avgScore,
      totalWords: completedTasks.length * (config.chapterWordCount || 4000),
    });
  },
};
