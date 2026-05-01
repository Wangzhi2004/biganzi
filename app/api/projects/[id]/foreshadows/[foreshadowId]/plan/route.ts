import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai/gateway";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; foreshadowId: string }> }
) {
  const { id: projectId, foreshadowId } = await params;

  try {
    const foreshadow = await prisma.foreshadow.findUnique({
      where: { id: foreshadowId, projectId },
    });
    if (!foreshadow) {
      return NextResponse.json({ error: "伏笔不存在" }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { currentChapter: true },
    });

    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: "desc" },
      take: 5,
      select: { chapterNumber: true, title: true, summary: true },
    });

    const messages: any[] = [
      {
        role: "system",
        content: `你是网络小说伏笔回收专家。请根据伏笔的当前状态和故事进展，生成一个详细的回收方案。

回收方案必须包含：
1. 最佳回收时机（具体章节范围）
2. 回收方式（直接揭示/误导后揭示/分阶段揭示/反转揭示）
3. 具体场景设计（2-3个场景）
4. 回收后的影响（对人物、主线、读者的影响）
5. 需要的前期铺垫（如果需要更多铺垫）

所有输出必须使用中文。`,
      },
      {
        role: "user",
        content: `请为以下伏笔生成回收方案：

【伏笔信息】
线索文本：${foreshadow.clueText}
表面含义：${foreshadow.surfaceMeaning}
真实含义：${foreshadow.trueMeaning}
埋设章节：第${foreshadow.plantedChapter}章
当前状态：${foreshadow.status}
热度分数：${foreshadow.heatScore}
紧急度：${foreshadow.urgencyScore}
预计回收区间：${foreshadow.expectedPayoffStart || "?"} - ${foreshadow.expectedPayoffEnd || "?"}章

【当前进度】
当前章节：第${project?.currentChapter || 0}章
距离埋设：${(project?.currentChapter || 0) - foreshadow.plantedChapter} 章

【最近章节】
${chapters.map(c => `第${c.chapterNumber}章《${c.title}》- ${c.summary || "无摘要"}`).join("\n")}

请以JSON格式返回：
{
  "recommendedTiming": "建议在第X-Y章回收",
  "approach": "回收方式",
  "scenes": [
    {
      "chapterRange": "第X章",
      "sceneDescription": "场景描述",
      "purpose": "该场景的目的"
    }
  ],
  "aftermath": "回收后的影响",
  "prerequisites": ["需要的前期铺垫"],
  "riskAssessment": "风险评估"
}`,
      },
    ];

    const result = await chatCompletion(
      messages,
      { temperature: 0.7, maxTokens: 3000 },
      { projectId, stepName: "foreshadow_payoff_plan" }
    );

    let plan: any = {};
    try {
      const clean = result.content
        .replace(/```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      plan = JSON.parse(clean);
    } catch {
      plan = { raw: result.content };
    }

    return NextResponse.json({
      foreshadowId,
      foreshadowClue: foreshadow.clueText,
      plan,
    });
  } catch (error: any) {
    console.error("伏笔回收方案生成失败:", error);
    return NextResponse.json(
      { error: error.message || "生成失败" },
      { status: 500 }
    );
  }
}
