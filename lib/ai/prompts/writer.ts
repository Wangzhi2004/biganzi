import { Message } from "@/lib/ai/types";

export function buildWriteChapterPrompt(context: {
  bookDna: any;
  chapterGoal: string;
  sceneCards: any[];
  activeCharacters: any[];
  styleFingerprint: any;
  recentChapters: any[];
  worldRules: any[];
}): Message[] {
  const styleRequirements = `
【风格要求】
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
章末风格：${context.styleFingerprint.chapterEndStyle}
战斗描写风格：${context.styleFingerprint.battleStyle}
暧昧描写风格：${context.styleFingerprint.romanceStyle}
悬疑揭示风格：${context.styleFingerprint.mysteryStyle}`;

  return [
    {
      role: "system",
      content: `你是一个专业的长篇连载小说作家。你严格按照章节目标和场景卡写作，保持风格一致性。你的写作必须：

1. 完全遵循章节目标中的mustHappen和mustNotHappen
2. 按照场景卡的结构逐步展开
3. 严格遵守风格指纹的所有要求
4. 控制字数在2000-3000字之间
5. 确保章末有强钩子

你直接输出小说正文，不要输出任何元数据、注释或JSON。所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请根据以下信息写作本章正文：

【作品DNA】
类型：${context.bookDna.genre}
核心Hook：${context.bookDna.coreHook}
主角：${context.bookDna.protagonist?.name}（${context.bookDna.protagonist?.roleType}）
语言习惯：${context.bookDna.protagonist?.speechPattern}
禁忌规则：${JSON.stringify(context.bookDna.forbiddenRules)}

【章节目标】
${context.chapterGoal}

【场景卡】
${context.sceneCards.map((s, i) => `
场景${s.sceneNumber}：
- 地点：${s.location}
- 时间：${s.timeContext}
- 角色：${s.characters?.join("、") || ""}
- 视角：${s.povCharacter}
- 冲突：${s.conflict}
- 信息变化：${s.infoChange}
- 情感目标：${s.emotionGoal}
- 关键动作：${s.keyAction}
- 钩子结尾：${s.hookEnding}
- 节奏：${s.pacing}
`).join("\n")}

【出场角色】
${context.activeCharacters.map((c) => `- ${c.name}（${c.roleType}）：欲望=${c.desire}，恐惧=${c.fear}，语言习惯=${c.speechPattern}，当前目标=${c.currentGoal}`).join("\n")}

【世界观规则】
${context.worldRules.map((r) => `- ${r.category}：${r.content}`).join("\n")}

【前文参考】
${context.recentChapters.map((ch) => `第${ch.chapterNumber}章「${ch.title}」摘要：${ch.summary}`).join("\n")}

${styleRequirements}

写作要求：
1. 字数控制在2000-3000字
2. 严格按照场景卡顺序展开
3. 每个场景的核心冲突和信息变化必须体现
4. 对白要符合角色语言习惯
5. 章末钩子要让读者产生强烈的追读欲望
6. 不要出现任何元叙述或作者旁白
7. 保持连贯的叙事节奏

请直接输出小说正文：`,
    },
  ];
}

