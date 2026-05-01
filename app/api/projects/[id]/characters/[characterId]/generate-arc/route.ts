import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id: projectId, characterId } = await params;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const recentChapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: "desc" },
      take: 10,
      select: { chapterNumber: true, title: true, summary: true },
    });

    const result = await chatCompletion(
      [
        {
          role: "system",
          content: `你是一个专业的小说人物弧线设计师。你为角色设计下一阶段的成长弧线。

输出JSON格式：
{
  "currentStage": "当前成长阶段描述",
  "suggestion": "下一阶段弧线建议，200字以内",
  "keyEvents": ["关键事件1", "关键事件2", "关键事件3"],
  "emotionalJourney": "情感变化路线"
}

所有内容使用中文。`,
        },
        {
          role: "user",
          content: `请为以下角色设计下一阶段弧线：

角色名：${character.name}
角色类型：${character.roleType}
欲望：${character.desire || "未知"}
恐惧：${character.fear || "未知"}
创伤：${character.wound || "未知"}
秘密：${character.secret || "未知"}
底线：${character.moralBoundary || "未知"}
当前目标：${character.currentGoal || "未知"}
当前状态：${character.currentStatus || "未知"}
实力等级：${character.powerLevel || "未知"}

最近章节：
${recentChapters.map((ch) => `第${ch.chapterNumber}章「${ch.title}」：${ch.summary || "无摘要"}`).join("\n")}`,
        },
      ],
      { responseFormat: { type: "json_object" } }
    );

    return NextResponse.json(JSON.parse(result.content));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
