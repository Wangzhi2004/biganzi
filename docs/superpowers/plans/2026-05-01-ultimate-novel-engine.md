# Ultimate Novel Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the novel generation pipeline from "single-draft + single-audit" to "multi-draft + refine passes + multi-round audit" for publication-quality output with web novel pacing.

**Architecture:** Three independent tracks (C: Generation Quality, B: Memory & Consistency, A: Smart Routing). Track C refactors `lib/orchestrator/pipeline.ts` to add multi-draft generation, 4 refine passes, and 3-round audit. Track B adds vector memory and cross-chapter consistency checking. Track A adds dual-model config.

**Tech Stack:** Next.js, Prisma (SQLite), OpenAI-compatible API, TypeScript

**Spec:** `docs/superpowers/specs/2026-05-01-ultimate-novel-engine-design.md`

---

## Phase 1: Track C — Generation Quality

### Task 1: Multi-Draft Judge Prompt

**Files:**
- Create: `lib/ai/prompts/multi-draft-judge.ts`
- Modify: `lib/ai/prompts/index.ts`

- [ ] **Step 1: Create the multi-draft judge prompt file**

```typescript
// lib/ai/prompts/multi-draft-judge.ts
import { Message } from "@/lib/ai/types";

export function buildMultiDraftJudgePrompt(context: {
  drafts: Array<{ index: number; text: string }>;
  chapterGoal: string;
  sceneCards: any[];
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说选稿编辑。你从多个候选版本中选出最佳的一个，并给出详细评分和选择理由。

评分维度（每项1-10分）：
1. 节奏（pacing）：叙事节奏是否紧凑、有层次、张弛有度
2. 对白（dialogue）：对话是否自然、有潜台词、符合角色性格
3. 画面感（imagery）：描写是否生动、有感官细节、能想象出画面
4. 钩子（hook）：章末是否能有效吸引读者追读
5. 一致性（consistency）：是否符合章节目标和场景卡的要求

加权公式：总分 = 节奏*0.30 + 对白*0.20 + 画面感*0.20 + 钩子*0.15 + 一致性*0.15

所有输出必须使用中文。`,
    },
    {
      role: "user",
      content: `请从以下${context.drafts.length}个候选版本中选出最佳的一个：

【章节目标】
${context.chapterGoal}

【场景卡】
${context.sceneCards.map((s) => `场景${s.sceneNumber}：${s.location} - ${s.conflict}`).join("\n")}

【风格要求】
叙述视角：${context.styleFingerprint.narrativePOV}
平均句长：${context.styleFingerprint.avgSentenceLength}字
对白比例：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%

${context.drafts.map((d) => `【版本${d.index + 1}】\n${d.text}`).join("\n\n---\n\n")}

请严格按照以下JSON Schema输出：

\`\`\`json
{
  "selectedIndex": 0,
  "reasoning": "选择理由，100字以内",
  "scores": [
    {
      "index": 0,
      "pacing": 8,
      "dialogue": 7,
      "imagery": 8,
      "hook": 9,
      "consistency": 8,
      "total": 8.0
    }
  ]
}
\`\`\`

注意：selectedIndex从0开始。所有文字内容必须使用中文。`,
    },
  ];
}
```

- [ ] **Step 2: Add export to prompts index**

In `lib/ai/prompts/index.ts`, add at the end of the file:

```typescript
export { buildMultiDraftJudgePrompt } from "./multi-draft-judge";
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors from the new file.

---

### Task 2: Refine Pass Prompts

**Files:**
- Create: `lib/ai/prompts/dialogue-enhance.ts`
- Create: `lib/ai/prompts/sensory-enrich.ts`
- Create: `lib/ai/prompts/sentence-polish.ts`
- Create: `lib/ai/prompts/hook-strengthen.ts`
- Modify: `lib/ai/prompts/index.ts`

- [ ] **Step 1: Create dialogue enhance prompt**

```typescript
// lib/ai/prompts/dialogue-enhance.ts
import { Message } from "@/lib/ai/types";

export function buildDialogueEnhancePrompt(context: {
  text: string;
  activeCharacters: any[];
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说对白编辑。你专门优化小说中的对话，使对白更自然、更有张力、更符合角色性格。

你的修改必须：
1. 只修改对白段落，不改动叙事和描写
2. 给对白增加潜台词，让角色说话有言外之意
3. 让每个角色的说话方式符合其语言习惯
4. 增加对白中的冲突和张力
5. 保持原文的情节走向不变

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请优化以下文本中的对白：

【出场角色语言习惯】
${context.activeCharacters.filter(c => c.speechPattern).map((c) => `- ${c.name}：${c.speechPattern}`).join("\n")}

【风格要求】
对白比例目标：${(context.styleFingerprint.dialogueRatio * 100).toFixed(0)}%

【原文】
${context.text}

要求：
1. 只修改对白部分，叙事描写保持不变
2. 让对话更有潜台词和冲突
3. 每个角色的说话方式要明显不同
4. 去掉废话对话，保留有信息量的对话

请直接输出修改后的完整文本：`,
    },
  ];
}
```

- [ ] **Step 2: Create sensory enrich prompt**

```typescript
// lib/ai/prompts/sensory-enrich.ts
import { Message } from "@/lib/ai/types";

