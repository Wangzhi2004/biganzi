import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 找到该项目最新的运行中 job
    const job = await prisma.generationJob.findFirst({
      where: {
        projectId,
        status: { in: ["PENDING", "RUNNING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!job) {
      return NextResponse.json({ error: "没有正在运行的任务" }, { status: 404 });
    }

    // 标记为已取消（pipeline 继续跑但前端不再监控）
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: "用户取消" },
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
