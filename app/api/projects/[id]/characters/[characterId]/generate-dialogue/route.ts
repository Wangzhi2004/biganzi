import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const result = await chatCompletion(
      [
        {
          role: "system",
          content: `你是一个专业的小说对白设计师。你为角色生成符合其性格的专属对白示例。

输出JSON格式：
{
  "sample": "3-5句符合角色性格的对白示例，每句一行，标注场景",
  "speechAnalysis": "语言风格分析，50字以内",
  "catchphrase": "该角色的标志性口头禅或说话方式"
}

所有内容使用中文。`,
        },
        {
          role: "user",
          content: `请为以下角色生成专属对白：

角色名：${character.name}
角色类型：${character.roleType}
语言习惯：${character.speechPattern || "未知"}
欲望：${character.desire || "未知"}
恐惧：${character.fear || "未知"}
秘密：${character.secret || "未知"}
底线：${character.moralBoundary || "未知"}
当前目标：${character.currentGoal || "未知"}`,
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
