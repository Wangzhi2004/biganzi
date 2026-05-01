import { Message } from "@/lib/ai/types";

export function buildSensoryEnrichPrompt(context: {
  text: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说感官描写编辑。你在文本中恰当位置加入视觉、听觉、嗅觉、触觉等感官细节，使场景更加生动立体。

你的修改必须：
1. 在场景转换处和关键动作处加入感官描写
2. 感官描写要服务于氛围和情绪，不能为了描写而描写
3. 保持原文的情节和节奏不变
4. 描写要具体、有画面感，避免泛泛的形容词

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请在以下文本中加入感官描写：

【环境描写目标比例】
${(context.styleFingerprint.environmentRatio * 100).toFixed(0)}%

【原文】
${context.text}

要求：
1. 在场景转换处加入环境感官细节（视觉、听觉、嗅觉、触觉选择1-2种）
2. 在关键动作处加入身体感受
3. 不要改变原文的叙事节奏
4. 感官描写要具体（"铁锈味"而不是"难闻的气味"）

请直接输出修改后的完整文本：`,
    },
  ];
}
