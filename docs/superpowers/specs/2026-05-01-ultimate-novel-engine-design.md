# Ultimate Novel Engine Design Spec

> 将笔杆子从"能用"提升到"出好作品"的三轨升级方案。
> 日期：2026-05-01

---

## 概述

当前系统已完成核心生成链路（9步流水线），但输出质量停留在"能看"水平。本设计通过三个独立 Track 将系统提升到"网文节奏 + 出版文笔"水平：

| Track | 目标 | 预估工期 | 依赖 |
|-------|------|----------|------|
| C: 生成质量 | 多稿生成 + 精炼阶段 + 多轮审稿 | 3-5天 | 无 |
| B: 记忆一致性 | 向量记忆 + 跨章检查 + 世界规则执行 | 5-7天 | 无（向量搜索可用内存方案先行） |
| A: 智能路由 | 双模型配置 + 任务标签路由 | 1-2天 | 无 |

**推荐实施顺序：C → B → A**

理由：Track C 对输出质量的提升最直接，且不涉及数据库迁移。Track B 的向量记忆层可以先用内存方案，后续迁 PostgreSQL 时切换到 pgvector。Track A 最简单，随时可做。

---

## Track C: 生成质量提升

### 目标

将章节生成从"单稿 + 单次审稿"升级为"多稿选优 + 按需精炼 + 多轮审稿"，使输出同时具备网文的快节奏和出版物的文笔质量。

### 当前流水线（9步）

```
1. 章节功能判断
2. 章节目标生成
3. 场景卡生成
4. 正文生成（单稿）
5. 风格偏移检查
6. 风格对齐（偏移>30时）
7. 审稿（单轮）
8. 自动重写（<70分，最多2次）
9. 状态抽取
```

### 终极版流水线

```
规划阶段（不变）：
  1. 章节功能判断
  2. 章节目标生成
  3. 场景卡生成

生成阶段：
  4. 多稿并行生成（关键章节3稿，普通章节1稿）
  5. 评委选稿（仅多稿时执行）

精炼阶段（按需执行）：
  6. 对白增强（对白占比<15%或对白平淡时触发）
  7. 感官丰富（环境描写占比<10%时触发）
  8. 句子打磨（信息密度过高时触发）
  9. 钩子强化（章末钩子分<7时触发）

审稿阶段：
  10. 第一轮：一致性 + 设定检查
  11. 第二轮：节奏 + 追读检查
  12. 综合评分 → 不通过则回到精炼阶段针对性修复

收尾阶段：
  13. 状态抽取
```

### 多稿生成策略

**触发条件：**
- 自动触发：章节功能为 `main_plot`、`foreshadow_payoff`、`pleasure_burst`、`crisis_upgrade`、`phase_close` 时
- 手动触发：用户可在任意章节点击"多稿模式"

**生成方式：**
- 并行调用 3 次 `chatCompletion`，temperature 分别设为 0.7、0.9、1.1
- 不同 temperature 产生风格差异：保守写法、标准写法、大胆写法

**评委选稿：**
- 使用同一模型，prompt 包含：3稿全文 + 评分标准（节奏、对白、画面感、钩子、一致性）
- 输出：选择结果 + 各稿评分 + 选择理由
- 评分标准的权重：节奏30%、对白20%、画面感20%、钩子15%、一致性15%

**成本控制：**
- 普通章节 1 稿，成本 = 1x
- 关键章节 3 稿 + 评委，成本 ≈ 3.2x
- 预估关键章节占比约 30%，整体成本增加约 70%

### 精炼阶段

精炼是4个独立的 pass，每个只负责一个维度，按需触发：

**Pass 1: 对白增强**
- 触发条件：审稿报告中对白分 < 6 或对白占比 < 15%
- 做法：识别平淡对白段落，用更强的 character voice 重写，增加潜台词和冲突
- 改动范围：仅对白段落，不碰叙事

**Pass 2: 感官丰富**
- 触发条件：审稿报告中环境描写占比 < 10% 或画面感分 < 6
- 做法：在场景转换处和关键动作处加入视觉/听觉/嗅觉/触觉细节
- 改动范围：仅插入感官描写片段，不改原有内容

**Pass 3: 句子打磨**
- 触发条件：审稿报告中可读性分 < 6 或信息密度 > 阈值
- 做法：拆长句、加节奏变化、替换重复用词
- 改动范围：仅修改问题句子

**Pass 4: 钩子强化**
- 触发条件：审稿报告中章末钩子分 < 7
- 做法：重写最后 200 字，加强悬念/冲突/反转
- 改动范围：仅章末段落

**精炼顺序：** 对白增强 → 感官丰富 → 句子打磨 → 钩子强化（先改结构，再改细节）

