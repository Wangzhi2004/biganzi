import { Message } from "@/lib/ai/types";

export function buildMultiDraftJudgePrompt(context: {
  drafts: Array<{ index: number; text: string }>;
  chapterGoal: string;
  sceneCards: any[];
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说选稿编辑。你从多个候选版本中选出最佳的一个，并给出详细评分和选择理由。

评分维度（每项1-10分）：
1. 节奏（pacing）：叙事节奏是否紧凑、有层次、张弛有度
2. 对白（dialogue）：对话是否自然、有潜台词、符合角色性格
3. 画面感（imagery）：描写是否生动、有感官细节、能想象出画面
4. 钩子（hook）：章末是否能有效吸引读者追读
5. 一致性（consistency）：是否符合章节目标和场景卡的要求

加权公式：总分 = 节奏*0.30 + 对白*0.20 + 画面感*0.20 + 钩子*0.15 + 一致性*0.15

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请从以下${context.drafts.length}个候选版本中选出最佳的一个：

【章节目标】
${context.chapterGoal}

【场景卡】
${context.sceneCards.map((s) => `场景${s.sceneNumber}：${s.location} - ${s.conflict}`).join("\n")}

【风格要求】
叙述视角：${context.styleFingerprint.narrativePOV}
平均句长：${context.styleFingerprint.avgSentenceLength}字
对白比例：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%

${context.drafts.map((d) => `【版本${d.index + 1}】\n${d.text}`).join("\n\n---\n\n")}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "selectedIndex": 0,
  "reasoning": "选择理由，100字以内",
  "scores": [
    {
      "index": 0,
      "pacing": 8,
      "dialogue": 7,
      "imagery": 8,
      "hook": 9,
      "consistency": 8,
      "total": 8.0
    }
  ]
}
\`\`\`

注意：selectedIndex从0开始。所有文字内容必须使用中文。`,
    },
  ];
}