export function buildSensoryEnrichPrompt(context: {
  text: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说感官描写编辑。你在文本中恰当位置加入视觉、听觉、嗅觉、触觉等感官细节，使场景更加生动立体。

你的修改必须：
1. 在场景转换处和关键动作处加入感官描写
2. 感官描写要服务于氛围和情绪，不能为了描写而描写
3. 保持原文的情节和节奏不变
4. 描写要具体、有画面感，避免泛泛的形容词

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请在以下文本中加入感官描写：

【环境描写目标比例】
${(context.styleFingerprint.environmentRatio * 100).toFixed(0)}%

【原文】
${context.text}

要求：
1. 在场景转换处加入环境感官细节（视觉、听觉、嗅觉、触觉选择1-2种）
2. 在关键动作处加入身体感受
3. 不要改变原文的叙事节奏
4. 感官描写要具体（"铁锈味"而不是"难闻的气味"）

请直接输出修改后的完整文本：`,
    },
  ];
}
```

- [ ] **Step 3: Create sentence polish prompt**

```typescript
// lib/ai/prompts/sentence-polish.ts
import { Message } from "@/lib/ai/types";

export function buildSentencePolishPrompt(context: {
  text: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说文字润色编辑。你优化文本的句子结构，使文字更流畅、节奏更好、更有文学性。

你的修改必须：
1. 拆分过长的句子，增加节奏变化
2. 替换重复用词，丰富词汇
3. 调整句子结构，避免千篇一律的主谓宾
4. 保持原文的情节和信息不变

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请润色以下文本的句子：

【风格要求】
平均句长目标：${context.styleFingerprint.avgSentenceLength}字
修辞偏好：${JSON.stringify(context.styleFingerprint.rhetoricSystem)}
常用词：${JSON.stringify(context.styleFingerprint.commonWords)}
禁用词：${JSON.stringify(context.styleFingerprint.bannedWords)}

【原文】
${context.text}

要求：
1. 拆分超过40字的长句
2. 替换重复出现3次以上的词语
3. 增加句式变化（长短交替、倒装、省略等）
4. 不要改变原文的情节走向和信息量

请直接输出修改后的完整文本：`,
    },
  ];
}
```

- [ ] **Step 4: Create hook strengthen prompt**

```typescript
// lib/ai/prompts/hook-strengthen.ts
import { Message } from "@/lib/ai/types";

export function buildHookStrengthenPrompt(context: {
  text: string;
  chapterGoal: string;
  styleFingerprint: any;
}): Message[] {
  return [
    {
      role: "system",
      content: `你是一个专业的小说钩子编辑。你专门重写章节结尾，使章末钩子更有力，让读者产生强烈的追读欲望。

你的修改必须：
1. 只重写最后200-300字
2. 钩子类型可以是：悬念、反转、冲突升级、新信息、情感冲击、伏笔暗示
3. 钩子要自然衔接，不能生硬
4. 保持前文内容完全不变

所有内容必须使用中文。`,
    },
    {
      role: "user",
      content: `请重写以下文本的章末钩子：

【章节目标中的钩子设计】
${context.chapterGoal}

【章末风格】
${context.styleFingerprint.chapterEndStyle}

【原文】
${context.text}

要求：
1. 只修改最后200-300字
2. 钩子要让读者产生"必须看下一章"的冲动
3. 可以用悬念、反转、冲突升级等方式
4. 钩子要自然，不能突兀

请直接输出修改后的完整文本（包含前文不变部分和新的结尾）：`,
    },
  ];
}
```

- [ ] **Step 5: Add all exports to prompts index**

Append to `lib/ai/prompts/index.ts`:

```typescript
export { buildDialogueEnhancePrompt } from "./dialogue-enhance";
export { buildSensoryEnrichPrompt } from "./sensory-enrich";
export { buildSentencePolishPrompt } from "./sentence-polish";
export { buildHookStrengthenPrompt } from "./hook-strengthen";
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 3: Multi-Round Audit Prompts

**Files:**
- Create: `lib/ai/prompts/consistency-audit.ts`
- Create: `lib/ai/prompts/pacing-audit.ts`
- Modify: `lib/ai/prompts/index.ts`

- [ ] **Step 1: Create consistency audit prompt**

```typescript
// lib/ai/prompts/consistency-audit.ts
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
```

- [ ] **Step 2: Create pacing audit prompt**

```typescript
// lib/ai/prompts/pacing-audit.ts
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
```

- [ ] **Step 3: Add exports to prompts index**

Append to `lib/ai/prompts/index.ts`:

```typescript
export { buildConsistencyAuditPrompt } from "./consistency-audit";
export { buildPacingAuditPrompt } from "./pacing-audit";
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 4: Refine Passes Module

**Files:**
- Create: `lib/orchestrator/refine-passes.ts`

- [ ] **Step 1: Create the refine passes module**

```typescript
// lib/orchestrator/refine-passes.ts
import { chatCompletion, type LogContext } from "@/lib/ai";
import {
  buildDialogueEnhancePrompt,
  buildSensoryEnrichPrompt,
  buildSentencePolishPrompt,
  buildHookStrengthenPrompt,
} from "@/lib/ai/prompts";

interface RefineContext {
  text: string;
  activeCharacters: any[];
  styleFingerprint: any;
  chapterGoal: string;
}

