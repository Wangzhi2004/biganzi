import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai/gateway";
import { buildCharacterDriftCheckPrompt } from "@/lib/ai/prompts/character";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const { id: projectId, characterId } = await params;
  const body = await req.json().catch(() => ({}));
  const chapterId = body.chapterId as string | undefined;

  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId, projectId },
    });
    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    let chapters: { id: string; chapterNumber: number; title: string; content: string | null }[];

    if (chapterId) {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId, projectId },
        select: { id: true, chapterNumber: true, title: true, content: true },
      });
      if (!chapter) {
        return NextResponse.json({ error: "章节不存在" }, { status: 404 });
      }
      chapters = [chapter];
    } else {
      chapters = await prisma.chapter.findMany({
        where: { projectId },
        orderBy: { chapterNumber: "desc" },
        take: 10,
        select: { id: true, chapterNumber: true, title: true, content: true },
      });
    }

    const chaptersWithContent = chapters.filter(c => (c.content || "").length > 100);
    if (chaptersWithContent.length === 0) {
      return NextResponse.json(
        { error: "无可分析章节，请先生成或编写章节内容" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      chaptersWithContent.map(async (c) => {
        const messages = buildCharacterDriftCheckPrompt({
          character,
          chapterContent: (c.content || "").slice(0, 3000),
          chapterNumber: c.chapterNumber,
        });

        const result = await chatCompletion(
          messages,
          { temperature: 0.5, maxTokens: 2000 },
          { projectId, chapterId: c.id, stepName: "character_drift_check" }
        );

        let diagnosis: any = {};
        try {
          const clean = result.content
            .replace(/```json\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          diagnosis = JSON.parse(clean);
        } catch {
          diagnosis = { raw: result.content, hasDrift: false, driftPoints: [], consistencyScore: 50 };
        }

        return {
          chapterId: c.id,
          chapterNumber: c.chapterNumber,
          title: c.title,
          ...diagnosis,
        };
      })
    );

    const avgScore = Math.round(
      results.reduce((s, r) => s + (r.consistencyScore || 0), 0) / results.length
    );

    const allDriftPoints = results.flatMap(r => (r.driftPoints || []).map((dp: any) => ({
      ...dp,
      chapterNumber: r.chapterNumber,
      chapterTitle: r.title,
    })));

    return NextResponse.json({
      characterId,
      characterName: character.name,
      results,
      averageConsistencyScore: avgScore,
      totalDriftPoints: allDriftPoints.length,
      driftPoints: allDriftPoints,
    });
  } catch (error: any) {
    console.error("人物漂移检测失败:", error);
    return NextResponse.json(
      { error: error.message || "检测失败" },
      { status: 500 }
    );
  }
}
