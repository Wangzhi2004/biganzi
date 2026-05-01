import { Message } from "@/lib/ai/types";

export function buildCharacterGeneratePrompt(context: {
  bookDna: any;
  roleType: string;
  name?: string;
}): Message[] {
  const nameSection = context.name
    ? `角色姓名已确定为：${context.name}`
    : "请为角色起一个符合世界观和类型的名字";

  return [
    {
      role: "system",
      content: `你是一个资深小说人物设计师。你根据作品DNA和角色类型，生成一个完整、立体、有深度的角色设定。你必须确保角色与作品的核心主题、世界观和已有的主要角色形成良好的化学反应。

你的角色设计必须：
1. 有明确的欲望、恐惧、创伤和秘密
2. 有独特的语言习惯和行为模式
3. 有与主角的潜在冲突或合作关系
4. 有在故事中成长或变化的空间
5. 有让读者记住的标志性特征

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请根据以下信息生成一个完整的角色设定：

【作品DNA】
类型：${context.bookDna.genre}
子类型：${context.bookDna.subGenre}
核心Hook：${context.bookDna.coreHook}
主角主题：${context.bookDna.protagonistTheme}
世界观关键词：${context.bookDna.worldKeywords}

【主角设定】
姓名：${context.bookDna.protagonist?.name}
角色类型：${context.bookDna.protagonist?.roleType}
欲望：${context.bookDna.protagonist?.desire}
恐惧：${context.bookDna.protagonist?.fear}

【目标角色类型】${context.roleType}

${nameSection}

角色类型说明：
- mentor：导师型角色，引导主角成长
- rival：竞争者，与主角形成良性或恶性竞争
- love_interest：感情线对象
- sidekick：伙伴/跟班，提供辅助和情感支持
- antagonist：主要反派
- secondary_antagonist：次要反派
- ally：盟友，提供关键帮助
- trickster：搅局者，增加故事变数
- threshold_guardian：门槛守卫，阻碍主角前进
- herald：传令者，带来挑战或机遇
- shapeshifter：变形者，立场不固定

请严格按照以下JSON Schema输出角色设定：

\`\`\`json
{
  "name": "角色完整姓名",
  "aliases": ["别名、外号、代称"],
  "roleType": "${context.roleType}",
  "age": "年龄或年龄段",
  "gender": "性别",
  "appearance": {
    "height": "身高描述",
    "build": "体型描述",
    "hair": "发型发色",
    "eyes": "眼神/眼睛特征",
    "distinguishingFeature": "最显著的外貌特征",
    "clothingStyle": "穿衣风格",
    "overallImpression": "给人的整体印象"
  },
  "personality": {
    "coreTraits": ["3-5个核心性格特质"],
    "defenseMechanism": "心理防御机制",
    "stressReaction": "压力下的反应模式",
    "humorStyle": "幽默方式",
    "angerPattern": "愤怒时的表现",
    "trustLevel": "对人的默认信任度"
  },
  "backstory": "300字以内的完整前史",
  "desire": {
    "surface": "表面欲望",
    "deep": "深层欲望",
    "unconscious": "无意识欲望"
  },
  "fear": {
    "surface": "表面恐惧",
    "core": "核心恐惧"
  },
  "wound": {
    "event": "创伤事件",
    "impact": "对性格的影响"
  },
  "secret": {
    "content": "秘密内容",
    "knowingScope": "谁知道这个秘密",
    "exposureConsequence": "暴露后果"
  },
  "moralBoundary": "道德底线",
  "speechPattern": {
    "default": "日常说话方式",
    "emotional": "情绪激动时",
    "signaturePhrases": ["标志性口头禅"],
    "forbiddenExpressions": ["绝对不会说的话"]
  },
  "ability": {
    "coreCompetency": "核心能力",
    "weakness": "能力弱点",
    "uniqueSkill": "独特技能或优势"
  },
  "relationshipToProtagonist": {
    "initialRelation": "与主角的初始关系",
    "potentialDevelopment": "关系的潜在发展方向",
    "keyConflict": "与主角的核心矛盾点",
    "keyBond": "与主角的核心连接点"
  },
  "storyRole": {
    "function": "在故事中的叙事功能",
    "keyScenes": ["需要出现的关键场景类型"],
    "exitCondition": "角色退场的条件（如果适用）"
  },
  "arcSummary": "角色的成长/变化弧线概述"
}
\`\`\`

设计原则：
1. 角型必须与作品DNA中的主题和类型匹配
2. 角色的欲望和恐惧必须与主角形成对比或互补
3. 角色的秘密必须能在故事中产生戏剧性效果
4. 角色的语言习惯必须独特且容易区分
5. 角色必须有清晰的故事功能和退出条件

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildCharacterDriftCheckPrompt(context: {
  character: any;
  chapterContent: string;
  chapterNumber: number;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的人物一致性检测师。你检测小说章节中角色的行为是否与其人设保持一致。你必须从语言、行为、决策、情感反应等多个维度进行检测。

你的检测必须：
1. 逐项对比角色行为与人设
2. 区分严重偏离和轻微偏离
3. 给出具体的修改建议
4. 考虑角色成长的合理性

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请检测第${context.chapterNumber}章中角色行为是否与人设一致：

【角色设定】
姓名：${context.character.name}
角色类型：${context.character.roleType}
欲望：${context.character.desire}
恐惧：${context.character.fear}
创伤：${context.character.wound}
秘密：${context.character.secret}
道德底线：${context.character.moralBoundary}
语言习惯：${context.character.speechPattern}
当前目标：${context.character.currentGoal}
当前状态：${context.character.currentStatus}

【章节正文】
${context.chapterContent}

请严格按照以下JSON Schema输出检测结果：

\`\`\`json
{
  "hasDrift": false,
  "driftPoints": [
    {
      "field": "偏离的字段，如：speechPattern/desire/fear/moralBoundary/personality/ability/decision",
      "expected": "根据人设的预期表现",
      "actual": "实际文本中的表现",
      "severity": "red/yellow/green",
      "suggestion": "修改建议"
    }
  ],
  "consistencyScore": 0,
  "positiveGrowth": [
    "角色的合理成长或变化点（如果有）"
  ],
  "overallAssessment": "整体一致性评估"
}
\`\`\`

检测维度说明：
1. 语言一致性（speechPattern）：对白是否符合角色的语言习惯
2. 行为一致性（personality）：行为是否符合角色的性格特质
3. 决策一致性（desire/fear）：决策是否符合角色的欲望和恐惧
4. 道德一致性（moralBoundary）：行为是否突破了角色的道德底线
5. 能力一致性（ability）：角色的表现是否超出其能力范围
6. 情感一致性：情感反应是否符合角色的创伤和性格

严重程度说明：
- red：严重偏离，必须修改，会导致读者出戏
- yellow：中等偏离，建议修改，可能影响角色可信度
- green：轻微偏离，可以接受，可能是合理的角色成长

consistencyScore：0-100，100表示完全一致，0表示严重偏离

注意：
- 如果偏离是合理的角色成长，应归入positiveGrowth而非driftPoints
- 考虑角色在特定情境下的合理反应
- 所有文字内容必须使用中文`,
    },
  ];
}
