import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai/gateway";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const chapterId = body.chapterId as string | undefined;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { genre: true, subGenre: true, description: true, bookDna: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    let chapters: { id: string; chapterNumber: number; title: string; content: string | null; summary: string | null }[];

    if (chapterId) {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId, projectId },
        select: { id: true, chapterNumber: true, title: true, content: true, summary: true },
      });
      if (!chapter) {
        return NextResponse.json({ error: "章节不存在" }, { status: 404 });
      }
      chapters = [chapter];
    } else {
      chapters = await prisma.chapter.findMany({
        where: { projectId },
        orderBy: { chapterNumber: "asc" },
        select: { id: true, chapterNumber: true, title: true, content: true, summary: true },
      });
    }

    const chaptersWithContent = chapters.filter((c) => (c.content || "").length > 50);
    if (chaptersWithContent.length === 0) {
      return NextResponse.json(
        { error: "无可分析章节，请先生成或编写章节内容" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      chaptersWithContent.map(async (c) => {
        const contentSnippet = (c.content || "").slice(0, 1200);
        const messages: any[] = [
          {
            role: "system",
            content: `你是网络小说读者模拟器。请模拟三种不同读者画像对同一章节的阅读反应，并预测追读率。

读者画像：
1. "爽文读者"：追求即时满足、打脸反转、升级快感
2. "剧情读者"：关注逻辑、伏笔回收、主线推进
3. "情感读者"：关注人物关系、情绪共鸣、CP互动

评分维度（每项 0-100）：
- continueReadingRate: 继续阅读下一章的概率
- satisfaction: 本章满意度
- engagement: 阅读投入度

请以 JSON 格式返回：
{
  "overallPrediction": {
    "continueReadingRate": 78,
    "satisfaction": 75,
    "engagement": 80,
    "summary": "总体评价摘要"
  },
  "personas": [
    {
      "name": "爽文读者",
      "traits": "追求即时满足...",
      "reaction": "反应描述",
      "highlights": ["喜欢的点1", "喜欢的点2"],
      "complaints": ["不满1", "不满2"],
      "continueReadingRate": 85,
      "satisfaction": 82,
      "engagement": 88
    }
  ],
  "dropRiskPoints": ["可能导致弃读的风险点"],
  "retentionSuggestions": ["提高留存建议"]
}`,
          },
          {
            role: "user",
            content: `请模拟读者反应：\n\n作品类型：${project.genre} / ${project.subGenre}\n简介：${project.description || "无"}\n\n章节：第${c.chapterNumber}章《${c.title}》\n摘要：${c.summary || "无"}\n\n内容节选：\n${contentSnippet}\n...`,
          },
        ];

        const result = await chatCompletion(
          messages,
          { temperature: 0.75, maxTokens: 3000 },
          { projectId, chapterId: c.id, stepName: "reader_simulator" }
        );

        let simulation: any = {};
        try {
          const clean = result.content
            .replace(/```json\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          simulation = JSON.parse(clean);
        } catch {
          simulation = { raw: result.content, personas: [] };
        }

        return {
          chapterId: c.id,
          chapterNumber: c.chapterNumber,
          title: c.title,
          ...simulation,
        };
      })
    );

    const avgContinueRate = Math.round(
      results.reduce((s, r) => s + (r.overallPrediction?.continueReadingRate || 0), 0) /
        results.length
    );

    return NextResponse.json({
      results,
      averageContinueReadingRate: avgContinueRate,
    });
  } catch (error: any) {
    console.error("读者模拟失败:", error);
    return NextResponse.json(
      { error: error.message || "模拟失败" },
      { status: 500 }
    );
  }
}
