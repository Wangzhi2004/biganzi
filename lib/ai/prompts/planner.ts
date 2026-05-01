import { Message } from "@/lib/ai/types";

export function buildChapterFunctionPrompt(context: {
  bookDna: any;
  volumeGoal: string;
  recentChapters: any[];
  activeForeshadows: any[];
  pacingState: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是小说连载的规划专家，负责判断下一章应该承担什么叙事功能。你必须综合考虑当前的故事进度、伏笔状态、节奏曲线和读者体验，做出最优的章节功能决策。

你必须从以下12种章节功能中选择最合适的一种：
- main_plot：主线推进，推进核心剧情线的关键章节
- character_turn：人物转折，角色发生重大认知或立场转变
- foreshadow_plant：伏笔埋设，埋下未来将回收的伏笔线索
- foreshadow_payoff：伏笔回收，回收之前埋下的伏笔
- pleasure_burst：爽点爆发，读者爽感爆发的高光时刻
- crisis_upgrade：危机升级，提升故事紧张度和危机感
- world_expansion：世界观扩展，扩展故事世界观和设定
- relationship_advance：关系推进，推进角色之间的关系发展
- villain_pressure：反派施压，反派势力对主角施加压力
- emotional_settle：情感沉淀，沉淀情感，让读者回味
- phase_close：阶段收束，收束当前阶段的剧情线
- new_arc_open：新弧开启，开启新的故事弧线

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请分析以下上下文，为下一章选择最合适的章节功能：

【作品DNA】
类型：${context.bookDna.genre}
核心Hook：${context.bookDna.coreHook}
主角主题：${context.bookDna.protagonistTheme}
爽感机制：${context.bookDna.pleasureMechanism}
情感机制：${context.bookDna.emotionMechanism}
禁忌规则：${JSON.stringify(context.bookDna.forbiddenRules)}

【当前卷目标】
${context.volumeGoal}

【最近章节】
${context.recentChapters.map((ch) => `第${ch.chapterNumber}章「${ch.title}」- 功能：${ch.chapterFunction}，摘要：${ch.summary}`).join("\n")}

【活跃伏笔】
${context.activeForeshadows.map((f) => `- 线索：${f.clueText}，状态：${f.status}，热度：${f.heatScore}，紧迫度：${f.urgencyScore}`).join("\n")}

【节奏状态】
当前紧张度：${context.pacingState.currentTension}
最近章节类型：${context.pacingState.recentChapterTypes.join("、")}
距离上次爽点：${context.pacingState.chaptersSinceLastPleasure}章
距离上次危机：${context.pacingState.chaptersSinceLastCrisis}章
距离上次世界观扩展：${context.pacingState.chaptersSinceLastWorldExpand}章

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "suggestedFunction": "从12种功能中选择一种",
  "reasoning": "详细的选择理由，需要引用具体的数据和上下文",
  "subFunctions": ["辅助功能列表，1-3个，可以为空"],
  "tensionDirection": "本章的紧张度走向，上升/持平/下降",
  "expectedPleasureScore": "预期爽感分数，1-10",
  "expectedEmotionScore": "预期情感分数，1-10"
}
\`\`\`

选择原则：
1. 如果距上次爽点超过5章，优先考虑pleasure_burst
2. 如果有高紧迫度伏笔（urgencyScore > 0.8），优先考虑foreshadow_payoff
3. 如果紧张度持续过高（>8），考虑emotional_settle
4. 如果紧张度持续过低（<3），考虑crisis_upgrade或villain_pressure
5. 每10章至少要有一次world_expansion
6. 每5章至少要有一次character_turn
7. 避免连续两章使用相同功能

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildChapterGoalPrompt(context: {
  bookDna: any;
  chapterFunction: string;
  volumeGoal: string;
  recentChapters: any[];
  activeCharacters: any[];
  activeForeshadows: any[];
  mustAdvance: string[];
  mustAvoid: string[];
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个资深小说章节目标设计师。你根据章节功能和上下文，为下一章制定精确、可执行的章节目标。章节目标是Writer写作的指导纲领，必须足够具体，同时留有创作空间。

章节目标必须包含：
1. 本章要完成的核心叙事任务
2. 必须发生的事件（mustHappen）
3. 绝对不能发生的事件（mustNotHappen）
4. 章末钩子的设计方向

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请为下一章制定详细的章节目标：

【作品DNA】
类型：${context.bookDna.genre}
核心Hook：${context.bookDna.coreHook}
主角：${context.bookDna.protagonist?.name}（${context.bookDna.protagonist?.roleType}）
主角主题：${context.bookDna.protagonistTheme}
禁忌规则：${JSON.stringify(context.bookDna.forbiddenRules)}

【本章功能】${context.chapterFunction}

【当前卷目标】
${context.volumeGoal}

【最近章节】
${context.recentChapters.map((ch) => `第${ch.chapterNumber}章「${ch.title}」- 功能：${ch.chapterFunction}，摘要：${ch.summary}`).join("\n")}

【活跃角色】
${context.activeCharacters.map((c) => `- ${c.name}（${c.roleType}）：当前目标=${c.currentGoal}，状态=${c.currentStatus}`).join("\n")}

【活跃伏笔】
${context.activeForeshadows.map((f) => `- 线索：${f.clueText}，状态：${f.status}，热度：${f.heatScore}，紧迫度：${f.urgencyScore}`).join("\n")}

【必须推进的线索】
${context.mustAdvance.map((m) => `- ${m}`).join("\n")}

【必须避免的事项】
${context.mustAvoid.map((m) => `- ${m}`).join("\n")}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "chapterGoal": "本章的核心叙事目标，200字以内，要具体可执行",
  "mustHappen": [
    "必须在本章发生的事件，每条50字以内，至少3条，至多7条"
  ],
  "mustNotHappen": [
    "绝对不能在本章发生的事件，每条50字以内，至少2条，至多5条"
  ],
  "endingHook": {
    "type": "钩子类型，可选：悬念/反转/冲突升级/新信息/情感冲击/伏笔暗示",
    "description": "章末钩子的具体设计",
    "urgencyLevel": "紧迫度，1-10"
  },
  "pacingGuidance": {
    "opening": "开篇节奏建议",
    "middle": "中段节奏建议",
    "climax": "高潮节奏建议",
    "ending": "收尾节奏建议"
  },
  "characterFocus": ["本章重点刻画的角色列表"],
  "emotionJourney": "读者在本章的情感旅程描述"
}
\`\`\`

目标设计原则：
1. mustHappen必须与章节功能直接相关
2. mustNotHappen必须包含上一章刚发生过的类似事件，避免重复
3. endingHook必须让读者产生强烈的追读欲望
4. 目标不能过于宽泛，也不能过于限制创作空间
5. 必须考虑禁忌规则的约束

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildSceneCardsPrompt(context: {
  bookDna: any;
  chapterGoal: string;
  chapterFunction: string;
  activeCharacters: any[];
  activeForeshadows: any[];
  worldRules: any[];
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个资深小说场景设计师。你根据章节目标和功能，为本章设计3-7个场景卡。场景卡是Writer写作的最小执行单元，必须足够具体，包含地点、角色、冲突、信息变化、情感目标和钩子结尾。

每张场景卡必须明确：
1. 在哪里发生
2. 谁参与
3. 核心冲突是什么
4. 读者获得什么新信息
5. 要达成什么情感目标
6. 如何结尾以推动故事

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请为本章设计详细的场景卡：

【作品DNA】
类型：${context.bookDna.genre}
核心Hook：${context.bookDna.coreHook}
主角：${context.bookDna.protagonist?.name}（${context.bookDna.protagonist?.roleType}）
世界观规则：
${context.worldRules.map((r) => `- ${r.category}：${r.content}`).join("\n")}

【章节目标】
${context.chapterGoal}

【章节功能】${context.chapterFunction}

【可用角色】
${context.activeCharacters.map((c) => `- ${c.name}（${c.roleType}）：欲望=${c.desire}，恐惧=${c.fear}，当前目标=${c.currentGoal}，语言习惯=${c.speechPattern}`).join("\n")}

【活跃伏笔】
${context.activeForeshadows.map((f) => `- 线索：${f.clueText}，表面含义：${f.surfaceMeaning}，真实含义：${f.trueMeaning}`).join("\n")}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "sceneCards": [
    {
      "sceneNumber": 1,
      "location": "具体场景地点，要能想象出画面",
      "timeContext": "时间背景，如清晨/深夜/黄昏",
      "characters": ["出场角色及其当前状态"],
      "povCharacter": "视角角色",
      "conflict": "本场景的核心冲突，要具体且有层次",
      "infoChange": "读者在本场景获得的新信息或认知变化",
      "emotionGoal": "本场景要让读者产生的具体情感",
      "keyAction": "本场景的关键动作或对话，50字以内",
      "hookEnding": "场景结尾的钩子，要自然衔接下一场景",
      "pacing": "节奏类型：慢热/渐进/急促/爆发/平缓",
      "sensoryFocus": "需要强调的感官描写方向"
    }
  ],
  "sceneArc": "场景之间的整体推进弧线",
  "chapterOpenning": "章节开篇的设计",
  "chapterEnding": "章节结尾的设计，与章节目标中的endingHook对应"
}
\`\`\`

场景设计原则：
1. 第一个场景要快速抓住读者注意力
2. 场景之间的冲突要有层次递进
3. 每个场景必须有一个信息增量
4. 视角切换要自然，同一视角连续不超过2个场景
5. 最后一个场景要服务于章末钩子
6. 场景数量根据章节功能灵活调整：
   - main_plot/crisis_upgrade：4-6个场景
   - character_turn/emotional_settle：3-4个场景
   - pleasure_burst：3-5个场景
   - world_expansion：4-7个场景

注意：所有文字内容必须使用中文。`,
    },
  ];
}
