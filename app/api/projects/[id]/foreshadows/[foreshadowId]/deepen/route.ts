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

    const result = await chatCompletion([
      { role: "system", content: `你是一个伏笔加深专家。为现有伏笔设计加深方案，让伏笔更加引人入胜。
输出JSON：{"deepenScene": "加深场景描述", "newClue": "新线索文本", "misdirection": "误导方向", "suggestedChapter": "建议在第几章加深"}` },
      { role: "user", content: `伏笔线索：${foreshadow.clueText}\n表面含义：${foreshadow.surfaceMeaning}\n真实含义：${foreshadow.trueMeaning}\n当前状态：${foreshadow.status}\n热度：${foreshadow.heatScore}\n请设计加深方案。` },
    ], { responseFormat: { type: "json_object" } });

    await prisma.foreshadow.update({
      where: { id: foreshadowId },
      data: { status: "DEEPENED", heatScore: Math.min((foreshadow.heatScore || 0) + 2, 10) },
    });

    return NextResponse.json(JSON.parse(result.content));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