### 多轮审稿

将当前的单轮审稿拆成3个独立检查：

**Round 1: 一致性检查**
- 角色行为是否符合人物设定
- 设定是否和正史冲突
- 伏笔状态是否正确
- 时间线是否连续
- 输出：一致性分（0-10）+ 问题列表

**Round 2: 节奏检查**
- 张力曲线是否合理（不能全高或全低）
- 爽点密度是否足够（每3-5章至少一个爽点）
- 是否有水文（连续3段无信息增量）
- 章末钩子强度
- 输出：节奏分（0-10）+ 问题列表

**Round 3: 风格检查（现有逻辑保留）**
- 文风偏移检测
- 对白风格一致性
- 叙述距离稳定性
- 输出：风格分（0-10）+ 偏移点

**综合评分公式调整：**
```
最终分 = 一致性分 * 0.35 + 节奏分 * 0.35 + 风格分 * 0.30
```

**不通过处理：**
- 综合分 < 7：根据具体问题回到对应精炼 pass，而不是全文重写
- 一致性问题 → 调整问题段落
- 节奏问题 → 压缩水文 / 加入冲突
- 风格问题 → 触发风格对齐
- 最多重试 3 次，3次后仍不通过则标记为"需人工修改"

### 新增 Prompt 文件

需要新建的 prompt：
- `lib/ai/prompts/multi-draft-judge.ts` — 评委选稿 prompt
- `lib/ai/prompts/dialogue-enhance.ts` — 对白增强 prompt
- `lib/ai/prompts/sensory-enrich.ts` — 感官丰富 prompt
- `lib/ai/prompts/sentence-polish.ts` — 句子打磨 prompt
- `lib/ai/prompts/hook-strengthen.ts` — 钩子强化 prompt
- `lib/ai/prompts/consistency-audit.ts` — 一致性审稿 prompt
- `lib/ai/prompts/pacing-audit.ts` — 节奏审稿 prompt

需要修改的 prompt：
- `lib/ai/prompts/auditor.ts` → 拆分为风格审稿专用

### Pipeline 改造

`lib/orchestrator/pipeline.ts` 的 `generateNextChapter` 方法重构：

```
async generateNextChapter(projectId) {
  // 规划阶段（不变）
  const { chapterFunction, chapterGoal, sceneCards } = await planChapter(context);

  // 生成阶段
  const drafts = await generateDrafts(context, chapterGoal, sceneCards, chapterFunction);
  const selected = drafts.length > 1
    ? await judgeDrafts(drafts, context)
    : drafts[0];

  // 精炼阶段（按需）
  let text = selected.text;
  text = await refinePasses(text, context, chapterGoal);

  // 审稿阶段（多轮）
  const auditResult = await multiRoundAudit(text, context, chapterGoal);

  // 收尾
  await saveChapter(projectId, text, auditResult);
}
```

---

## Track B: 记忆与一致性

### 目标

让系统在100章后仍能准确记住关键细节，自动发现跨章矛盾，强制执行世界规则。

### B1: 向量记忆层

**存储设计：**

新增 Prisma model `MemoryEmbedding`：

```prisma
model MemoryEmbedding {
  id          String   @id @default(uuid())
  projectId   String
  chapterId   String?
  contentType String   // "chapter_summary" | "scene" | "character_state" | "dialogue"
  content     String   // 原始文本
  embedding   String   // JSON 序列化的 float[]（SQLite 阶段）
  metadata    Json     // 额外元数据
  createdAt   DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId])
  @@index([contentType])
}
```

**Embedding 生成：**
- 使用 OpenAI-compatible 的 embedding API，通过 `AI_EMBEDDING_MODEL` 环境变量指定（如 `text-embedding-3-small`）。如果未配置，回退到 `AI_MODEL`（不支持 embedding 的模型会报错，此时需手动配置）
- 每章生成后，自动 embed 以下内容：
  - 章节摘要（1条）
  - 每个场景（3-7条）
  - 角色状态变化（N条）
- embedding 通过 `AI_BASE_URL` 的 `/v1/embeddings` 端点生成

**召回流程：**
- 生成新章时，用章节目标 + 场景卡做 query embedding
- 在 `MemoryEmbedding` 中做 cosine similarity 搜索，取 top-10
- 将语义召回结果和现有结构化召回合并，喂给 Writer

**SQLite 阶段实现：**
- 内存中加载项目的所有 embedding，用简单的 cosine similarity 计算
- 对于 < 1000 条 embedding 的项目，性能足够
- `lib/services/vector-memory.service.ts` 封装此逻辑

