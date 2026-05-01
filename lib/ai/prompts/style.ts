import { Message } from "@/lib/ai/types";

export function buildExtractStylePrompt(sampleText: string): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的文学风格分析师。你从小说样章中精确提取风格指纹，包括叙述视角、叙述距离、句长分布、对白比例、心理描写比例、动作描写比例、环境描写比例、信息密度、情绪外露程度、幽默程度、修辞系统、常用词、禁用词、章末风格、战斗描写风格、暧昧描写风格和悬疑揭示风格。

你的分析必须：
1. 基于文本的客观统计和观察
2. 给出具体的数值和描述
3. 识别作者的语言习惯和偏好
4. 提取可复用的风格特征

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请从以下小说样章中提取完整的风格指纹：

【样章文本】
${sampleText}

请严格按照以下JSON Schema输出风格指纹：

\`\`\`json
{
  "narrativePOV": "叙述视角，如：第一人称/第三人称限制视角/第三人称全知视角",
  "narrativeDistance": "叙述距离，如：极近距离（沉浸式）/近距离/中距离/远距离",
  "avgSentenceLength": 0,
  "dialogueRatio": 0.0,
  "psychologicalRatio": 0.0,
  "actionRatio": 0.0,
  "environmentRatio": 0.0,
  "infoDensity": 0.0,
  "emotionExposure": 0.0,
  "humorLevel": 0.0,
  "rhetoricSystem": {
    "preferred": ["作者偏好使用的修辞手法列表"],
    "avoided": ["作者避免使用的修辞手法列表"]
  },
  "commonWords": ["作者常用的标志性词语或句式"],
  "bannedWords": ["作者绝对不会使用的词语或表达"],
  "chapterEndStyle": "章末收尾风格的详细描述",
  "battleStyle": "战斗/冲突描写风格的详细描述",
  "romanceStyle": "暧昧/感情描写风格的详细描述",
  "mysteryStyle": "悬疑/揭示风格的详细描述"
}
\`\`\`

字段说明：
- avgSentenceLength：平均句长，以字为单位
- dialogueRatio：对白占总文本的比例（0-1）
- psychologicalRatio：心理描写占总文本的比例（0-1）
- actionRatio：动作描写占总文本的比例（0-1）
- environmentRatio：环境描写占总文本的比例（0-1）
- infoDensity：信息密度（0-1），0表示非常松散，1表示非常密集
- emotionExposure：情绪外露程度（0-1），0表示极度内敛，1表示极度外放
- humorLevel：幽默程度（0-1），0表示完全没有幽默，1表示非常幽默
- commonWords：至少列出5个常用词或句式
- bannedWords：至少列出3个绝对不会使用的词语

分析要求：
1. 对于比例类字段，需要基于文本的实际统计估算
2. 对于修辞系统，需要观察文本中实际使用和未使用的修辞手法
3. 对于风格描述，需要结合具体文本片段进行说明
4. 所有数值需要在合理范围内

注意：所有文字内容必须使用中文。`,
    },
  ];
}

export function buildStyleAlignPrompt(context: {
  text: string;
  styleFingerprint: any;
  direction: string;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的风格对齐编辑。你根据风格指纹对文本进行调整，使其风格与目标风格一致。你的调整必须自然流畅，不能有机械修改的痕迹。

你的调整必须：
1. 严格遵循风格指纹的各项指标
2. 按照指定的调整方向进行
3. 保持原文的核心信息和情节
4. 调整后的文本要自然流畅

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请根据风格指纹对以下文本进行风格对齐：

【原文】
${context.text}

【调整方向】${context.direction}

【目标风格指纹】
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

调整方向说明：
- 统一视角：将叙述视角调整为目标视角
- 调整句长：将句子长度调整为目标平均句长
- 调整对白比例：增加或减少对话数量
- 调整描写比例：调整心理/动作/环境描写的比重
- 调整情绪外露度：使情感表达更内敛或更外放
- 调整幽默度：增加或减少幽默元素
- 替换修辞：将修辞手法替换为目标风格
- 替换用词：将用词替换为目标风格的常用词
- 全面对齐：综合调整所有维度

请直接输出调整后的文本：`,
    },
  ];
}

export function buildStyleDriftCheckPrompt(context: {
  text: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的风格一致性检测师。你将文本与风格指纹进行对比，计算风格偏移分数（Style Drift Score）。偏移分数范围为0-100，分数越低表示风格越一致。

你的检测必须：
1. 逐维度对比文本与风格指纹的差异
2. 给出每个维度的偏移分数
3. 提供具体的偏移描述
4. 综合计算总体偏移分数

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请检测以下文本与风格指纹的一致性：

【待检测文本】
${context.text}

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

请严格按照以下JSON Schema输出检测结果：

\`\`\`json
{
  "driftScore": 0,
  "driftDetails": [
    {
      "dimension": "维度名称",
      "score": 0,
      "description": "该维度的偏移描述"
    }
  ]
}
\`\`\`

检测维度说明：
1. 叙述视角一致性：文本是否使用了目标叙述视角
2. 叙述距离一致性：文本的叙述距离是否符合目标
3. 句长一致性：实际平均句长与目标的偏差
4. 对白比例一致性：实际对白比例与目标的偏差
5. 描写比例一致性：心理/动作/环境描写比例与目标的偏差
6. 信息密度一致性：实际信息密度与目标的偏差
7. 情绪外露度一致性：实际情绪外露程度与目标的偏差
8. 幽默度一致性：实际幽默程度与目标的偏差
9. 修辞一致性：是否使用了目标修辞偏好
10. 用词一致性：是否使用了目标常用词，是否避免了禁用词

评分标准：
- driftScore：0-100，0表示完全一致，100表示完全不一致
- 每个维度的score：0-100，0表示完全一致，100表示完全不一致
- 总分driftScore是各维度分数的加权平均

权重分配：
- 叙述视角：15%
- 叙述距离：10%
- 句长：10%
- 对白比例：10%
- 描写比例：15%
- 信息密度：10%
- 情绪外露度：10%
- 幽默度：5%
- 修辞：7.5%
- 用词：7.5%

注意：所有文字内容必须使用中文。`,
    },
  ];
}
