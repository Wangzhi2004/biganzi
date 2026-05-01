import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai/gateway";

const COMMON_TROPES = [
  "被轻视后反杀",
  "拍卖会争夺",
  "秘境试炼",
  "宗门大比",
  "身份揭露",
  "师门背叛",
  "强者救场",
  "反派压迫",
  "女主误会",
  "交易谈判",
  "逃亡追杀",
  "闭关突破",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: "asc" },
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        content: true,
        summary: true,
        sceneCards: true,
      },
    });

    const chaptersWithContent = chapters.filter(
      (c) => (c.content || "").length > 50
    );

    if (chaptersWithContent.length === 0) {
      return NextResponse.json(
        { error: "无可分析章节，请先生成或编写章节内容" },
        { status: 400 }
      );
    }

    const context = chaptersWithContent
      .map(
        (c) =>
          `第${c.chapterNumber}章《${c.title}》\n摘要：${c.summary || "无"}\n内容节选：${(c.content || "").slice(0, 800)}...`
      )
      .join("\n\n---\n\n");

    const messages: any[] = [
      {
        role: "system",
        content: `你是网络小说桥段分析专家。请分析提供的章节内容，识别其中使用的常见桥段类型，并评估是否有重复使用的风险。

常见桥段类型：${COMMON_TROPES.join("、")}

请以 JSON 格式返回，结构如下：
{
  "detectedTropes": [
    {
      "tropeName": "桥段名称",
      "chapters": [1, 3],
      "frequency": 2,
      "riskLevel": "low|medium|high",
      "description": "在该章节中如何呈现"
    }
  ],
  "repeatedTropes": [
    {
      "tropeName": "桥段名称",
      "occurrences": 3,
      "lastUsedChapter": 5,
      "variants": [
        {
          "title": "变体标题",
          "description": "变体描述",
          "example": "示例场景"
        }
      ]
    }
  ],
  "suggestions": ["建议1", "建议2"]
}`,
      },
      {
        role: "user",
        content: `请分析以下章节内容中的桥段使用情况：\n\n${context}`,
      },
    ];

    const result = await chatCompletion(
      messages,
      { temperature: 0.7, maxTokens: 4000 },
      { projectId, stepName: "trope_analysis" }
    );

    let analysis: any = {};
    try {
      const clean = result.content
        .replace(/```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = { raw: result.content, detectedTropes: [], repeatedTropes: [] };
    }

    return NextResponse.json({
      ...analysis,
      totalChapters: chaptersWithContent.length,
      commonTropes: COMMON_TROPES,
    });
  } catch (error: any) {
    console.error("套路变体分析失败:", error);
    return NextResponse.json(
      { error: error.message || "分析失败" },
      { status: 500 }
    );
  }
}