**未来迁移：**
- 迁 PostgreSQL 时，embedding 列改用 pgvector 的 `vector` 类型
- 查询改用 `<=>` 操作符做 ANN 搜索
- 应用层代码不变，只改数据访问层

### B2: 跨章一致性检查器

**检查维度：**

| 检查项 | 做法 | 触发时机 |
|--------|------|----------|
| 角色声音漂移 | 取最近5章中同一角色的对白，用 LLM 判断风格是否一致 | 每章生成后 |
| 设定冲突 | 将新章内容和 WorldRule/Character 做比对 | 每章生成后 |
| 伏笔状态校验 | 检查新章引用的伏笔是否状态正确 | 每章生成后 |
| 时间线连续性 | 检查事件顺序是否合理 | 每章生成后 |
| 角色失踪检测 | 检查重要角色是否超过10章未出场 | 每5章触发一次 |

**实现：**
- 新增 `lib/services/consistency-checker.service.ts`
- 每个检查维度是独立方法，可单独调用
- 检查结果存入 `ConsistencyReport` model

**新增 Prisma model：**

```prisma
model ConsistencyReport {
  id              String   @id @default(uuid())
  chapterId       String   @unique
  voiceDriftScore Float?   // 0-10
  settingConflicts Json?   // 冲突列表
  foreshadowErrors Json?   // 伏笔状态错误
  timelineGaps    Json?   // 时间线问题
  missingCharacters Json?  // 失踪角色
  overallScore    Float?   // 综合分
  createdAt       DateTime @default(now())

  chapter Chapter @relation(fields: [chapterId], references: [id])
}
```

### B3: 世界规则执行器

**设计：**

给 WorldRule 增加 `checkType` 和 `checkPrompt` 字段：

```prisma
model WorldRule {
  // ... 现有字段
  checkType   String?  // "auto" | "manual"
  checkPrompt String?  // 自动检查时用的 prompt 片段
}
```

**auto 类型规则的检查流程：**
1. 从 WorldRule 中筛选 `checkType = "auto"` 的规则
2. 对每条规则，用 `checkPrompt` 构建验证 prompt
3. 让 LLM 判断新章是否违反该规则
4. 违反则在审稿报告中标红

**示例：**
- 规则："主角不能无代价升级"
- checkPrompt："检查本章中主角是否有升级/突破/获得能力的情节，如果有，是否有对应的代价或风险描述"
- LLM 输出：{ violated: false } 或 { violated: true, evidence: "第3段主角突破到筑基但未描述代价" }

### B4: 伏笔生命周期管理增强

当前伏笔只有基本的 CRUD。增强：

**自动提醒：**
- 每章生成前，检查 `urgencyScore > 8` 且超过预期回收区间的伏笔
- 将高紧急度伏笔自动加入 `mustAdvance` 列表

**自动热度更新：**
- 伏笔被新章引用时，heatScore + 2
- 伏笔超过 5 章未出现，heatScore - 1
- 伏笔进入预期回收区间，urgencyScore + 3

**伏笔回收建议：**
- 当 urgencyScore > 9 时，自动生成回收方案建议
- 在 planner 页面高亮显示"必须尽快处理的伏笔"

---

## Track A: 智能路由（简化版）

### 目标

支持为不同任务类型配置不同模型，不做复杂路由系统。

### 设计

**环境变量扩展：**

```env
# 现有
AI_API_KEY=xxx
AI_BASE_URL=https://api.example.com/v1
AI_MODEL=gpt-4o

# 新增（可选，不填则用 AI_MODEL）
AI_FAST_MODEL=gpt-4o-mini      # 用于 planning、audit、extract
AI_STRONG_MODEL=gpt-4o         # 用于 writing、rewrite
AI_EMBEDDING_MODEL=text-embedding-3-small  # 用于向量化
```

**任务标签：**

在 `chatCompletion` / `jsonCompletion` 的 options 中增加 `taskType` 字段：

```typescript
interface CompletionOptions {
  model?: string;
  taskType?: "planning" | "writing" | "audit" | "extract" | "embed";
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}
```

**路由逻辑：**

```typescript
function resolveModel(taskType?: string): string {
  const config = getModelConfig();
  if (taskType === "writing" || taskType === "rewrite") {
    return config.strongModel || config.model;
  }
  if (taskType === "embed") {
    return config.embeddingModel || config.model;
  }
  return config.fastModel || config.model;
}
```

**Pipeline 集成：**

在每个 AI 调用处传入 `taskType`：
- `buildChapterFunctionPrompt` → `{ taskType: "planning" }`
- `buildWriteChapterPrompt` → `{ taskType: "writing" }`
- `buildAuditPrompt` → `{ taskType: "audit" }`
- `buildExtractStatePrompt` → `{ taskType: "extract" }`
- `generateDrafts` → `{ taskType: "writing" }`
- 精炼 passes → `{ taskType: "writing" }`

