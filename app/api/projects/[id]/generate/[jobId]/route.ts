import { NextRequest, NextResponse } from "next/server";
import { generationService } from "@/lib/services/generation.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id, jobId } = await params;

    if (!id || !jobId) {
      return NextResponse.json(
        { error: "项目ID和任务ID是必需的" },
        { status: 400 }
      );
    }

    const job = await generationService.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "生成任务不存在" },
        { status: 404 }
      );
    }

    if (job.projectId !== id) {
      return NextResponse.json(
        { error: "任务不属于该项目" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        status: job.status.toLowerCase(),
        jobType: job.jobType.toLowerCase(),
        chapterId: job.chapterId,
        chapter: job.chapter,
        output: job.output,
        durationMs: job.durationMs,
        tokenCount: job.tokenCount,
        cost: job.cost,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    console.error("[GET_JOB_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "获取任务状态失败" },
      { status: 500 }
    );
  }
}
