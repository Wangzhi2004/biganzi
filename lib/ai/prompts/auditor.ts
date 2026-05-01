import { Message } from "@/lib/ai/types";

export function buildAuditPrompt(context: {
  chapterContent: string;
  chapterGoal: string;
  bookDna: any;
  activeCharacters: any[];
  activeForeshadows: any[];
  worldRules: any[];
  styleFingerprint: any;
  recentChapters: any[];
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个严格的小说审稿编辑。你从多个维度检查章节质量，包括设定一致性、人物一致性、时间线一致性、伏笔状态、主线推进、冲突强度、爽点密度、节奏风险、重复桥段、风格偏移、水文风险和章末钩子。

你的审稿必须：
1. 严格按照评分公式计算各维度分数
2. 客观指出所有问题，不论大小
3. 给出具体的修改建议
4. 综合判断章节是否可以发布

评分公式：qualityScore = 0.15*mainPlot + 0.15*characterChange + 0.12*conflict + 0.12*hook + 0.10*styleConsistency + 0.10*settingConsistency + 0.08*infoIncrement + 0.08*emotionTension + 0.05*freshness + 0.05*readability

每个维度分数范围为0-100。

判定标准：
- green（可发布）：qualityScore >= 75 且无红色风险
- yellow（建议修改）：qualityScore >= 60 或有黄色风险
- red（必须重写）：qualityScore < 60 或有红色风险

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请对以下章节进行严格审稿：

【章节正文】
${context.chapterContent}

【章节目标】
${context.chapterGoal}

【作品DNA】
类型：${context.bookDna.genre}
核心Hook：${context.bookDna.coreHook}
主角：${context.bookDna.protagonist?.name}（${context.bookDna.protagonist?.roleType}）
主角主题：${context.bookDna.protagonistTheme}
禁忌规则：${JSON.stringify(context.bookDna.forbiddenRules)}
爽感机制：${context.bookDna.pleasureMechanism}

【活跃角色设定】
${context.activeCharacters.map((c) => `
- ${c.name}（${c.roleType}）
  欲望：${c.desire}
  恐惧：${c.fear}
  创伤：${c.wound}
  秘密：${c.secret}
  语言习惯：${c.speechPattern}
  当前目标：${c.currentGoal}
  当前状态：${c.currentStatus}
`).join("\n")}

【活跃伏笔】
${context.activeForeshadows.map((f) => `- 线索：${f.clueText}，状态：${f.status}，热度：${f.heatScore}，紧迫度：${f.urgencyScore}`).join("\n")}

【世界观规则】
${context.worldRules.map((r) => `- ${r.category}：${r.content}`).join("\n")}

【风格指纹】
叙述视角：${context.styleFingerprint.narrativePOV}
叙述距离：${context.styleFingerprint.narrativeDistance}
平均句长：${context.styleFingerprint.avgSentenceLength}字
对白比例：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%
心理描写比例：${(context.styleFingerprint.psychologicalRatio * 100).toFixed(0)}%
动作描写比例：${(context.styleFingerprint.actionRatio * 100).toFixed(0)}%
环境描写比例：${(context.styleFingerprint.environmentRatio * 100).toFixed(0)}%
信息密度：${context.styleFingerprint.infoDensity}
情绪外露程度：${context.styleFingerprint.emotionExposure}
幽默程度：${context.styleFingerprint.humorLevel}
修辞偏好：${JSON.stringify(context.styleFingerprint.rhetoricSystem)}
常用词：${JSON.stringify(context.styleFingerprint.commonWords)}
禁用词：${JSON.stringify(context.styleFingerprint.bannedWords)}

【前文参考】
${context.recentChapters.map((ch) => `第${ch.chapterNumber}章「${ch.title}」- 功能：${ch.chapterFunction}，摘要：${ch.summary}`).join("\n")}

请严格按照以下JSON Schema输出审稿报告：

\`\`\`json
{
  "overallStatus": "green/yellow/red",
  "qualityScore": 0,
  "mainPlotScore": 0,
  "characterChangeScore": 0,
  "conflictScore": 0,
  "hookScore": 0,
  "styleConsistencyScore": 0,
  "settingConsistencyScore": 0,
  "infoIncrementScore": 0,
  "emotionTensionScore": 0,
  "freshnessScore": 0,
  "readabilityScore": 0,
  "risks": [
    {
      "level": "red/yellow/green",
      "category": "风险类别",
      "description": "风险描述",
      "suggestion": "修改建议"
    }
  ],
  "rewriteActions": [
    {
      "action": "修改动作",
      "target": "修改目标",
      "reason": "修改原因",
      "priority": 1
    }
  ],
  "conflictPoints": [
    {
      "location": "问题段落的开头几个字",
      "conflictType": "设定冲突/人物矛盾/时间线问题/伏笔冲突",
      "description": "与前文哪里冲突",
      "relatedChapter": "冲突涉及的前文章节号"
    }
  ],
  "enhancementSuggestions": [
    {
      "location": "可增强段落的开头几个字",
      "type": "可增强类型：画面感/情感张力/冲突/对白/节奏",
      "suggestion": "具体增强建议",
      "expectedImpact": "预期效果"
    }
  ]
}
\`\`\`

审稿维度说明：
1. 主线推进（mainPlotScore）：本章是否有效推进了核心剧情线
2. 人物变化（characterChangeScore）：角色是否发生了有意义的变化或成长
3. 冲突强度（conflictScore）：冲突是否有张力、有层次、有升级
4. 章末钩子（hookScore）：结尾是否能有效吸引读者追读
5. 风格一致性（styleConsistencyScore）：是否符合风格指纹的要求
6. 设定一致性（settingConsistencyScore）：是否违反世界观规则或已建立的设定
7. 信息增量（infoIncrementScore）：是否提供了有意义的新信息
8. 情感张力（emotionTensionScore）：情感描写是否有感染力
9. 新鲜度（freshnessScore）：是否有新意，避免重复老套
10. 可读性（readabilityScore）：文本是否流畅易读

风险等级说明：
- red：严重问题，必须修改才能发布
- yellow：中等问题，建议修改
- green：轻微问题或建议优化

rewriteActions按priority从高到低排列（1为最高优先级）。

注意：所有文字内容必须使用中文。`,
    },
  ];
}