export function buildRewritePrompt(context: {
  originalText: string;
  instruction: string;
  chapterGoal: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说修改编辑。你根据修改指令对原文进行精准修改，同时保持风格一致性和故事连贯性。

你的修改必须：
1. 精准执行修改指令
2. 保持原文的核心信息和情节走向
3. 符合风格指纹的所有要求
4. 修改后的文本要自然流畅，不能有修改痕迹

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请根据以下修改指令对原文进行修改：

【章节目标】
${context.chapterGoal}

【修改指令】
${context.instruction}

【原文】
${context.originalText}

【风格要求】
叙述视角：${context.styleFingerprint.narrativePOV}
叙述距离：${context.styleFingerprint.narrativeDistance}
平均句长：${context.styleFingerprint.avgSentenceLength}字
对白比例：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%
修辞偏好：${JSON.stringify(context.styleFingerprint.rhetoricSystem)}
常用词：${JSON.stringify(context.styleFingerprint.commonWords)}
禁用词：${JSON.stringify(context.styleFingerprint.bannedWords)}

修改指令说明：
- 增强冲突：增加对峙、对抗、矛盾的描写
- 增强对白：优化对话，使对白更符合角色性格，更有张力
- 增强画面：增加视觉、听觉、触觉等感官描写
- 增强钩子：强化场景或章节结尾的悬念感
- 改风格：调整叙述风格以匹配风格指纹
- 压缩：精简冗余描写，提升节奏
- 扩写：增加细节、心理、环境描写，丰富画面感

请直接输出修改后的文本：`,
    },
  ];
}

export function buildContinueWritePrompt(context: {
  existingText: string;
  chapterGoal: string;
  sceneCards: any[];
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的长篇连载小说作家。你需要从已有文本的断点处继续写作，保持叙事的连贯性和风格的一致性。

你的续写必须：
1. 从原文最后一段自然衔接
2. 按照剩余的场景卡继续展开
3. 保持与前文一致的风格和节奏
4. 完成章节目标中尚未完成的任务

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请从以下文本的断点处继续写作：

【章节目标】
${context.chapterGoal}

【场景卡】
${context.sceneCards.map((s) => `
场景${s.sceneNumber}：
- 地点：${s.location}
- 冲突：${s.conflict}
- 信息变化：${s.infoChange}
- 情感目标：${s.emotionGoal}
- 钩子结尾：${s.hookEnding}
`).join("\n")}

【已有文本】
${context.existingText}

【风格要求】
叙述视角：${context.styleFingerprint.narrativePOV}
平均句长：${context.styleFingerprint.avgSentenceLength}字
对白比例：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%
修辞偏好：${JSON.stringify(context.styleFingerprint.rhetoricSystem)}
常用词：${JSON.stringify(context.styleFingerprint.commonWords)}
禁用词：${JSON.stringify(context.styleFingerprint.bannedWords)}

续写要求：
1. 从原文最后一段自然衔接，不要重复已有内容
2. 按照场景卡继续展开剩余场景
3. 完成章节目标中的核心任务
4. 保持风格一致性
5. 确保章末有强钩子

请直接输出续写的文本：`,
    },
  ];
}

export function buildExpandPrompt(context: {
  text: string;
  targetExpansion: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说扩写编辑。你根据扩写方向对原文进行丰富和扩展，增加细节、心理描写、环境描写或对话，使文本更加饱满生动。

你的扩写必须：
1. 保持原文的核心信息和情节
2. 按照指定方向进行扩展
3. 符合风格指纹的所有要求
4. 扩写后的文本要自然流畅

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请根据以下方向对原文进行扩写：

【扩写方向】${context.targetExpansion}

【原文】
${context.text}

【风格要求】
叙述视角：${context.styleFingerprint.narrativePOV}
平均句长：${context.styleFingerprint.avgSentenceLength}字
心理描写比例：${(context.styleFingerprint.psychologicalRatio * 100).toFixed(0)}%
环境描写比例：${(context.styleFingerprint.environmentRatio * 100).toFixed(0)}%
修辞偏好：${JSON.stringify(context.styleFingerprint.rhetoricSystem)}
常用词：${JSON.stringify(context.styleFingerprint.commonWords)}
禁用词：${JSON.stringify(context.styleFingerprint.bannedWords)}

扩写方向说明：
- 增加心理描写：深入角色内心，展现思维过程和情感波动
- 增加环境描写：丰富场景的视觉、听觉、嗅觉等感官细节
- 增加对话：通过对话展现角色性格和推动情节
- 增加动作描写：细化动作过程，增强画面感
- 增加背景信息：补充必要的世界观或角色背景信息

请直接输出扩写后的文本：`,
    },
  ];
}

export function buildCompressPrompt(context: {
  text: string;
  targetReduction: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说精简编辑。你根据压缩方向对原文进行精简，去除冗余描写、重复信息或不必要的修饰，使文本更加精炼有力。

你的压缩必须：
1. 保留原文的核心信息和关键情节
2. 按照指定方向进行精简
3. 符合风格指纹的所有要求
4. 压缩后的文本要更加紧凑有力

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请根据以下方向对原文进行压缩：

【压缩方向】${context.targetReduction}

【原文】
${context.text}

【风格要求】
叙述视角：${context.styleFingerprint.narrativePOV}
平均句长：${context.styleFingerprint.avgSentenceLength}字
对白比例：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%
修辞偏好：${JSON.stringify(context.styleFingerprint.rhetoricSystem)}
常用词：${JSON.stringify(context.styleFingerprint.commonWords)}
禁用词：${JSON.stringify(context.styleFingerprint.bannedWords)}

压缩方向说明：
- 精简环境描写：减少冗长的环境描写，保留关键氛围元素
- 精简心理描写：减少过多的内心独白，保留核心情感
- 精简对白：去除废话对话，保留有信息量的对话
- 精简动作描写：简化动作过程，保留关键动作
- 整体压缩：综合精简各部分，提升节奏

请直接输出压缩后的文本：`,
    },
  ];
}
