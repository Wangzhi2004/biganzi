import { Message } from "@/lib/ai/types";

export function buildPacingAuditPrompt(context: {
  chapterContent: string;
  chapterGoal: string;
  chapterFunction: string;
  pacingState: any;
  styleFingerprint: any;
  recentChapters: any[];
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说节奏审查员。你专门检查章节的叙事节奏、追读吸引力和爽点密度。

你只关注节奏和追读体验，不评价设定一致性。

检查维度：
1. 张力曲线：章节内的紧张度是否有起伏，不能全高或全低
2. 爽点密度：是否有足够的爽感/高光时刻
3. 水文检测：是否有连续段落无信息增量
4. 章末钩子：结尾是否能有效吸引追读
5. 节奏匹配：节奏是否匹配章节功能（如爽点爆发章应该节奏快）

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请检查以下章节的节奏：

【章节正文】
${context.chapterContent}

【章节目标】
${context.chapterGoal}

【章节功能】
${context.chapterFunction}

【当前节奏状态】
当前紧张度：${context.pacingState.currentTension}
最近章节类型：${context.pacingState.recentChapterTypes.join("、")}
距离上次爽点：${context.pacingState.chaptersSinceLastPleasure}章
距离上次危机：${context.pacingState.chaptersSinceLastCrisis}章

【风格要求】
信息密度目标：${context.styleFingerprint.infoDensity}

【前文节奏】
${context.recentChapters.map((ch) => `第${ch.chapterNumber}章（${ch.chapterFunction}）质量分：${ch.qualityScore}`).join("\n")}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "pacingScore": 8,
  "tensionCurve": "描述本章张力曲线的走势，如'低-中-高-极高'",
  "issues": [
    {
      "type": "tension_flat/no_payoff/pacing_mismatch/filler_content/weak_hook",
      "severity": "red/yellow/green",
      "description": "问题描述",
      "location": "问题出现在哪个段落范围",
      "suggestion": "修改建议"
    }
  ],
  "hookStrength": 7,
  "fillerPercentage": 10
}
\`\`\`

评分标准（1-10）：
- 9-10：节奏完美，张弛有度，钩子强力
- 7-8：节奏良好，有1-2个小问题
- 5-6：节奏有问题，如太平淡或太密集
- 3-4：节奏严重失衡
- 1-2：大量水文或钩子无力

hookStrength：章末钩子强度（1-10）
fillerPercentage：水文占比（0-100%）

注意：所有文字内容必须使用中文。`,
    },
  ];
}
