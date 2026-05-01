import { Message } from "@/lib/ai/types";

export function buildHookStrengthenPrompt(context: {
  text: string;
  chapterGoal: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说钩子编辑。你专门重写章节结尾，使章末钩子更有力，让读者产生强烈的追读欲望。

你的修改必须：
1. 只重写最后200-300字
2. 钩子类型可以是：悬念、反转、冲突升级、新信息、情感冲击、伏笔暗示
3. 钩子要自然衔接，不能生硬
4. 保持前文内容完全不变

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请重写以下文本的章末钩子：

【章节目标中的钩子设计】
${context.chapterGoal}

【章末风格】
${context.styleFingerprint.chapterEndStyle}

【原文】
${context.text}

要求：
1. 只修改最后200-300字
2. 钩子要让读者产生"必须看下一章"的冲动
3. 可以用悬念、反转、冲突升级等方式
4. 钩子要自然，不能突兀

请直接输出修改后的完整文本（包含前文不变部分和新的结尾）：`,
    },
  ];
}
