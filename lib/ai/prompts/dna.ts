import { Message } from "@/lib/ai/types";

export function buildDNAPrompt(input: {
  genre: string;
  idea: string;
  targetWords: number;
  targetReader: string;
  style: string;
  sampleChapter?: string;
}): Message[] {
  const sampleSection = input.sampleChapter
    ? `\n\n以下是用户提供的样章，供你参考其风格和调性：\n\n${input.sampleChapter}`
    : "";

  return [
    {
      role: "system",
      content: `你是一个资深小说策划编辑，擅长为长篇连载小说设计完整的作品DNA。你的任务是根据用户提供的创意种子，生成一份全面、精细、可执行的作品DNA文档。你必须深入思考每个字段的含义，确保各字段之间逻辑自洽，形成一个有机的整体。所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请根据以下创意种子，生成一份完整的作品DNA：

【类型】${input.genre}
【创意核心】${input.idea}
【目标字数】${input.targetWords}字
【目标读者】${input.targetReader}
【风格方向】${input.style}
${sampleSection}

请严格按照以下JSON Schema输出，所有字段都必须填写，不可省略：

\`\`\`json
{
  "genre": "主类型",
  "subGenre": "子类型，如都市异能、仙侠修真、悬疑推理等",
  "targetPlatform": "建议连载平台",
  "targetWords": ${input.targetWords},
  "updateRhythm": "建议更新节奏，如日更2000字、隔日更3000字等",
  "coreHook": "一句话核心卖点，必须让读者产生追读欲望",
  "protagonistTheme": "主角的内在主题，如从怯懦到勇敢、从孤独到连接等",
  "finalEmotion": "读者读完全书后最强烈的情绪感受",
  "mainlineQuestion": "贯穿全书的核心悬念/问题",
  "worldKeywords": "世界观关键词列表，用逗号分隔",
  "pleasureMechanism": "爽感机制：本书让读者爽的核心方式",
  "emotionMechanism": "情感机制：本书打动读者的核心方式",
  "forbiddenRules": ["绝对不能犯的禁忌规则，至少5条"],
  "styleDirection": "文风方向的详细描述",
  "targetReaderProfile": "目标读者画像的详细描述",
  "readerPromises": ["对读者的核心承诺，至少3条"],
  "protagonist": {
    "name": "主角姓名",
    "aliases": ["别名、外号等"],
    "roleType": "角色类型，如逆袭型、成长型、扮猪吃虎型等",
    "desire": "表面欲望",
    "fear": "核心恐惧",
    "wound": "心理创伤",
    "secret": "隐藏的秘密",
    "moralBoundary": "道德底线",
    "speechPattern": "语言习惯的详细描述",
    "currentGoal": "开局时的近期目标",
    "powerLevel": "初始实力定位"
  },
  "worldRules": [
    {
      "category": "规则类别，如力量体系、社会结构、经济系统等",
      "content": "该类别的详细规则描述"
    }
  ],
  "volumeOutline": {
    "title": "第一卷标题",
    "summary": "第一卷整体概述，100-200字",
    "goal": "第一卷要完成的叙事目标"
  },
  "chapterPlan": [
    {
      "chapterNumber": 1,
      "title": "章节标题",
      "chapterFunction": "章节功能，可选：main_plot/character_turn/foreshadow_plant/foreshadow_payoff/pleasure_burst/crisis_upgrade/world_expansion/relationship_advance/villain_pressure/emotional_settle/phase_close/new_arc_open",
      "briefGoal": "本章简要目标"
    }
  ]
}
\`\`\`

chapterPlan必须包含30个章节的规划。每个章节都要有明确的功能定位和目标。确保节奏合理：前3章快速建立冲突和吸引力，每3-5章有一个小高潮，每10章有一个大高潮。

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildProtagonistPrompt(dna: any): Message[] {
  return [
    {
      role: "system",
      content: `你是一个资深小说人物设计师。你根据作品DNA中的主角框架，生成一份极其详细、立体、可执行的主角设定。你必须确保主角的人设与作品的核心主题、类型和爽感机制深度绑定。所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `以下是作品DNA的核心信息：

类型：${dna.genre}
子类型：${dna.subGenre}
核心Hook：${dna.coreHook}
主角主题：${dna.protagonistTheme}
爽感机制：${dna.pleasureMechanism}
情感机制：${dna.emotionMechanism}
主角框架：
- 姓名：${dna.protagonist?.name}
- 角色类型：${dna.protagonist?.roleType}
- 表面欲望：${dna.protagonist?.desire}
- 核心恐惧：${dna.protagonist?.fear}
- 心理创伤：${dna.protagonist?.wound}
- 隐藏秘密：${dna.protagonist?.secret}

请生成详细的主角设定，严格按照以下JSON Schema输出：

\`\`\`json
{
  "name": "完整姓名及含义解读",
  "aliases": ["所有别名、外号、代称及其来源"],
  "roleType": "角色原型的详细分析",
  "appearance": "外貌特征的详细描写，包含标志性特征",
  "personality": {
    "coreTraits": ["3-5个核心性格特质，附带具体表现"],
    "defenseMechanism": "心理防御机制",
    "stressReaction": "面对压力时的行为模式",
    "humorStyle": "幽默方式（如果有的话）",
    "angerPattern": "愤怒时的表现",
    "loveStyle": "对待感情的方式"
  },
  "backstory": "500字以内的完整前史，包含关键转折事件",
  "desire": {
    "surface": "表面欲望的详细描述",
    "deep": "深层欲望",
    "unconscious": "无意识欲望（连主角自己都不清楚的）"
  },
  "fear": {
    "surface": "表面恐惧",
    "core": "核心恐惧",
    "shadow": "影子恐惧（最不愿面对的真相）"
  },
  "wound": {
    "event": "创伤事件",
    "impact": "对性格和行为的影响",
    "healing": "治愈的可能性和路径"
  },
  "secret": {
    "content": "秘密内容",
    "knowingScope": "谁知道这个秘密",
    "exposureConsequence": "秘密暴露的后果",
    "revealTimeline": "建议揭露的时间线"
  },
  "moralBoundary": "道德底线的详细描述，包含底线被突破时的反应",
  "speechPattern": {
    "default": "日常说话方式",
    "emotional": "情绪激动时的说话方式",
    "combat": "战斗时的说话方式",
    "intimate": "亲密时的说话方式",
    "signaturePhrases": ["标志性口头禅"],
    "forbiddenExpressions": ["绝对不会说的话"]
  },
  "ability": {
    "initialPower": "初始能力的详细描述",
    "growthPath": "能力成长路径",
    "hiddenPotential": "隐藏潜力",
    "weakness": "能力弱点",
    "powerCeiling": "能力上限"
  },
  "relationships": {
    "defaultAttitude": "对陌生人的默认态度",
    "trustBuilding": "建立信任的方式",
    "betrayalReaction": "被背叛时的反应",
    "keyRelationships": ["需要在故事中建立的关键关系及类型"]
  },
  "currentGoal": {
    "immediate": "开局立即目标",
    "shortTerm": "短期目标（1-3卷）",
    "longTerm": "长期目标（贯穿全书）"
  },
  "arcSummary": "主角成长弧线的完整概述，从开局到结局",
  "keyTurningPoints": ["至少5个关键转折点及其触发条件"]
}
\`\`\`

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildWorldRulesPrompt(dna: any): Message[] {
  return [
    {
      role: "system",
      content: `你是一个资深小说世界观架构师。你根据作品DNA中的世界观框架，生成一套完整、自洽、细节丰富的世界规则体系。你的规则必须服务于故事的冲突和爽感，而非为了复杂而复杂。所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `以下是作品DNA的核心信息：

类型：${dna.genre}
子类型：${dna.subGenre}
核心Hook：${dna.coreHook}
世界观关键词：${dna.worldKeywords}
爽感机制：${dna.pleasureMechanism}
现有世界观框架：
${JSON.stringify(dna.worldRules, null, 2)}

请生成详细的世界规则体系，严格按照以下JSON Schema输出：

\`\`\`json
{
  "worldRules": [
    {
      "category": "力量体系",
      "content": "详细的力量体系规则，包含等级划分、升级条件、战斗机制",
      "conflictPotential": "该规则能产生的核心冲突",
      "pleasurePoint": "该规则能产生的爽点"
    },
    {
      "category": "社会结构",
      "content": "详细的社会结构规则，包含阶层划分、权力体系、社会矛盾",
      "conflictPotential": "该规则能产生的核心冲突",
      "pleasurePoint": "该规则能产生的爽点"
    },
    {
      "category": "经济系统",
      "content": "详细的经济系统规则，包含货币、资源、交易机制",
      "conflictPotential": "该规则能产生的核心冲突",
      "pleasurePoint": "该规则能产生的爽点"
    },
    {
      "category": "地理环境",
      "content": "详细的地理环境描述，包含关键地点、区域划分、环境特征",
      "conflictPotential": "该规则能产生的核心冲突",
      "pleasurePoint": "该规则能产生的爽点"
    },
    {
      "category": "历史背景",
      "content": "详细的历史背景，包含关键历史事件、历史遗留问题、历史秘密",
      "conflictPotential": "该规则能产生的核心冲突",
      "pleasurePoint": "该规则能产生的爽点"
    },
    {
      "category": "特殊规则",
      "content": "该世界观独有的特殊规则，如诅咒系统、契约系统、异能系统等",
      "conflictPotential": "该规则能产生的核心冲突",
      "pleasurePoint": "该规则能产生的爽点"
    }
  ],
  "locations": [
    {
      "name": "地点名称",
      "description": "地点描述",
      "significance": "在故事中的重要性",
      "associatedCharacters": ["关联角色"]
    }
  ],
  "factions": [
    {
      "name": "势力名称",
      "description": "势力描述",
      "goal": "势力目标",
      "leader": "领导者",
      "strength": "势力实力",
      "relationshipToProtagonist": "与主角的关系"
    }
  ],
  "timeline": [
    {
      "era": "时代/阶段",
      "event": "关键事件",
      "impact": "对当前故事的影响"
    }
  ],
  "forbiddenWorldbuilding": ["世界观构建中绝对不能违反的规则"]
}
\`\`\`

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildVolumeOutlinePrompt(
  dna: any,
  volumeNumber: number
): Message[] {
  return [
    {
      role: "system",
      content: `你是一个资深小说连载规划师。你根据作品DNA和卷号，为特定卷生成详细的卷纲。你必须确保本卷的目标与全书整体规划一致，同时在本卷内形成完整的故事弧。所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `以下是作品DNA的核心信息：

类型：${dna.genre}
核心Hook：${dna.coreHook}
主角主题：${dna.protagonistTheme}
主线问题：${dna.mainlineQuestion}
爽感机制：${dna.pleasureMechanism}
主角：${dna.protagonist?.name}（${dna.protagonist?.roleType}）

当前需要规划的是第${volumeNumber}卷。

${volumeNumber > 1 ? `前几卷的概述：\n${JSON.stringify(dna.volumeOutline, null, 2)}` : "这是全书第一卷。"}

请为第${volumeNumber}卷生成详细的卷纲，严格按照以下JSON Schema输出：

\`\`\`json
{
  "volumeNumber": ${volumeNumber},
  "title": "本卷标题，要有吸引力",
  "theme": "本卷的内在主题",
  "summary": "本卷整体概述，200-300字",
  "goal": "本卷要完成的核心叙事目标",
  "conflictSetup": "本卷核心冲突的设置",
  "conflictEscalation": "冲突升级的过程",
  "climax": "本卷高潮的描述",
  "resolution": "本卷的收束方式",
  "hookToNext": "勾连下一卷的钩子",
  "characterArcs": [
    {
      "characterName": "角色名",
      "startState": "本卷开始时的状态",
      "endState": "本卷结束时的状态",
      "keyMoment": "该角色在本卷的关键时刻"
    }
  ],
  "foreshadowPlan": [
    {
      "chapterRange": "埋设章节范围",
      "clueText": "伏笔内容",
      "surfaceMeaning": "表面含义",
      "trueMeaning": "真实含义",
      "payoffVolume": "预计回收的卷号"
    }
  ],
  "pleasurePoints": [
    {
      "chapterRange": "爽点章节范围",
      "type": "爽点类型，如打脸/逆袭/揭秘/升级等",
      "description": "爽点描述"
    }
  ],
  "emotionalBeats": [
    {
      "chapterRange": "情感章节范围",
      "emotion": "目标情感",
      "trigger": "触发情感的事件"
    }
  ],
  "pacingPlan": "本卷的节奏规划，包含张弛安排",
  "chapterCount": 30,
  "chaptersPerArc": "每个小弧线的章节数"
}
\`\`\`

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildChapterPlanPrompt(
  dna: any,
  volumeOutline: any,
  count: number
): Message[] {
  return [
    {
      role: "system",
      content: `你是一个资深小说章节规划师。你根据作品DNA和卷纲，为指定数量的章节生成详细的章节计划。你必须确保每一章都有明确的功能定位，章节之间形成合理的节奏曲线。所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `以下是作品DNA的核心信息：

类型：${dna.genre}
核心Hook：${dna.coreHook}
主角：${dna.protagonist?.name}（${dna.protagonist?.roleType}）
爽感机制：${dna.pleasureMechanism}

当前卷纲：
${JSON.stringify(volumeOutline, null, 2)}

请为接下来的${count}章生成详细的章节计划，严格按照以下JSON Schema输出：

\`\`\`json
{
  "chapterPlans": [
    {
      "chapterNumber": 1,
      "title": "章节标题，要吸引人",
      "chapterFunction": "章节功能，从以下选项中选择：main_plot/character_turn/foreshadow_plant/foreshadow_payoff/pleasure_burst/crisis_upgrade/world_expansion/relationship_advance/villain_pressure/emotional_settle/phase_close/new_arc_open",
      "briefGoal": "本章要完成的核心目标",
      "keyEvents": ["本章的关键事件列表"],
      "emotionalBeat": "本章的情感节拍",
      "conflictLevel": "冲突强度，1-10分",
      "hookEnding": "章末钩子的设计",
      "connectsToNext": "如何衔接下一章",
      "pleasureOrPain": "本章给读者的主要感受是爽还是虐",
      "activeCharacters": ["出场角色列表"]
    }
  ],
  "pacingCurve": "对这${count}章整体节奏曲线的描述",
  "tensionProgression": "紧张度的整体走向"
}
\`\`\`

章节规划的节奏要求：
1. 前3章快速建立冲突和吸引力
2. 每3-5章安排一个小高潮
3. 每10章安排一个大高潮
4. 高潮后必须有情感沉淀章节
5. 伏笔埋设和回收要均匀分布
6. 反派施压和危机升级要持续存在
7. 章末钩子必须让读者想看下一章

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildSceneCardsPrompt(
  dna: any,
  chapterPlan: any,
  chapterNumber: number
): Message[] {
  return [
    {
      role: "system",
      content: `你是一个资深小说场景设计师。你根据作品DNA和章节计划，为指定章节生成详细的场景卡。场景卡是写作的最小执行单元，必须足够具体，让作家可以直接按照场景卡写出内容。所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `以下是作品DNA的核心信息：

类型：${dna.genre}
核心Hook：${dna.coreHook}
主角：${dna.protagonist?.name}（${dna.protagonist?.roleType}）
语言习惯：${dna.protagonist?.speechPattern}
世界观规则：${JSON.stringify(dna.worldRules, null, 2)}

当前章节计划（第${chapterNumber}章）：
${JSON.stringify(chapterPlan, null, 2)}

请为第${chapterNumber}章生成详细的场景卡，严格按照以下JSON Schema输出：

\`\`\`json
{
  "chapterNumber": ${chapterNumber},
  "chapterTitle": "章节标题",
  "sceneCards": [
    {
      "sceneNumber": 1,
      "location": "场景地点，要具体到能想象出画面",
      "timeContext": "时间背景",
      "characters": ["出场角色列表，包含角色简要状态"],
      "povCharacter": "本场景的视角角色",
      "conflict": "本场景的核心冲突，要具体",
      "infoChange": "读者在本场景获得的新信息",
      "emotionGoal": "本场景要达成的情感目标",
      "keyAction": "本场景的关键动作/对话",
      "hookEnding": "场景结尾的钩子/悬念",
      "sensoryDetails": "需要强调的感官细节",
      "pacing": "节奏控制，如慢热/急促/平缓/爆发"
    }
  ],
  "overallArc": "场景之间的整体弧线",
  "chapterEnding": "章节结尾的设计"
}
\`\`\`

场景卡设计原则：
1. 每章3-7个场景，根据章节功能灵活调整
2. 场景之间要有明确的推进关系
3. 每个场景必须有一个信息增量
4. 冲突和情感要有层次递进
5. 最后一个场景要为章末钩子服务
6. 视角切换要自然，不要频繁切换

注意：所有文字内容必须使用中文。`,
    },
  ];
}
