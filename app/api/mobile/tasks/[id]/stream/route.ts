import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const STEP_NAMES: Record<string, string> = {
  chapter_function: "选择章节功能",
  chapter_goal: "生成章节目标",
  scene_cards: "生成场景卡",
  chapter_body: "写作初稿",
  multi_draft_judge: "多草稿评审",
  style_drift_check: "风格偏移检查",
  style_align: "风格对齐",
  audit_consistency: "一致性审稿",
  audit_pacing: "节奏审稿",
  audit_style: "风格审稿",
  rewrite: "自动重写",
  state_diff: "状态抽取",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let currentJobId: string | null = null;
      let lastStepCount = 0;

      const send = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      request.signal.addEventListener("abort", () => {
        closed = true;
        try { controller.close(); } catch { /* ignore */ }
      });

      const findLatestJob = async () => {
        return prisma.generationJob.findFirst({
          where: {
            projectId,
            status: { in: ["PENDING", "RUNNING", "COMPLETED", "FAILED"] },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            durationMs: true,
            errorMessage: true,
            chapterId: true,
            createdAt: true,
          },
        });
      };

      const poll = async (): Promise<void> => {
        if (closed) return;

        try {
          const job = await findLatestJob();

          if (!job) {
            send({ type: "waiting", message: "等待任务创建..." });
            if (!closed) setTimeout(poll, 2000);
            return;
          }

          if (currentJobId !== job.id) {
            currentJobId = job.id;
            lastStepCount = 0;
            send({ type: "job_found", jobId: job.id });
          }

          const aiCalls = await prisma.aICallLog.findMany({
            where: { jobId: job.id },
            orderBy: { stepOrder: "asc" },
            select: {
              stepName: true,
              stepOrder: true,
              status: true,
              durationMs: true,
              promptTokens: true,
              completionTokens: true,
            },
          });

          if (aiCalls.length > lastStepCount) {
            const newSteps = aiCalls.slice(lastStepCount);
            for (const step of newSteps) {
              send({
                type: "step",
                step: step.stepName,
                label: STEP_NAMES[step.stepName] || step.stepName,
                order: step.stepOrder,
                status: step.status,
                durationMs: step.durationMs,
                tokens: (step.promptTokens || 0) + (step.completionTokens || 0),
              });
            }
            lastStepCount = aiCalls.length;
          }

          const totalSteps = Object.keys(STEP_NAMES).length;
          const completedSteps = aiCalls.filter((c) => c.status === "SUCCESS").length;
          const totalTokens = aiCalls.reduce(
            (s, c) => s + (c.promptTokens || 0) + (c.completionTokens || 0), 0
          );
          const totalDuration = aiCalls.reduce((s, c) => s + (c.durationMs || 0), 0);

          send({
            type: "progress",
            status: job.status,
            completedSteps,
            totalSteps,
            percent: Math.round((completedSteps / totalSteps) * 100),
            totalTokens,
            totalDurationMs: totalDuration,
            currentStep:
              aiCalls.length > 0
                ? STEP_NAMES[aiCalls[aiCalls.length - 1].stepName] || aiCalls[aiCalls.length - 1].stepName
                : "准备中",
          });

          if (job.status === "COMPLETED" || job.status === "FAILED") {
            if (job.chapterId) {
              const chapter = await prisma.chapter.findUnique({
                where: { id: job.chapterId },
                select: { qualityScore: true, title: true, chapterNumber: true },
              });
              send({
                type: "completed",
                qualityScore: chapter?.qualityScore || null,
                chapterTitle: chapter?.title,
                chapterNumber: chapter?.chapterNumber,
              });
            }
            if (job.status === "FAILED") {
              send({ type: "failed", error: job.errorMessage });
            }
            closed = true;
            try { controller.close(); } catch { /* ignore */ }
            return;
          }
        } catch (err) {
          send({ type: "error", message: (err as Error).message });
        }

        if (!closed) {
          setTimeout(poll, 2000);
        }
      };

      send({ type: "connected", projectId });
      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
