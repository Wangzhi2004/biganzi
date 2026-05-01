import { jsonCompletion, type LogContext } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { Message } from "@/lib/ai/types";

export const consistencyChecker = {
  async checkCharacterVoice(
    projectId: string,
    chapterId: string,
    chapterContent: string,
    characters: any[],
    logContext?: LogContext
  ): Promise<{ score: number; drifts: any[] }> {
    const currentDialogues = extractDialogues(chapterContent);

    const recentChapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: "desc" },
      take: 5,
      select: { content: true, chapterNumber: true },
    });

    const characterSections = characters
      .map((c) => {
        const currentLines = currentDialogues
          .filter((d) => d.character === c.name)
          .map((d) => d.line);
        if (currentLines.length === 0) return null;

        const historicalLines = recentChapters
          .flatMap((ch: any) => extractDialogues(ch.content || ""))
          .filter((d) => d.character === c.name)
          .map((d) => d.line)
          .slice(0, 5);

        return `【${c.name}】
语言习惯设定：${c.speechPattern || "无"}
历史对白：
${historicalLines.map((l) => `- "${l}"`).join("\n") || "无历史对白"}
本章对白：
${currentLines.map((l) => `- "${l}"`).join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");

    if (!characterSections) return { score: 8, drifts: [] };

    const messages: Message[] = [
      {
        role: "system",
        content: `你是一个角色声音一致性检查员。你检查同一角色在不同章节中的对白风格是否一致。

检查维度：
1. 语气：是冷淡还是热情，是正式还是随意
2. 用词：是文雅还是粗俗，是简洁还是啰嗦
3. 句式：是长句还是短句，是陈述还是反问
4. 口头禅：是否有固定的说话方式

所有输出必须使用中文。`,
      },
      {
        role: "user",
        content: `请检查以下角色在不同章节中的对白风格是否一致：

${characterSections}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "overallScore": 8,
  "drifts": [
    {
      "character": "角色名",
      "severity": "red/yellow/green",
      "description": "漂移描述",
      "example": "具体例子"
    }
  ]
}
\`\`\`

注意：所有文字内容必须使用中文。`,
      },
    ];

    const { data } = await jsonCompletion(messages, undefined, logContext);
    return {
      score: data.overallScore || 8,
      drifts: data.drifts || [],
    };
  },

  async checkWorldRuleViolations(
    projectId: string,
    chapterContent: string,
    logContext?: LogContext
  ): Promise<{ violations: any[] }> {
    const autoRules = await prisma.worldRule.findMany({
      where: {
        projectId,
        checkType: "auto",
        status: "CONFIRMED",
      },
    });

    if (autoRules.length === 0) return { violations: [] };

    const messages: Message[] = [
      {
        role: "system",
        content: `你是一个世界观规则检查员。你检查小说章节是否违反了已建立的世界观规则。

所有输出必须使用中文。`,
      },
      {
        role: "user",
        content: `请检查以下章节是否违反了世界观规则：

【章节正文】
${chapterContent}

【世界观规则】
${autoRules.map((r) => `- [${r.category}] ${r.content}${r.checkPrompt ? `\n  检查方法：${r.checkPrompt}` : ""}`).join("\n")}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "violations": [
    {
      "ruleCategory": "规则类别",
      "ruleContent": "规则内容",
      "severity": "red/yellow/green",
      "description": "违反描述",
      "evidence": "文中的证据"
    }
  ]
}
\`\`\`

如果没有违反任何规则，输出空数组。
注意：所有文字内容必须使用中文。`,
      },
    ];

    const { data } = await jsonCompletion(messages, undefined, logContext);
    return { violations: data.violations || [] };
  },

  async saveReport(
    chapterId: string,
    report: {
      voiceDriftScore?: number;
      settingConflicts?: any[];
      foreshadowErrors?: any[];
      timelineGaps?: any[];
      missingCharacters?: any[];
      overallScore?: number;
    }
  ): Promise<void> {
    await prisma.consistencyReport.create({
      data: {
        chapterId,
        voiceDriftScore: report.voiceDriftScore,
        settingConflicts: report.settingConflicts || [],
        foreshadowErrors: report.foreshadowErrors || [],
        timelineGaps: report.timelineGaps || [],
        missingCharacters: report.missingCharacters || [],
        overallScore: report.overallScore,
      },
    });
  },

  async detectMissingCharacters(
    projectId: string,
    currentChapterNumber: number
  ): Promise<string[]> {
    const threshold = 10;
    const importantCharacters = await prisma.character.findMany({
      where: {
        projectId,
        roleType: { in: ["protagonist", "antagonist", "major"] },
      },
      select: { name: true, lastSeenChapter: true },
    });

    return importantCharacters
      .filter((c) => {
        if (!c.lastSeenChapter) return false;
        return currentChapterNumber - c.lastSeenChapter > threshold;
      })
      .map((c) => c.name);
  },
};

function extractDialogues(
  text: string
): Array<{ character: string; line: string }> {
  const dialogues: Array<{ character: string; line: string }> = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const matches = line.match(/["「]([^"」]+)["」]/g);
    if (matches) {
      const nameMatch = line.match(/^([^"「"」]*?)[说道喊叫问答]/);
      const character = nameMatch ? nameMatch[1].trim() : "unknown";
      for (const match of matches) {
        const cleaned = match.replace(/["「"」]/g, "");
        dialogues.push({ character, line: cleaned });
      }
    }
  }
  return dialogues;
}
