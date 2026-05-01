import { Message } from "@/lib/ai/types";

export function buildConsistencyAuditPrompt(context: {
  chapterContent: string;
  chapterGoal: string;
  activeCharacters: any[];
  activeForeshadows: any[];
  worldRules: any[];
  recentChapters: any[];
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个严格的小说一致性审查员。你专门检查章节内容是否与已建立的设定、人物、伏笔和世界观保持一致。

你只关注一致性，不评价文笔或节奏。

检查维度：
1. 角色行为一致性：角色是否做了违背其性格/底线/目标的事
2. 设定一致性：是否违反世界观规则或已建立的设定
3. 伏笔状态：引用的伏笔是否状态正确
4. 时间线连续性：事件顺序是否合理
5. 信息边界：角色是否知道了不该知道的信息

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请检查以下章节的一致性：

【章节正文】
${context.chapterContent}

【章节目标】
${context.chapterGoal}

【角色设定】
${context.activeCharacters.map((c) => `- ${c.name}（${c.roleType}）：欲望=${c.desire}，恐惧=${c.fear}，秘密=${c.secret}，底线=${c.moralBoundary}，语言习惯=${c.speechPattern}，当前目标=${c.currentGoal}`).join("\n")}

【活跃伏笔】
${context.activeForeshadows.map((f) => `- ID:${f.id} 线索：${f.clueText}，状态：${f.status}，真实含义：${f.trueMeaning}`).join("\n")}

【世界观规则】
${context.worldRules.map((r) => `- ${r.category}：${r.content}`).join("\n")}

【前文摘要】
${context.recentChapters.map((ch) => `第${ch.chapterNumber}章：${ch.summary}`).join("\n")}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "consistencyScore": 8,
  "issues": [
    {
      "type": "character_behavior/setting_conflict/foreshadow_error/timeline_gap/info_boundary",
      "severity": "red/yellow/green",
      "description": "问题描述",
      "location": "问题出现在哪个场景或段落",
      "suggestion": "修改建议"
    }
  ]
}
\`\`\`

评分标准（1-10）：
- 9-10：完全一致，无任何问题
- 7-8：有1-2个轻微问题
- 5-6：有明显一致性问题
- 3-4：有严重一致性问题
- 1-2：多处严重矛盾

注意：所有文字内容必须使用中文。`,
    },
  ];
}
