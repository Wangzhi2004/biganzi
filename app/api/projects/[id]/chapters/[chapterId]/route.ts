import { NextRequest, NextResponse } from "next/server";
import { chapterService } from "@/lib/services/chapter.service";
import { chatCompletion } from "@/lib/ai/gateway";

const OP_PROMPTS: Record<string, string> = {
  continue: `你是专业小说续写助手。根据已提供的章节内容，续写下一段情节。
要求：
1. 保持原文的叙事风格、语气和节奏
2. 延续当前情节线，推动故事发展
3. 续写长度约 500-800 字
4. 只输出续写内容，不要解释`,

  expand: `你是专业小说扩写助手。将提供的章节内容进行扩写，增加细节描写、心理活动和场景渲染。
要求：
1. 保持核心情节不变
2. 增加感官细节（视觉、听觉、嗅觉等）
3. 丰富人物内心独白和情绪描写
4. 扩写后长度约为原文的 1.5-2 倍
5. 只输出扩写后的完整内容`,

  compress: `你是专业小说压缩助手。将提供的章节内容进行精简，去除冗余描写，保留核心情节和关键对话。
要求：
1. 保持故事主线完整
2. 保留所有关键对话和转折点
3. 压缩后长度约为原文的 60-70%
4. 只输出压缩后的完整内容`,

  rewrite: `你是专业小说重写助手。对提供的章节进行重写优化，提升文学性和可读性。
要求：
1. 保持核心情节和人物设定不变
2. 优化句式结构，避免重复用词
3. 增强画面感和代入感
4. 改善段落节奏和过渡
5. 只输出重写后的完整内容`,

  rewrite_selection: `你是专业小说改写助手。对提供的选中段落进行改写优化。
要求：
1. 保持原意和情节不变
2. 改变表达方式，使文字更生动
3. 优化句式，增强节奏感
4. 只输出改写后的段落内容`,

  change_style: `你是专业小说风格调整助手。调整章节的写作风格，保持剧情不变。
要求：
1. 保持所有情节、对话内容和信息量完全不变
2. 调整叙述语气、句式结构、修辞手法
3. 改变节奏感和氛围渲染
4. 使文本风格更符合目标风格
5. 只输出调整风格后的完整内容`,

  change_plot: `你是专业小说情节调整助手。调整章节的情节走向，保持文风不变。
要求：
1. 保持原文的写作风格、语气和节奏
2. 修改情节发展、事件顺序或结局走向
3. 调整人物行为和决策
4. 确保修改后的情节仍然合理连贯
5. 只输出调整情节后的完整内容`,

  style_only_rewrite: `你是专业小说风格改写助手。严格保持剧情不变，只调整写作风格。
要求：
1. 【严格】所有情节点、事件、人物行为、对话内容必须完全保留
2. 只改变叙述方式、句式结构、修辞手法、节奏感
3. 不得增删任何情节点或信息
4. 不得改变人物的任何决策或行为
5. 只输出风格调整后的完整内容
违反剧情不变原则即为失败。`,

  plot_only_rewrite: `你是专业小说情节改写助手。严格保持文风不变，只调整情节走向。
要求：
1. 【严格】保持原文的叙述风格、语气、句式特征、修辞偏好完全不变
2. 只修改事件发展、人物决策、情节走向
3. 不得改变叙述视角、节奏风格、用词习惯
4. 修改后的情节必须与上下文合理衔接
5. 只输出情节调整后的完整内容
违反文风不变原则即为失败。`,

  enhance_conflict: `你是专业小说冲突增强助手。分析提供的章节内容，增强其中的冲突张力。
要求：
1. 识别现有冲突并深化其激烈程度
2. 增加人物之间的意见分歧或利益对立
3. 加入时间压力、道德困境等元素
4. 保持情节合理性
5. 只输出增强冲突后的完整内容`,

  enhance_dialogue: `你是专业小说对白增强助手。优化章节中的对话部分，使对白更生动、有个性。
要求：
1. 为每个人物赋予独特的语言风格
2. 加入潜台词和言外之意
3. 减少直白解释，多用对话推动情节
4. 适当加入打断、停顿、重复等口语特征
5. 只输出增强对白后的完整内容`,

  enhance_imagery: `你是专业小说画面增强助手。增强章节中的场景描写和视觉意象。
要求：
1. 增加具体的视觉细节和色彩描写
2. 运用比喻、拟人等修辞手法
3. 通过环境描写烘托氛围和人物情绪
4. 调动读者的感官体验
5. 只输出增强画面后的完整内容`,

  enhance_hook: `你是专业小说钩子增强助手。优化章节的开头和结尾，增强追读欲望。
要求：
1. 开头制造悬念或冲突，快速抓住读者注意力
2. 结尾设置 cliffhanger 或未解之谜
3. 确保章节结束时有明确的"接下来会怎样"的期待感
4. 保持整体风格一致
5. 只输出增强钩子后的完整内容`,

  enhance_romance: `你是专业小说暧昧/感情增强助手。增强章节中的情感线和暧昧氛围。
要求：
1. 增加角色之间的微妙互动（眼神、肢体语言、距离感）
2. 加入情感暗流和内心波动描写
3. 通过细节暗示角色之间的吸引力
4. 保持含蓄和张力，不要过于直白
5. 只输出增强暧昧后的完整内容`,

  enhance_pleasure: `你是专业小说爽点增强助手。增强章节中的爽感和高光时刻。
要求：
1. 强化主角的高光表现（打脸、逆袭、实力展示）
2. 增加围观群众的震惊反应和对比效果
3. 加强铺垫→爆发的节奏感
4. 用具体细节放大爽感（数字、对比、反差）
5. 只输出增强爽点后的完整内容`,
};

function buildMessages(op: string, fullContent?: string, selectedText?: string) {
  const system = OP_PROMPTS[op] || OP_PROMPTS.rewrite;
  const userPrompt = selectedText
    ? `请对以下选中的段落进行改写：\n\n${selectedText}`
    : `请对以下章节内容进行优化：\n\n${fullContent || ""}`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: userPrompt },
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const chapter = await chapterService.getById(chapterId);
    return NextResponse.json(chapter);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id: projectId, chapterId } = await params;
    const body = await request.json();

    // AI 编辑操作
    if (body.aiOperation) {
      const chapter = await chapterService.getById(chapterId);
      const messages = buildMessages(
        body.aiOperation,
        body.content || chapter.content || "",
        body.selectedText
      );

      const result = await chatCompletion(messages, { temperature: 0.75, maxTokens: 4000 }, {
        projectId,
        chapterId,
        stepName: `editor_${body.aiOperation}`,
      });

      let newContent = result.content.trim();
      // 去除可能的 markdown 代码块包裹
      if (newContent.startsWith("```")) {
        newContent = newContent.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
      }

      // 如果是选中文本操作，替换选中部分
      if (body.selectedText && body.selectionFrom != null && body.selectionTo != null) {
        const original = chapter.content || "";
        // 简单字符串替换（HTML 内容）
        const before = original.slice(0, body.selectionFrom);
        const after = original.slice(body.selectionTo);
        newContent = before + newContent + after;
      }

      // 保存到数据库
      const updated = await chapterService.update(chapterId, {
        content: newContent,
        wordCount: newContent.replace(/<[^>]+>/g, "").length,
      });

      return NextResponse.json({ ...updated, content: newContent, aiResult: result.content });
    }

    // 普通更新
    const chapter = await chapterService.update(chapterId, body);
    return NextResponse.json(chapter);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    await chapterService.delete(chapterId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