---

## 数据模型变更汇总

### 新增 Model

| Model | 用途 | Track |
|-------|------|-------|
| MemoryEmbedding | 向量记忆存储 | B |
| ConsistencyReport | 跨章一致性报告 | B |

### 修改 Model

| Model | 新增字段 | Track |
|-------|----------|-------|
| WorldRule | checkType, checkPrompt | B |
| AICallLog | taskType | A |

### 新增 Enum

无。`checkType` 用 String 而非 Enum，因为只有 auto/manual 两个值。

---

## 文件变更清单

### 新增文件

| 文件 | 用途 | Track |
|------|------|-------|
| `lib/ai/prompts/multi-draft-judge.ts` | 评委选稿 prompt | C |
| `lib/ai/prompts/dialogue-enhance.ts` | 对白增强 prompt | C |
| `lib/ai/prompts/sensory-enrich.ts` | 感官丰富 prompt | C |
| `lib/ai/prompts/sentence-polish.ts` | 句子打磨 prompt | C |
| `lib/ai/prompts/hook-strengthen.ts` | 钩子强化 prompt | C |
| `lib/ai/prompts/consistency-audit.ts` | 一致性审稿 prompt | C |
| `lib/ai/prompts/pacing-audit.ts` | 节奏审稿 prompt | C |
| `lib/services/vector-memory.service.ts` | 向量记忆服务 | B |
| `lib/services/consistency-checker.service.ts` | 跨章一致性检查 | B |
| `lib/orchestrator/refine-passes.ts` | 精炼阶段逻辑 | C |
| `lib/orchestrator/multi-round-audit.ts` | 多轮审稿逻辑 | C |

### 修改文件

| 文件 | 变更 | Track |
|------|------|-------|
| `lib/orchestrator/pipeline.ts` | 重构 generateNextChapter | C |
| `lib/ai/gateway.ts` | 增加 taskType 路由 | A |
| `lib/ai/prompts/auditor.ts` | 拆分为风格审稿专用 | C |
| `lib/orchestrator/context-builder.ts` | 增加向量召回 | B |
| `prisma/schema.prisma` | 新增 model 和字段 | B, A |

---

## 实施顺序

### Phase 1: Track C（3-5天）

1. 编写新增 prompt 文件（7个）
2. 实现 `refine-passes.ts`（4个精炼 pass）
3. 实现 `multi-round-audit.ts`（3轮审稿）
4. 重构 `pipeline.ts`，集成多稿生成 + 精炼 + 多轮审稿
5. 测试：生成10章，对比改进前后质量

### Phase 2: Track B（5-7天）

1. 数据库 migration：新增 MemoryEmbedding、ConsistencyReport、WorldRule 字段
2. 实现 `vector-memory.service.ts`
3. 实现 embedding 生成（调用 embedding API）
4. 修改 `context-builder.ts`，集成向量召回
5. 实现 `consistency-checker.service.ts`
6. 实现世界规则执行器
7. 增强伏笔生命周期管理

### Phase 3: Track A（1-2天）

1. 扩展 `gateway.ts`，增加 taskType 路由
2. 扩展环境变量配置
3. 在所有 AI 调用处传入 taskType
4. 修改 settings 页面，增加模型配置

---

## 成本预估

| 场景 | 当前成本 | Track C 后 | Track C+B 后 |
|------|----------|-----------|-------------|
| 普通章节 | 1x | 1.2x（精炼） | 1.3x（+向量召回） |
| 关键章节 | 1x | 3.5x（多稿+精炼） | 3.6x（+向量召回） |
| 综合（30%关键） | 1x | ~1.9x | ~2.0x |

成本增加约一倍，但输出质量从"能看"提升到"网文节奏+出版文笔"。

---

## 成功标准

### Track C 完成标准
- [ ] 关键章节自动生成3稿并选出最佳
- [ ] 精炼阶段按需执行，不增加无意义开销
- [ ] 多轮审稿能发现单轮审稿遗漏的问题
- [ ] 生成10章，质量分均分 ≥ 85（当前约 75-80）

### Track B 完成标准
- [ ] 向量召回能找到结构化查询遗漏的相关历史内容
- [ ] 跨章一致性检查器能发现角色声音漂移和设定冲突
- [ ] 世界规则执行器能自动检测规则违反
- [ ] 生成50章后，设定冲突率 < 5%

### Track A 完成标准
- [ ] planning/audit 任务使用 fast model
- [ ] writing 任务使用 strong model
- [ ] 用户可在设置页面配置每个任务类型的模型