interface RefineAuditHints {
  dialogueScore?: number;
  dialogueRatio?: number;
  imageryScore?: number;
  environmentRatio?: number;
  readabilityScore?: number;
  hookScore?: number;
}

export const refinePasses = {
  async execute(
    ctx: RefineContext,
    hints: RefineAuditHints,
    logContext?: LogContext
  ): Promise<{ text: string; passesRun: string[] }> {
    let text = ctx.text;
    const passesRun: string[] = [];

    // Pass 1: Dialogue enhance
    if (
      (hints.dialogueScore !== undefined && hints.dialogueScore < 6) ||
      (hints.dialogueRatio !== undefined && hints.dialogueRatio < 0.15)
    ) {
      const { content } = await chatCompletion(
        buildDialogueEnhancePrompt({
          text,
          activeCharacters: ctx.activeCharacters,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_dialogue", stepOrder: 10 }
          : undefined
      );
      text = content;
      passesRun.push("dialogue_enhance");
    }

    // Pass 2: Sensory enrich
    if (
      (hints.imageryScore !== undefined && hints.imageryScore < 6) ||
      (hints.environmentRatio !== undefined && hints.environmentRatio < 0.1)
    ) {
      const { content } = await chatCompletion(
        buildSensoryEnrichPrompt({
          text,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_sensory", stepOrder: 11 }
          : undefined
      );
      text = content;
      passesRun.push("sensory_enrich");
    }

    // Pass 3: Sentence polish
    if (hints.readabilityScore !== undefined && hints.readabilityScore < 6) {
      const { content } = await chatCompletion(
        buildSentencePolishPrompt({
          text,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_polish", stepOrder: 12 }
          : undefined
      );
      text = content;
      passesRun.push("sentence_polish");
    }

    // Pass 4: Hook strengthen
    if (hints.hookScore !== undefined && hints.hookScore < 7) {
      const { content } = await chatCompletion(
        buildHookStrengthenPrompt({
          text,
          chapterGoal: ctx.chapterGoal,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_hook", stepOrder: 13 }
          : undefined
      );
      text = content;
      passesRun.push("hook_strengthen");
    }

    return { text, passesRun };
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 5: Multi-Round Audit Module

**Files:**
- Create: `lib/orchestrator/multi-round-audit.ts`

- [ ] **Step 1: Create the multi-round audit module**

```typescript
// lib/orchestrator/multi-round-audit.ts
import { jsonCompletion, type LogContext } from "@/lib/ai";
import {
  buildConsistencyAuditPrompt,
  buildPacingAuditPrompt,
  buildAuditPrompt,
} from "@/lib/ai/prompts";
import type { AuditReportResult } from "@/types";

interface AuditContext {
  chapterContent: string;
  chapterGoal: string;
  chapterFunction: string;
  bookDna: any;
  activeCharacters: any[];
  activeForeshadows: any[];
  worldRules: any[];
  styleFingerprint: any;
  recentChapters: any[];
  pacingState: any;
}

export interface MultiRoundAuditResult {
  consistencyScore: number;
  pacingScore: number;
  styleScore: number;
  finalScore: number;
  overallStatus: "green" | "yellow" | "red";
  consistencyIssues: any[];
  pacingIssues: any[];
  styleReport: AuditReportResult;
  refineHints: {
    dialogueScore?: number;
    dialogueRatio?: number;
    imageryScore?: number;
    environmentRatio?: number;
    readabilityScore?: number;
    hookScore?: number;
  };
}

export const multiRoundAudit = {
  async execute(
    ctx: AuditContext,
    logContext?: LogContext
  ): Promise<MultiRoundAuditResult> {
    // Round 1: Consistency check
    const { data: consistencyResult, meta: consistencyMeta } =
      await jsonCompletion(
        buildConsistencyAuditPrompt({
          chapterContent: ctx.chapterContent,
          chapterGoal: ctx.chapterGoal,
          activeCharacters: ctx.activeCharacters,
          activeForeshadows: ctx.activeForeshadows,
          worldRules: ctx.worldRules,
          recentChapters: ctx.recentChapters,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "audit_consistency", stepOrder: 14 }
          : undefined
      );

    // Round 2: Pacing check
    const { data: pacingResult, meta: pacingMeta } = await jsonCompletion(
      buildPacingAuditPrompt({
        chapterContent: ctx.chapterContent,
        chapterGoal: ctx.chapterGoal,
        chapterFunction: ctx.chapterFunction,
        pacingState: ctx.pacingState,
        styleFingerprint: ctx.styleFingerprint,
        recentChapters: ctx.recentChapters,
      }),
      undefined,
      logContext
        ? { ...logContext, stepName: "audit_pacing", stepOrder: 15 }
        : undefined
    );

    // Round 3: Style check (reuse existing audit prompt)
    const { data: styleResult, meta: styleMeta } = await jsonCompletion(
      buildAuditPrompt({
        chapterContent: ctx.chapterContent,
        chapterGoal: ctx.chapterGoal,
        bookDna: ctx.bookDna,
        activeCharacters: ctx.activeCharacters,
        activeForeshadows: ctx.activeForeshadows,
        worldRules: ctx.worldRules,
        styleFingerprint: ctx.styleFingerprint,
        recentChapters: ctx.recentChapters,
      }),
      undefined,
      logContext
        ? { ...logContext, stepName: "audit_style", stepOrder: 16 }
        : undefined
    );

    // Calculate weighted final score
    const consistencyScore = consistencyResult.consistencyScore || 5;
    const pacingScore = pacingResult.pacingScore || 5;
    const styleScore = styleResult.qualityScore
      ? styleResult.qualityScore / 10
      : 5;

    const finalScore =
      Math.round(
        (consistencyScore * 0.35 +
          pacingScore * 0.35 +
          styleScore * 0.3) *
          10
      ) / 10;

    // Determine overall status
    const hasRedIssue =
      consistencyResult.issues?.some((i: any) => i.severity === "red") ||
      pacingResult.issues?.some((i: any) => i.severity === "red") ||
      styleResult.risks?.some((r: any) => r.level === "red");

    let overallStatus: "green" | "yellow" | "red";
    if (finalScore >= 8 && !hasRedIssue) {
      overallStatus = "green";
    } else if (finalScore >= 6 && !hasRedIssue) {
      overallStatus = "yellow";
    } else {
      overallStatus = "red";
    }

    // Build refine hints from audit results
    const dialogueIssue = consistencyResult.issues?.find(
      (i: any) => i.type === "character_behavior"
    );
    const pacingIssues = pacingResult.issues || [];

    return {
      consistencyScore,
      pacingScore,
      styleScore,
      finalScore,
      overallStatus,
      consistencyIssues: consistencyResult.issues || [],
      pacingIssues,
      styleReport: styleResult,
      refineHints: {
        dialogueScore: dialogueIssue ? 5 : 8,
        imageryScore: styleResult.readabilityScore || 7,
        readabilityScore: styleResult.readabilityScore || 7,
        hookScore: pacingResult.hookStrength || 7,
      },
    };
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 6: Refactor Pipeline with Multi-Draft + Refine + Multi-Round Audit

**Files:**
- Modify: `lib/orchestrator/pipeline.ts`

- [ ] **Step 1: Read current pipeline to prepare for rewrite**

Read `lib/orchestrator/pipeline.ts` and understand the current 9-step flow.

- [ ] **Step 2: Rewrite the pipeline with new generation flow**

Replace the entire `lib/orchestrator/pipeline.ts` with:

```typescript
import { chatCompletion, jsonCompletion, type LogContext } from "@/lib/ai";
import {
  buildChapterFunctionPrompt,
  buildChapterGoalPrompt,
  buildPlannerSceneCardsPrompt,
  buildWriteChapterPrompt,
  buildMultiDraftJudgePrompt,
  buildExtractStatePrompt,
} from "@/lib/ai/prompts";
import { contextBuilder } from "./context-builder";
import { refinePasses } from "./refine-passes";
import { multiRoundAudit } from "./multi-round-audit";
import { chapterService } from "@/lib/services/chapter.service";
import { memoryService } from "@/lib/services/memory.service";
import { auditService } from "@/lib/services/audit.service";
import { projectService } from "@/lib/services/project.service";
import { generationService } from "@/lib/services/generation.service";
import { prisma } from "@/lib/prisma";
import type {
  ChapterGenerationInput,
  ChapterGenerationOutput,
  ChapterFunction,
  SceneCard,
  AuditReportResult,
  StateDiffResult,
} from "@/types";

export const AI_STEPS = {
  CHAPTER_FUNCTION: "chapter_function",
  CHAPTER_GOAL: "chapter_goal",
  SCENE_CARDS: "scene_cards",
  CHAPTER_BODY: "chapter_body",
  MULTI_DRAFT_JUDGE: "multi_draft_judge",
  STYLE_DRIFT_CHECK: "style_drift_check",
  STYLE_ALIGN: "style_align",
  AUDIT_CONSISTENCY: "audit_consistency",
  AUDIT_PACING: "audit_pacing",
  AUDIT_STYLE: "audit_style",
  REWRITE: "rewrite",
  STATE_DIFF: "state_diff",
} as const;

const CHAPTER_TITLE_MAP: Record<ChapterFunction, string> = {
  main_plot: "主线推进",
  character_turn: "人物转折",
  foreshadow_plant: "伏笔埋设",
  foreshadow_payoff: "伏笔回收",
  pleasure_burst: "爽点爆发",
  crisis_upgrade: "危机升级",
  world_expansion: "世界观扩展",
  relationship_advance: "关系推进",
  villain_pressure: "反派施压",
  emotional_settle: "情感沉淀",
  phase_close: "阶段收束",
  new_arc_open: "新弧开启",
};

const MULTI_DRAFT_FUNCTIONS: ChapterFunction[] = [
  "main_plot",
  "foreshadow_payoff",
  "pleasure_burst",
  "crisis_upgrade",
  "phase_close",
];

const MAX_RETRIES = 3;

export const pipeline = {
  async generateNextChapter(
    projectId: string,
    options?: { forceRewrite?: boolean; jobId?: string; projectId?: string }
  ): Promise<ChapterGenerationOutput> {
    const startTime = Date.now();
    let totalTokens = 0;

    const jobId = await generationService.createJob({
      projectId,
      jobType: "next_chapter",
    });

    try {
      const nextChapterNumber =
        await chapterService.getNextChapterNumber(projectId);
      const context = await contextBuilder.buildChapterContext(
        projectId,
        nextChapterNumber
      );

      const logContext: LogContext = {
        jobId: options?.jobId ?? jobId,
        projectId: options?.projectId ?? projectId,
      };

      // === PLANNING PHASE (unchanged) ===

      const { data: functionResult, meta: functionMeta } =
        await jsonCompletion(
          buildChapterFunctionPrompt(context),
          undefined,
          { ...logContext, stepName: AI_STEPS.CHAPTER_FUNCTION, stepOrder: 1 }
        );
      totalTokens += functionMeta.usage.totalTokens;

      const chapterFunction = functionResult.suggestedFunction as ChapterFunction;

      const { data: goalResult, meta: goalMeta } = await jsonCompletion(
        buildChapterGoalPrompt({
          ...context,
          chapterFunction,
        }),
        undefined,
        { ...logContext, stepName: AI_STEPS.CHAPTER_GOAL, stepOrder: 2 }
      );
      totalTokens += goalMeta.usage.totalTokens;

      const chapterGoal = goalResult.chapterGoal;
      const mustHappen = goalResult.mustHappen;
      const mustNotHappen = goalResult.mustNotHappen;
      const endingHook = goalResult.endingHook;

      const { data: sceneResult, meta: sceneMeta } = await jsonCompletion(
        buildPlannerSceneCardsPrompt({
          ...context,
          chapterGoal,
          chapterFunction,
        }),
        undefined,
        { ...logContext, stepName: AI_STEPS.SCENE_CARDS, stepOrder: 3 }
      );
      totalTokens += sceneMeta.usage.totalTokens;

      const sceneCards: SceneCard[] = sceneResult.sceneCards;

      // === GENERATION PHASE (new: multi-draft) ===

      const useMultiDraft = MULTI_DRAFT_FUNCTIONS.includes(chapterFunction);

      let chapterText: string;

      if (useMultiDraft) {
        // Generate 3 drafts in parallel with different temperatures
        const draftPromises = [0.7, 0.9, 1.1].map(
          async (temp, index) => {
            const { content, usage } = await chatCompletion(
              buildWriteChapterPrompt({
                bookDna: context.bookDna,
                chapterGoal,
                sceneCards,
                activeCharacters: context.activeCharacters,
                styleFingerprint: context.styleFingerprint,
                recentChapters: context.lastChapters,
                worldRules: context.worldRules,
              }),
              { temperature: temp },
              {
                ...logContext,
                stepName: `draft_${index + 1}`,
                stepOrder: 4 + index,
              }
            );
            return { index, text: content, tokens: usage.totalTokens };
          }
        );

        const drafts = await Promise.all(draftPromises);
        totalTokens += drafts.reduce((sum, d) => sum + d.tokens, 0);

        // Judge drafts
        const { data: judgeResult, meta: judgeMeta } = await jsonCompletion(
          buildMultiDraftJudgePrompt({
            drafts: drafts.map((d) => ({ index: d.index, text: d.text })),
            chapterGoal,
            sceneCards,
            styleFingerprint: context.styleFingerprint,
          }),
          undefined,
          { ...logContext, stepName: AI_STEPS.MULTI_DRAFT_JUDGE, stepOrder: 7 }
        );
        totalTokens += judgeMeta.usage.totalTokens;

        const selectedIndex = judgeResult.selectedIndex || 0;
        chapterText = drafts[selectedIndex].text;
      } else {
        // Single draft
        const { content, usage } = await chatCompletion(
          buildWriteChapterPrompt({
            bookDna: context.bookDna,
            chapterGoal,
            sceneCards,
            activeCharacters: context.activeCharacters,
            styleFingerprint: context.styleFingerprint,
            recentChapters: context.lastChapters,
            worldRules: context.worldRules,
          }),
          undefined,
          { ...logContext, stepName: AI_STEPS.CHAPTER_BODY, stepOrder: 4 }
        );
        totalTokens += usage.totalTokens;
        chapterText = content;
      }

      // === REFINEMENT + AUDIT LOOP ===

      let auditResult: Awaited<ReturnType<typeof multiRoundAudit.execute>>;
      let retryCount = 0;

      do {
        // Multi-round audit
        auditResult = await multiRoundAudit.execute(
          {
            chapterContent: chapterText,
            chapterGoal,
            chapterFunction,
            bookDna: context.bookDna,
            activeCharacters: context.activeCharacters,
            activeForeshadows: context.activeForeshadows,
            worldRules: context.worldRules,
            styleFingerprint: context.styleFingerprint,
            recentChapters: context.lastChapters,
            pacingState: context.pacingState,
          },
          logContext
        );

        if (auditResult.overallStatus === "green") break;

        // Refine passes based on audit hints
        const refineResult = await refinePasses.execute(
          {
            text: chapterText,
            activeCharacters: context.activeCharacters,
            styleFingerprint: context.styleFingerprint,
            chapterGoal,
          },
          auditResult.refineHints,
          logContext
        );

        if (refineResult.passesRun.length === 0) break; // Nothing to refine

        chapterText = refineResult.text;
        retryCount++;
      } while (retryCount < MAX_RETRIES);

      // === STATE EXTRACTION ===

      const { data: stateDiff, meta: stateMeta } = await jsonCompletion(
        buildExtractStatePrompt({
          chapterContent: chapterText,
          chapterNumber: nextChapterNumber,
          activeCharacters: context.activeCharacters,
          activeForeshadows: context.activeForeshadows,
          worldRules: context.worldRules,
        }),
        undefined,
        { ...logContext, stepName: AI_STEPS.STATE_DIFF, stepOrder: 20 }
      );
      totalTokens += stateMeta.usage.totalTokens;

      // === SAVE ===

      const chapterTitle = `第${nextChapterNumber}章 ${
        CHAPTER_TITLE_MAP[chapterFunction] || "未命名"
      }`;

      const chapter = await chapterService.create({
        projectId,
        chapterNumber: nextChapterNumber,
        title: chapterTitle,
        content: chapterText,
        summary: stateDiff.chapterSummary,
        chapterFunction,
        sceneCards: sceneCards,
        goal: chapterGoal,
        qualityScore: auditResult.finalScore * 10, // Convert 1-10 to 0-100
      });

      await prisma.aICallLog.updateMany({
        where: { jobId: logContext.jobId },
        data: { chapterId: chapter.id },
      });

      // Save audit report in the old format for compatibility
      const legacyAuditReport: AuditReportResult = {
        overallStatus: auditResult.overallStatus,
        qualityScore: auditResult.finalScore * 10,
        mainPlotScore: auditResult.styleReport.mainPlotScore || 0,
        characterChangeScore: auditResult.styleReport.characterChangeScore || 0,
        conflictScore: auditResult.styleReport.conflictScore || 0,
        hookScore: auditResult.refineHints.hookScore
          ? auditResult.refineHints.hookScore * 10
          : 0,
        styleConsistencyScore: auditResult.styleScore * 10,
        settingConsistencyScore: auditResult.consistencyScore * 10,
        infoIncrementScore: auditResult.styleReport.infoIncrementScore || 0,
        emotionTensionScore: auditResult.styleReport.emotionTensionScore || 0,
        freshnessScore: auditResult.styleReport.freshnessScore || 0,
        readabilityScore: auditResult.refineHints.readabilityScore
          ? auditResult.refineHints.readabilityScore * 10
          : 0,
        risks: [
          ...auditResult.consistencyIssues.map((i: any) => ({
            level: i.severity,
            category: "consistency",
            description: i.description,
            suggestion: i.suggestion,
          })),
          ...auditResult.pacingIssues.map((i: any) => ({
            level: i.severity,
            category: "pacing",
            description: i.description,
            suggestion: i.suggestion,
          })),
        ],
        rewriteActions: [],
      };

      await auditService.saveAuditReport(chapter.id, legacyAuditReport);
      await memoryService.saveStateDiff(chapter.id, stateDiff);

      for (const scene of sceneCards) {
        await chapterService.createScene({
          chapterId: chapter.id,
          sceneNumber: scene.sceneNumber,
          location: scene.location,
          characters: scene.characters,
          conflict: scene.conflict,
          infoChange: scene.infoChange,
          emotionGoal: scene.emotionGoal,
        });
      }

      await projectService.updateStats(projectId, {
        currentChapter: nextChapterNumber,
        totalWords: chapterText.replace(/\s/g, "").length,
      });

      const durationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "completed",
        output: {
          chapterId: chapter.id,
          chapterNumber: nextChapterNumber,
          qualityScore: auditResult.finalScore * 10,
        },
        durationMs,
        tokenCount: totalTokens,
      });

      return {
        chapterTitle,
        chapterFunction,
        chapterGoal,
        sceneCards,
        chapterBody: chapterText,
        qualityScore: auditResult.finalScore * 10,
        auditReport: legacyAuditReport,
        stateDiff,
        nextChapterSeed: stateDiff.nextChapterSuggestion,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await generationService.updateJob(jobId, {
        status: "failed",
        errorMessage: (error as Error).message,
        durationMs,
      });
      throw error;
    }
  },

  async confirmAndApplyState(
    projectId: string,
    chapterId: string
  ): Promise<void> {
    const stateDiff = await memoryService.getStateDiff(chapterId);
    if (!stateDiff) {
      throw new Error("章节状态差异不存在");
    }

    await chapterService.confirmChapter(chapterId);
    await memoryService.applyStateDiff(chapterId, stateDiff as unknown as StateDiffResult);
  },
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors from the modified files.

---

## Phase 2: Track B — Memory & Consistency

### Task 7: Add MemoryEmbedding and ConsistencyReport to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add MemoryEmbedding model**

Append to `prisma/schema.prisma` before the closing of the file:

```prisma
model MemoryEmbedding {
  id          String   @id @default(uuid())
  projectId   String
  chapterId   String?
  contentType String   // "chapter_summary" | "scene" | "character_state" | "dialogue"
  content     String
  embedding   String   // JSON-serialized float[] (SQLite phase)
  metadata    Json?
  createdAt   DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId])
  @@index([contentType])
  @@index([chapterId])
}
```

- [ ] **Step 2: Add ConsistencyReport model**

Append to `prisma/schema.prisma`:

```prisma
model ConsistencyReport {
  id               String   @id @default(uuid())
  chapterId        String   @unique
  voiceDriftScore  Float?
  settingConflicts Json?
  foreshadowErrors Json?
  timelineGaps     Json?
  missingCharacters Json?
  overallScore     Float?
  createdAt        DateTime @default(now())

  chapter Chapter @relation(fields: [chapterId], references: [id])
}
```

- [ ] **Step 3: Add checkType and checkPrompt to WorldRule**

In the `WorldRule` model, add two fields after `version`:

```prisma
  checkType   String?  // "auto" | "manual"
  checkPrompt String?  // auto-check prompt fragment
```

- [ ] **Step 4: Add taskType to AICallLog**

In the `AICallLog` model, add after `stepOrder`:

```prisma
  taskType    String?  // "planning" | "writing" | "audit" | "extract"
```

- [ ] **Step 5: Add MemoryEmbedding to Project relations**

In the `Project` model, add to the relations list:

```prisma
  memoryEmbeddings  MemoryEmbedding[]
  consistencyReports ConsistencyReport[]
```

- [ ] **Step 6: Run Prisma migration**

Run: `npx prisma migrate dev --name add_memory_embedding_consistency`
Expected: Migration created successfully.

---

### Task 8: Vector Memory Service

**Files:**
- Create: `lib/services/vector-memory.service.ts`

- [ ] **Step 1: Create the vector memory service**

```typescript
// lib/services/vector-memory.service.ts
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai";

interface EmbeddingResult {
  id: string;
  content: string;
  contentType: string;
  similarity: number;
  metadata: any;
}

export const vectorMemoryService = {
  async generateEmbedding(text: string): Promise<number[]> {
    const { getConfig } = await import("@/lib/config");
    const apiKey = getConfig("AI_API_KEY") || "";
    const baseURL = getConfig("AI_BASE_URL") || "";
    const model = getConfig("AI_EMBEDDING_MODEL") || "text-embedding-3-small";

    const response = await fetch(`${baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  },

  async storeEmbedding(
    projectId: string,
    content: string,
    contentType: string,
    chapterId?: string,
    metadata?: any
  ): Promise<void> {
    const embedding = await this.generateEmbedding(content);

    await prisma.memoryEmbedding.create({
      data: {
        projectId,
        chapterId,
        contentType,
        content,
        embedding: JSON.stringify(embedding),
        metadata: metadata || {},
      },
    });
  },

  async storeChapterEmbeddings(
    projectId: string,
    chapterId: string,
    chapterSummary: string,
    scenes: Array<{ sceneNumber: number; content: string }>,
    characterChanges: Array<{ characterName: string; change: string }>
  ): Promise<void> {
    // Store chapter summary embedding
    await this.storeEmbedding(
      projectId,
      chapterSummary,
      "chapter_summary",
      chapterId
    );

    // Store scene embeddings
    for (const scene of scenes) {
      await this.storeEmbedding(
        projectId,
        scene.content,
        "scene",
        chapterId,
        { sceneNumber: scene.sceneNumber }
      );
    }

    // Store character state change embeddings
    for (const change of characterChanges) {
      await this.storeEmbedding(
        projectId,
        `${change.characterName}: ${change.change}`,
        "character_state",
        chapterId
      );
    }
  },

  async semanticSearch(
    projectId: string,
    query: string,
    contentType?: string,
    limit: number = 10
  ): Promise<EmbeddingResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const where: any = { projectId };
    if (contentType) where.contentType = contentType;

    const embeddings = await prisma.memoryEmbedding.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500, // Load recent embeddings for in-memory search
    });

    // Calculate cosine similarity in memory
    const results: EmbeddingResult[] = embeddings
      .map((e) => {
        const stored = JSON.parse(e.embedding) as number[];
        const similarity = cosineSimilarity(queryEmbedding, stored);
        return {
          id: e.id,
          content: e.content,
          contentType: e.contentType,
          similarity,
          metadata: e.metadata,
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  },

  async recallRelevantContext(
    projectId: string,
    chapterGoal: string,
    sceneCards: any[]
  ): Promise<string[]> {
    // Build query from chapter goal and scene cards
    const query = [
      chapterGoal,
      ...sceneCards.map(
        (s: any) => `${s.location} ${s.conflict} ${s.infoChange}`
      ),
    ].join(" ");

    const results = await this.semanticSearch(
      projectId,
      query,
      undefined,
      5
    );

    return results
      .filter((r) => r.similarity > 0.7)
      .map((r) => r.content);
  },
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 9: Consistency Checker Service

**Files:**
- Create: `lib/services/consistency-checker.service.ts`

- [ ] **Step 1: Create the consistency checker service**

```typescript
// lib/services/consistency-checker.service.ts
import { jsonCompletion, type LogContext } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { Message } from "@/lib/ai/types";

interface CharacterVoiceSample {
  characterName: string;
  dialogues: Array<{ chapterNumber: number; text: string }>;
}

export const consistencyChecker = {
  async checkCharacterVoice(
    projectId: string,
    chapterId: string,
    chapterContent: string,
    characters: any[],
    logContext?: LogContext
  ): Promise<{ score: number; drifts: any[] }> {
    // Extract dialogue from current chapter
    const currentDialogues = extractDialogues(chapterContent);

    // Get recent dialogue samples for each character
    const recentChapters = await prisma.chapter.findMany({
      where: {
        projectId,
        chapterNumber: { gte: 1 },
      },
      orderBy: { chapterNumber: "desc" },
      take: 5,
      select: { content: true, chapterNumber: true },
    });

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

${characters
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
  .join("\n\n")}

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
    const threshold = 10; // chapters
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
  // Match Chinese dialogue patterns: "xxx" or 「xxx」
  const lines = text.split("\n");
  for (const line of lines) {
    const matches = line.match(/["「]([^"」]+)["」]/g);
    if (matches) {
      // Try to extract character name from context
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 10: Integrate Vector Memory into Context Builder

**Files:**
- Modify: `lib/orchestrator/context-builder.ts`

- [ ] **Step 1: Add vector memory recall to context builder**

In `lib/orchestrator/context-builder.ts`, add the import at the top:

```typescript
import { vectorMemoryService } from "@/lib/services/vector-memory.service";
```

Then in the `buildChapterContext` method, after the existing `Promise.all` block, add:

```typescript
    // Semantic recall from vector memory (non-blocking, best-effort)
    let semanticContext: string[] = [];
    try {
      semanticContext = await vectorMemoryService.recallRelevantContext(
        projectId,
        "", // chapterGoal not available yet at this stage
        []
      );
    } catch (e) {
      // Vector memory is optional, don't fail if unavailable
      console.log("[VectorMemory] Semantic recall skipped:", (e as Error).message);
    }
```

And add `semanticContext` to the returned object:

```typescript
      semanticContext,
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 11: Store Embeddings After Chapter Generation

**Files:**
- Modify: `lib/orchestrator/pipeline.ts`

- [ ] **Step 1: Add embedding storage after state extraction**

In the pipeline's `generateNextChapter` method, after `await memoryService.saveStateDiff(...)`, add:

```typescript
      // Store embeddings for vector memory (non-blocking)
      try {
        const { vectorMemoryService } = await import("@/lib/services/vector-memory.service");
        await vectorMemoryService.storeChapterEmbeddings(
          projectId,
          chapter.id,
          stateDiff.chapterSummary,
          sceneCards.map((s, i) => ({
            sceneNumber: s.sceneNumber,
            content: `${s.location}: ${s.conflict} → ${s.infoChange}`,
          })),
          (stateDiff.characterChanges || []).map((c: any) => ({
            characterName: c.characterName,
            change: `${c.field}: ${c.oldValue} → ${c.newValue}`,
          }))
        );
      } catch (e) {
        console.log("[VectorMemory] Embedding storage skipped:", (e as Error).message);
      }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

## Phase 3: Track A — Smart Routing

### Task 12: Add Task Type Routing to Gateway

**Files:**
- Modify: `lib/ai/gateway.ts`

- [ ] **Step 1: Add taskType to CompletionOptions**

In `lib/ai/gateway.ts`, add `taskType` to the `CompletionOptions` interface:

```typescript
interface CompletionOptions {
  model?: string;
  taskType?: "planning" | "writing" | "audit" | "extract" | "embed";
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}
```

- [ ] **Step 2: Add resolveModel function**

After the `getModelConfig` function, add:

```typescript
function resolveModel(taskType?: string): string {
  const config = getModelConfig();
  if (taskType === "writing" || taskType === "rewrite") {
    return process.env.AI_STRONG_MODEL || config.model;
  }
  return process.env.AI_FAST_MODEL || config.model;
}
```

- [ ] **Step 3: Use resolveModel in chatCompletion**

In `chatCompletion`, change:
```typescript
  const model = options?.model || config.model;
```
to:
```typescript
  const model = options?.model || resolveModel(options?.taskType);
```

Do the same in `streamChatCompletion`.

- [ ] **Step 4: Log taskType in AICallLog**

In the `prisma.aICallLog.create` calls, add `taskType: logContext?.taskType` if the field exists. Since we added `taskType` to the schema in Task 7, this should work after migration.

Add `taskType` to the `LogContext` interface:

```typescript
export interface LogContext {
  jobId?: string;
  projectId?: string;
  chapterId?: string;
  stepName?: string;
  stepOrder?: number;
  taskType?: string;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

---

### Task 13: Add Environment Variable Documentation

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add new env vars to .env.example**

Append to `.env.example`:

```env
# Smart routing (optional - falls back to AI_MODEL if not set)
AI_FAST_MODEL=gpt-4o-mini
AI_STRONG_MODEL=gpt-4o
AI_EMBEDDING_MODEL=text-embedding-3-small
```

- [ ] **Step 2: Verify the app still runs**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

---

## Verification

### Task 14: End-to-End Test

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Create a test project or use existing one**

Navigate to `http://localhost:3000` and either create a new project or use an existing one.

- [ ] **Step 3: Generate a chapter**

Click "生成下一章" and verify:
- Multi-draft generation runs for key chapter functions
- Refine passes execute when audit hints trigger them
- Multi-round audit runs (consistency + pacing + style)
- Final score is calculated correctly

- [ ] **Step 4: Verify audit report**

Check that the audit report shows:
- Consistency score
- Pacing score
- Style score
- Combined final score

- [ ] **Step 5: Check AI call logs**

Query the database to verify new step names appear:
- `draft_1`, `draft_2`, `draft_3` (for multi-draft)
- `multi_draft_judge`
- `refine_dialogue`, `refine_sensory`, etc. (when triggered)
- `audit_consistency`, `audit_pacing`, `audit_style`
