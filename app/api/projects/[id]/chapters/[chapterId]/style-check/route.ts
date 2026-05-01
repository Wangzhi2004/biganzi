import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonCompletion } from "@/lib/ai/gateway";
import { buildStyleDriftCheckPrompt } from "@/lib/ai/prompts";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id: projectId, chapterId } = await params;
  const body = await req.json().catch(() => ({}));
  const content = body.content as string;

  try {
    const styleFingerprint = await prisma.styleFingerprint.findUnique({
      where: { projectId },
    });

    if (!styleFingerprint) {
      return NextResponse.json({ error: "未找到风格指纹，请先在 Bible 中设置" }, { status: 400 });
    }

    const text = content || "";
    if (text.length < 50) {
      return NextResponse.json({ driftScore: 0, message: "内容太短，无法分析" });
    }

    const messages = buildStyleDriftCheckPrompt({
      text: text.slice(0, 5000),
      styleFingerprint,
    });

    const { data } = await jsonCompletion(
      messages,
      { temperature: 0.3, maxTokens: 1000 },
      { projectId, chapterId, stepName: "style_drift_check" }
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("风格偏移检测失败:", error);
    return NextResponse.json(
      { error: error.message || "检测失败" },
      { status: 500 }
    );
  }
}
