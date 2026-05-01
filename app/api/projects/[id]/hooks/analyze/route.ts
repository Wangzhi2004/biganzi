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
        const ending = (c.content || "").slice(-600);
        const messages: any[] = [
          {
            role: "system",
            content: `你是网络小说追读钩子诊断专家。请分析章节末尾的"追读钩子"强度——即读者是否会产生强烈欲望继续阅读下一章。

评分维度（每项 0-100）：
- curiosityScore: 好奇心钩子（悬念、未知）
- tensionScore: 张力钩子（冲突、危机）
- emotionScore: 情绪钩子（共情、期待）
- promiseScore: 承诺钩子（对下一章的明确预期）

总体 hookStrength = (curiosity + tension + emotion + promise) / 4

请以 JSON 格式返回：
{
  "hookStrength": 75,
  "scores": { "curiosityScore": 80, "tensionScore": 70, "emotionScore": 75, "promiseScore": 75 },
  "endingSummary": "结尾段落摘要",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "hookType": "悬念型|危机型|情绪型|承诺型|混合型"
}`,
          },
          {
            role: "user",
            content: `请诊断以下章节末尾的追读钩子强度：\n\n章节：第${c.chapterNumber}章《${c.title}》\n\n末尾内容：\n${ending}`,
          },
        ];

        const result = await chatCompletion(
          messages,
          { temperature: 0.65, maxTokens: 2000 },
          { projectId, chapterId: c.id, stepName: "hook_diagnosis" }
        );

        let diagnosis: any = {};
        try {
          const clean = result.content
            .replace(/```json\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          diagnosis = JSON.parse(clean);
        } catch {
          diagnosis = { raw: result.content, hookStrength: 0 };
        }

        return {
          chapterId: c.id,
          chapterNumber: c.chapterNumber,
          title: c.title,
          ...diagnosis,
        };
      })
    );

    return NextResponse.json({
      results,
      averageHookStrength: Math.round(
        results.reduce((s, r) => s + (r.hookStrength || 0), 0) / results.length
      ),
    });
  } catch (error: any) {
    console.error("追读钩子诊断失败:", error);
    return NextResponse.json(
      { error: error.message || "诊断失败" },
      { status: 500 }
    );
  }
}
