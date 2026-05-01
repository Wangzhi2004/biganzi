import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; foreshadowId: string }> }
) {
  try {
    const { foreshadowId } = await params;
    const foreshadow = await prisma.foreshadow.findUnique({ where: { id: foreshadowId } });
    if (!foreshadow) return NextResponse.json({ error: "伏笔不存在" }, { status: 404 });

    const body = await request.json();
    const newStart = body.newPayoffStart || (foreshadow.expectedPayoffEnd || 0) + 5;
    const newEnd = body.newPayoffEnd || newStart + 10;

    const result = await chatCompletion([
      { role: "system", content: `你是一个伏笔推迟专家。为推迟回收的伏笔设计维持方案。
输出JSON：{"maintainScene": "维持伏笔活跃的场景", "reminderApproach": "提醒方式", "reasoning": "推迟理由"}` },
      { role: "user", content: `伏笔线索：${foreshadow.clueText}\n当前回收区间：${foreshadow.expectedPayoffStart}-${foreshadow.expectedPayoffEnd}\n新回收区间：${newStart}-${newEnd}\n请设计推迟维持方案。` },
    ], { responseFormat: { type: "json_object" } });

    await prisma.foreshadow.update({
      where: { id: foreshadowId },
      data: {
        expectedPayoffStart: newStart,
        expectedPayoffEnd: newEnd,
        urgencyScore: Math.max((foreshadow.urgencyScore || 0) - 1, 0),
      },
    });

    return NextResponse.json(JSON.parse(result.content));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
