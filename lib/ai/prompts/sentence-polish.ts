import { Message } from "@/lib/ai/types";

export function buildSentencePolishPrompt(context: {
  text: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说文字润色编辑。你优化文本的句子结构，使文字更流畅、节奏更好、更有文学性。

你的修改必须：
1. 拆分过长的句子，增加节奏变化
2. 替换重复用词，丰富词汇
3. 调整句子结构，避免千篇一律的主谓宾
4. 保持原文的情节和信息不变

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请润色以下文本的句子：

【风格要求】
平均句长目标：${context.styleFingerprint.avgSentenceLength}字
修辞偏好：${JSON.stringify(context.styleFingerprint.rhetoricSystem)}
常用词：${JSON.stringify(context.styleFingerprint.commonWords)}
禁用词：${JSON.stringify(context.styleFingerprint.bannedWords)}

【原文】
${context.text}

要求：
1. 拆分超过40字的长句
2. 替换重复出现3次以上的词语
3. 增加句式变化（长短交替、倒装、省略等）
4. 不要改变原文的情节走向和信息量

请直接输出修改后的完整文本：`,
    },
  ];
}
