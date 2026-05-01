import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id: projectId, chapterId } = await params;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { stateDiff: true },
    });
    if (!chapter) return NextResponse.json({ error: "章节不存在" }, { status: 404 });

    // Get subsequent chapters
    const subsequentChapters = await prisma.chapter.findMany({
      where: {
        projectId,
        chapterNumber: { gt: chapter.chapterNumber },
      },
      orderBy: { chapterNumber: "asc" },
      take: 10,
      select: { id: true, chapterNumber: true, title: true, summary: true, content: true },
    });

    // Get foreshadows and characters referenced in this chapter
    const foreshadows = await prisma.foreshadow.findMany({
      where: { projectId },
      select: { id: true, clueText: true, status: true, relatedCharacters: true },
    });

    const characters = await prisma.character.findMany({
      where: { projectId },
      select: { id: true, name: true, currentGoal: true, currentStatus: true },
    });

    const result = await chatCompletion([
      {
        role: "system",
        content: `你是一个章节影响分析专家。分析修改某章节后，对后续章节的影响。
输出JSON：{
  "impactedChapters": [{"chapterNumber": 0, "impactType": "情节冲突/设定矛盾/伏笔断裂/人物行为不一致", "description": "影响描述", "severity": "red/yellow/green"}],
  "impactedForeshadows": [{"id": "伏笔ID", "impact": "影响描述"}],
  "impactedCharacters": [{"id": "角色ID", "impact": "影响描述"}],
  "recommendations": ["建议1"]
}`,
      },
      {
        role: "user",
        content: `已修改的章节：第${chapter.chapterNumber}章「${chapter.title}」
摘要：${chapter.summary || "无"}

后续章节：
${subsequentChapters.map((ch) => `第${ch.chapterNumber}章「${ch.title}」摘要：${ch.summary || "无"}`).join("\n")}

当前伏笔：
${foreshadows.map((f) => `- ${f.clueText}（状态：${f.status}）`).join("\n")}

当前角色：
${characters.map((c) => `- ${c.name}（目标：${c.currentGoal}，状态：${c.currentStatus}）`).join("\n")}

请分析修改此章节后的影响范围。`,
      },
    ], { responseFormat: { type: "json_object" } });

    return NextResponse.json(JSON.parse(result.content));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
