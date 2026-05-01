import { prisma } from "@/lib/prisma";
import { GenerationJobType, GenerationJobStatus } from "@prisma/client";

const JOB_TYPE_MAP: Record<string, GenerationJobType> = {
  initialize: "INITIALIZE",
  next_chapter: "NEXT_CHAPTER",
  rewrite: "REWRITE",
  style_rewrite: "STYLE_REWRITE",
  expand: "EXPAND",
  compress: "COMPRESS",
};

const STATUS_MAP: Record<string, GenerationJobStatus> = {
  pending: "PENDING",
  running: "RUNNING",
  completed: "COMPLETED",
  failed: "FAILED",
};

export const generationService = {
  async createJob(data: {
    projectId: string;
    chapterId?: string;
    jobType: string;
    inputContext?: any;
  }): Promise<string> {
    try {
      const jobType = JOB_TYPE_MAP[data.jobType.toLowerCase()];
      if (!jobType) {
        throw new Error(`无效的任务类型: ${data.jobType}`);
      }

      const job = await prisma.generationJob.create({
        data: {
          projectId: data.projectId,
          chapterId: data.chapterId,
          jobType,
          status: "RUNNING",
          inputContext: data.inputContext || undefined,
        },
      });

      return job.id;
    } catch (error) {
      throw new Error(`创建生成任务失败: ${(error as Error).message}`);
    }
  },

  async updateJob(
    id: string,
    data: {
      status?: string;
      output?: any;
      durationMs?: number;
      tokenCount?: number;
      cost?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {};

      if (data.status !== undefined) {
        const mappedStatus = STATUS_MAP[data.status.toLowerCase()];
        if (!mappedStatus) {
          throw new Error(`无效的任务状态: ${data.status}`);
        }
        updateData.status = mappedStatus;
      }
      if (data.output !== undefined) updateData.output = data.output;
      if (data.durationMs !== undefined) updateData.durationMs = data.durationMs;
      if (data.tokenCount !== undefined) updateData.tokenCount = data.tokenCount;
      if (data.cost !== undefined) updateData.cost = data.cost;
      if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;

      await prisma.generationJob.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new Error(`更新生成任务失败: ${(error as Error).message}`);
    }
  },

  async getJob(id: string): Promise<any> {
    try {
      return await prisma.generationJob.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, name: true } },
          chapter: { select: { id: true, chapterNumber: true, title: true } },
        },
      });
    } catch (error) {
      throw new Error(`获取生成任务失败: ${(error as Error).message}`);
    }
  },

  async getJobsByProject(projectId: string): Promise<any[]> {
    try {
      return await prisma.generationJob.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: {
          chapter: { select: { id: true, chapterNumber: true, title: true } },
        },
      });
    } catch (error) {
      throw new Error(`获取项目生成任务列表失败: ${(error as Error).message}`);
    }
  },

  async getLatestJob(projectId: string): Promise<any> {
    try {
      return await prisma.generationJob.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: {
          chapter: { select: { id: true, chapterNumber: true, title: true } },
        },
      });
    } catch (error) {
      throw new Error(`获取最新生成任务失败: ${(error as Error).message}`);
    }
  },
};
