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
      { role: "system", content: `你是一个伏笔误导专家。设计误导性解释，让读者对伏笔产生错误理解。
输出JSON：{"misleadingScene": "误导场景描述", "falseClue": "假线索文本", "falseInterpretation": "读者会形成的错误理解", "revealTiming": "何时揭示真相"}` },
      { role: "user", content: `伏笔线索：${foreshadow.clueText}\n表面含义：${foreshadow.surfaceMeaning}\n真实含义：${foreshadow.trueMeaning}\n请设计误导方案。` },
    ], { responseFormat: { type: "json_object" } });

    return NextResponse.json(JSON.parse(result.content));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
