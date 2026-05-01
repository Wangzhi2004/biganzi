import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const chapters = await prisma.chapter.findMany({
      where: { projectId, isConfirmed: false },
      orderBy: { chapterNumber: "asc" },
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        chapterFunction: true,
        summary: true,
        qualityScore: true,
      },
    });

    if (chapters.length < 2) {
      return NextResponse.json({ message: "需要至少 2 个未确认章节才能重排", suggestions: [] });
    }

    const foreshadows = await prisma.foreshadow.findMany({
      where: { projectId, status: { notIn: ["FULL_PAYOFF", "DEPRECATED"] } },
      select: { clueText: true, urgencyScore: true, heatScore: true, expectedPayoffStart: true },
      orderBy: { urgencyScore: "desc" },
      take: 10,
    });

    const result = await chatCompletion([
      {
        role: "system",
        content: `你是小说连载的章节重排专家。分析当前章节顺序，提出优化建议。

重排原则：
1. 主线推进不能连续超过 2 章
2. 爽点爆发每 5 章至少 1 次
3. 伏笔回收应在高紧急度伏笔的预期区间内
4. 压抑/危机后应有释放/沉淀
5. 重要角色不能连续 10 章不出场

输出JSON：
{
  "suggestions": [
    {
      "type": "swap/insert/reorder",
      "description": "建议描述",
      "affectedChapters": [章节号],
      "reasoning": "理由",
      "priority": 1
    }
  ],
  "pacingAnalysis": "当前节奏分析",
  "riskAreas": ["风险区域描述"]
}`,
      },
      {
        role: "user",
        content: `当前未确认章节：
${chapters.map((ch) => `第${ch.chapterNumber}章「${ch.title}」功能：${ch.chapterFunction} 摘要：${ch.summary || "无"}`).join("\n")}

高紧急度伏笔：
${foreshadows.map((f) => `- ${f.clueText}（紧急度：${f.urgencyScore}，预期回收：Ch.${f.expectedPayoffStart || "?"}）`).join("\n")}

请分析当前章节顺序并提出重排建议。`,
      },
    ], { responseFormat: { type: "json_object" } });

    return NextResponse.json(JSON.parse(result.content));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
