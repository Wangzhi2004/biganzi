import { Message } from "@/lib/ai/types";

export function buildDialogueEnhancePrompt(context: {
  text: string;
  activeCharacters: any[];
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说对白编辑。你专门优化小说中的对话，使对白更自然、更有张力、更符合角色性格。

你的修改必须：
1. 只修改对白段落，不改动叙事和描写
2. 给对白增加潜台词，让角色说话有言外之意
3. 让每个角色的说话方式符合其语言习惯
4. 增加对白中的冲突和张力
5. 保持原文的情节走向不变

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请优化以下文本中的对白：

【出场角色语言习惯】
${context.activeCharacters.filter((c) => c.speechPattern).map((c) => `- ${c.name}：${c.speechPattern}`).join("\n")}

【风格要求】
对白比例目标：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%

【原文】
${context.text}

要求：
1. 只修改对白部分，叙事描写保持不变
2. 让对话更有潜台词和冲突
3. 每个角色的说话方式要明显不同
4. 去掉废话对话，保留有信息量的对话

请直接输出修改后的完整文本：`,
    },
  ];
}
