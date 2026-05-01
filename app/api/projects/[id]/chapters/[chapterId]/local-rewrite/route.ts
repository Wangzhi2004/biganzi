import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id: projectId, chapterId } = await params;
    const body = await request.json();
    const { targetSection, issue, suggestion } = body;

    if (!targetSection || !issue) {
      return NextResponse.json({ error: "缺少 targetSection 或 issue" }, { status: 400 });
    }

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || !chapter.content) {
      return NextResponse.json({ error: "章节不存在或无内容" }, { status: 404 });
    }

    // Find the problematic section in the content
    const content = chapter.content;
    const sectionIndex = content.indexOf(targetSection);

    if (sectionIndex === -1) {
      // If exact match not found, try to find a similar section
      return NextResponse.json({
        error: "未找到目标段落，请提供更精确的段落引用",
        suggestion: "请从正文中复制需要修改的段落",
      }, { status: 400 });
    }

    const before = content.slice(0, sectionIndex);
    const after = content.slice(sectionIndex + targetSection.length);

    const result = await chatCompletion([
      {
        role: "system",
        content: `你是一个专业的小说局部修改编辑。你只修改指定的问题段落，保持其他内容完全不变。

要求：
1. 只修改目标段落，不要修改其他任何内容
2. 修改后的段落要自然衔接前后文
3. 解决指定的问题，但保持情节走向不变
4. 输出修改后的段落文本，不要输出其他内容`,
      },
      {
        role: "user",
        content: `请修改以下段落：

【问题描述】
${issue}

${suggestion ? `【修改建议】\n${suggestion}\n` : ""}
【需要修改的段落】
${targetSection}

【前文（用于参考衔接）】
${before.slice(-200)}

【后文（用于参考衔接）】
${after.slice(0, 200)}

请输出修改后的段落文本：`,
      },
    ], { temperature: 0.7 });

    let newSection = result.content.trim();
    if (newSection.startsWith("```")) {
      newSection = newSection.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
    }

    // Replace the section in the content
    const newContent = before + newSection + after;

    // Save to database
    const updated = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        content: newContent,
        wordCount: newContent.replace(/<[^>]+>/g, "").length,
      },
    });

    return NextResponse.json({
      content: newContent,
      originalSection: targetSection,
      newSection,
      wordCount: updated.wordCount,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
