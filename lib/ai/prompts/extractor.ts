import { Message } from "@/lib/ai/types";

export function buildExtractStatePrompt(context: {
  chapterContent: string;
  chapterNumber: number;
  activeCharacters: any[];
  activeForeshadows: any[];
  worldRules: any[];
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个精确的小说状态分析师。你从小说章节中抽取所有重要的状态变化，包括章节摘要、新增事实、人物状态变化、关系变化、世界观变化、伏笔变化和读者承诺变化。

你的抽取必须：
1. 不遗漏任何重要信息
2. 精确描述变化，不要模糊表述
3. 区分新增和已有信息
4. 识别潜在风险
5. 为下一章提供建议

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请对第${context.chapterNumber}章进行完整的状态抽取：

【章节正文】
${context.chapterContent}

【当前活跃角色】
${context.activeCharacters.map((c) => `
- ${c.name}（ID: ${c.id}，角色类型: ${c.roleType}）
  欲望：${c.desire}
  恐惧：${c.fear}
  创伤：${c.wound}
  秘密：${c.secret}
  当前目标：${c.currentGoal}
  当前位置：${c.currentLocation}
  当前状态：${c.currentStatus}
  实力等级：${c.powerLevel}
`).join("\n")}

【当前活跃伏笔】
${context.activeForeshadows.map((f) => `
- 伏笔ID: ${f.id}
  线索文本：${f.clueText}
  表面含义：${f.surfaceMeaning}
  真实含义：${f.trueMeaning}
  状态：${f.status}
  热度：${f.heatScore}
  紧迫度：${f.urgencyScore}
`).join("\n")}

【当前世界观规则】
${context.worldRules.map((r) => `- ${r.category}：${r.content}`).join("\n")}

请严格按照以下JSON Schema输出状态抽取结果：

\`\`\`json
{
  "chapterSummary": "本章的简洁摘要，100-200字",
  "newFacts": [
    "本章新增的重要事实，每条50字以内"
  ],
  "characterChanges": [
    {
      "characterId": "角色ID",
      "characterName": "角色姓名",
      "field": "变化的字段，如currentGoal/currentLocation/currentStatus/powerLevel/desire/fear/wound/secret",
      "oldValue": "旧值，如果是新增则为null",
      "newValue": "新值"
    }
  ],
  "relationshipChanges": [
    {
      "characterAId": "角色A的ID",
      "characterBId": "角色B的ID",
      "changeType": "变化类型：建立/深化/破裂/修复/转变",
      "description": "关系变化的详细描述"
    }
  ],
  "newWorldRules": [
    {
      "category": "规则类别",
      "content": "规则内容"
    }
  ],
  "newForeshadows": [
    {
      "clueText": "伏笔线索文本",
      "surfaceMeaning": "表面含义",
      "trueMeaning": "真实含义",
      "relatedCharacters": ["相关角色姓名列表"],
      "expectedPayoffStart": 0,
      "expectedPayoffEnd": 0
    }
  ],
  "paidOffForeshadows": [
    {
      "foreshadowId": "被回收的伏笔ID",
      "payoffType": "回收类型：完全回收/部分回收"
    }
  ],
  "newReaderPromises": [
    {
      "promiseText": "对读者的新承诺"
    }
  ],
  "resolvedReaderPromises": [
    {
      "promiseId": "已兑现的承诺ID",
      "resolutionType": "兑现类型：完全兑现/部分兑现"
    }
  ],
  "riskFlags": [
    {
      "type": "风险类型：设定冲突/人物行为不一致/时间线矛盾/伏笔遗忘/节奏问题",
      "description": "风险的详细描述",
      "severity": "严重程度：red/yellow/green"
    }
  ],
  "nextChapterSuggestion": {
    "suggestedFunction": "建议的下一章功能，从以下选项中选择：main_plot/character_turn/foreshadow_plant/foreshadow_payoff/pleasure_burst/crisis_upgrade/world_expansion/relationship_advance/villain_pressure/emotional_settle/phase_close/new_arc_open",
    "suggestedGoal": "建议的下一章目标",
    "tensionDirection": "紧张度走向：上升/持平/下降",
    "reasoning": "建议的理由"
  }
}
\`\`\`

抽取原则：
1. characterChanges只抽取实际发生变化的字段，不要列出未变化的字段
2. relationshipChanges要明确指出两个角色之间的关系变化
3. newForeshadows要识别文中隐含的伏笔，不仅是明确的线索
4. riskFlags要关注设定一致性、人物行为一致性和时间线逻辑
5. nextChapterSuggestion要基于当前章节的状态变化给出合理建议

注意：
- expectedPayoffStart和expectedPayoffEnd为章节号，表示预计在哪个章节范围回收
- relatedCharacters使用角色姓名列表
- 所有文字内容必须使用中文`,
    },
  ];
}
