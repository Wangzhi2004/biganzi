# 笔杆子·连载引擎 V1 Spec

## Why
当前 AI 写作工具只能生成短文本，缺少长篇结构控制、正史记忆、伏笔管理、风格一致性等能力。我们需要构建一个"小说 IDE"，让 AI 像成熟长篇作者一样持续经营一部小说，而不是临时生成一段文字。V1 目标是让个人作者能稳定写一本长篇（10+ 章），系统能记住人物、伏笔、设定，能指出冲突，能保持基本风格一致。

## What Changes
- 从零搭建完整全栈项目（Next.js + PostgreSQL）
- 实现作品创建 → 大纲规划 → 章节生成 → 审稿 → 入库的完整链路
- 构建正史记忆库（人物、关系、伏笔、世界规则、事件）
- 实现 AI 驱动的 Planner / Writer / Auditor 三角色模式
- 构建小说编辑器（Tiptap）+ 叙事状态面板 + 章节树 + 审稿报告
- 实现风格指纹提取与风格偏移检测
- 所有 AI 功能通过兼容 OpenAI 的 API 接口驱动

## Impact
- Affected specs: 全新项目，无已有规格
- Affected code: 全部新建
- Tech stack: Next.js 14 (App Router) + React 18 + Tailwind CSS + Tiptap + shadcn/ui + Prisma + PostgreSQL (pgvector) + OpenAI-compatible API

---

## ADDED Requirements

### Requirement: 项目基础架构
系统 SHALL 提供完整的全栈项目基础，包括前端框架、后端 API、数据库、ORM、认证、AI 网关。

#### Scenario: 项目启动
- **WHEN** 开发者执行 `npm run dev`
- **THEN** 前后端同时启动，可访问首页

#### Scenario: 数据库初始化
- **WHEN** 开发者执行 `npx prisma migrate dev`
- **THEN** 所有表结构创建成功，pgvector 扩展启用

---

### Requirement: 作品创建器
系统 SHALL 让用户通过输入类型、创意、目标字数、目标读者、风格等信息，自动生成作品 DNA、主角设定、核心矛盾、世界观基础、全书主线、第一卷卷纲、前 30 章规划、前 5 章场景卡、前 1 章正文草稿。

#### Scenario: 从一句话创意创建作品
- **WHEN** 用户输入"被废的宗门杂役发现自己能听见神像遗言"并选择玄幻类型
- **THEN** 系统生成完整作品 DNA（含类型、卖点、主角母题、终局情绪、禁忌规则等）
- **AND** 生成主角设定（目标、恐惧、秘密、底线、语言习惯等）
- **AND** 生成世界观基础规则
- **AND** 生成第一卷卷纲和前 30 章规划
- **AND** 生成前 5 章详细场景卡
- **AND** 生成第 1 章正文草稿

#### Scenario: 用户确认后写入正史
- **WHEN** 用户审查生成结果并点击确认
- **THEN** 所有设定写入正史数据库
- **AND** 作品状态变为"已初始化"

---

### Requirement: 作品 Bible
系统 SHALL 提供作品最高设定管理界面，包含作品 DNA、主角设定、重要角色、世界观规则、组织设定、能力体系、地图地点、道具系统、禁忌规则、风格指纹、目标读者。所有内容可编辑，编辑后系统检查受影响章节。

#### Scenario: 查看作品 Bible
- **WHEN** 用户进入作品 Bible 页面
- **THEN** 展示所有设定分类和内容

#### Scenario: 编辑设定
- **WHEN** 用户修改某个世界观规则
- **THEN** 系统保存修改
- **AND** 检查受影响章节并提示用户

---

### Requirement: 章节树与结构管理
系统 SHALL 提供左侧章节树，展示全书 → 卷 → 篇章单元 → 章节 → 场景的层级结构。

#### Scenario: 浏览章节树
- **WHEN** 用户展开章节树
- **THEN** 显示卷、篇章、章节的层级结构
- **AND** 每个节点显示状态（已生成 / 待生成 / 需修改）

#### Scenario: 导航到章节
- **WHEN** 用户点击某个章节节点
- **THEN** 中间编辑区加载该章节内容
- **AND** 右侧面板显示该章节状态信息

---

### Requirement: 正文编辑器
系统 SHALL 提供基于 Tiptap 的富文本编辑器，支持写作、续写、改写、扩写、删减、增强冲突、增强钩子、调整风格等操作。

#### Scenario: 编辑正文
- **WHEN** 用户在编辑器中修改正文
- **THEN** 自动保存草稿
- **AND** 右侧面板实时显示当前章节状态

#### Scenario: 选中文本改写
- **WHEN** 用户选中一段文本并选择"增强冲突"
- **THEN** AI 仅改写选中部分，保持上下文连贯

#### Scenario: AI 辅助操作
- **WHEN** 用户点击"续写" / "扩写" / "压缩" / "改风格"
- **THEN** AI 根据当前上下文和章节目标生成改写建议
- **AND** 用户可接受或拒绝

---

### Requirement: 生成下一章（核心链路）
系统 SHALL 实现完整的章节生成流水线：读取状态 → 判断功能 → 生成目标 → 生成场景卡 → 生成正文 → 风格对齐 → 审稿 → 自动重写 → 状态抽取 → 用户确认 → 写入正史。

#### Scenario: 生成下一章
- **WHEN** 用户点击"生成下一章"
- **THEN** 系统自动读取作品 DNA、当前卷目标、最近 5 章摘要、活跃人物、未回收伏笔、世界规则、风格指纹
- **AND** 推荐下一章功能（如主线推进、伏笔回收、爽点爆发等）
- **AND** 生成章节目标和 3-7 个场景卡
- **AND** 生成正文初稿（约 2000-3000 字）
- **AND** 执行风格对齐
- **AND** 执行审稿检查
- **AND** 若质量分 < 70 自动重写
- **AND** 生成章节摘要和状态变化
- **AND** 展示给用户确认

#### Scenario: 章节确认入库
- **WHEN** 用户点击"确认入库"
- **THEN** 章节写入正史库
- **AND** 更新人物状态、关系、伏笔、事件、世界规则
- **AND** 更新章节树

---

### Requirement: 正史记忆库
系统 SHALL 维护结构化的正史数据库，包含人物、关系、组织、地点、道具、能力、世界规则、事件、时间线、伏笔、读者承诺、章节摘要。每条正史有来源章节、可信状态（已确认/草稿/废弃/冲突）、版本历史。

#### Scenario: 正史写入
- **WHEN** 用户确认新章节入库
- **THEN** 系统自动抽取状态变化并写入正史库
- **AND** 每条记录标记来源章节和确认状态

#### Scenario: 正史召回
- **WHEN** 生成新章节时
- **THEN** 系统从正史库精准召回相关人物、伏笔、规则等上下文
- **AND** 不使用整本书内容，而是按相关性筛选

---

### Requirement: 自动摘要与状态抽取
每章生成/修改后，系统 SHALL 自动抽取：本章摘要、新增事实、人物状态变化、关系变化、新增世界规则、新增伏笔、回收伏笔、读者承诺变化、风险标记、下一章建议。输出格式必须为结构化 JSON。

#### Scenario: 章节状态抽取
- **WHEN** 一章正文生成完成
- **THEN** 系统输出结构化状态差异（state_diff）
- **AND** 包含 chapter_summary、new_facts、character_changes、new_foreshadows、paid_off_foreshadows、risk_flags

---

### Requirement: 人物库
系统 SHALL 维护人物一致性。每个人物包含：基础信息、身份变化、目标、恐惧、创伤、秘密、底线、能力、关系图、出场记录、语言习惯、人物弧线、当前状态、未来安排。支持查看角色出场章节、检测人物漂移、生成角色专属对白。

#### Scenario: 查看人物详情
- **WHEN** 用户点击某个人物
- **THEN** 展示完整人物信息卡
- **AND** 显示出场章节列表和关系图

#### Scenario: 人物一致性检查
- **WHEN** 审稿器检测到人物行为与其底线/性格矛盾
- **THEN** 输出风险提示，如"风险：林昭在第 18 章明确表示不会主动求助宗门，但第 24 章直接向宗门长老求援"

---

### Requirement: 伏笔账本
系统 SHALL 管理所有伏笔，每个伏笔包含：埋设章节、线索文本、表面意义、真实意义、关联人物、预计回收区间、当前状态、热度分、紧急度分。支持自动识别新伏笔、提醒长期未出现伏笔、建议回收窗口、生成加深桥段和误导性解释。伏笔状态：未激活 → 已埋设 → 已提醒 → 已加深 → 部分回收 → 完整回收 / 废弃 / 冲突。

#### Scenario: 伏笔列表展示
- **WHEN** 用户进入伏笔账本页面
- **THEN** 展示全部伏笔列表，可按状态筛选（全部/即将回收/长期未出现/已回收/高风险）

#### Scenario: 伏笔自动识别
- **WHEN** 新章节生成并入库
- **THEN** 系统自动识别新增伏笔并添加到账本

#### Scenario: 伏笔过期警告
- **WHEN** 某伏笔已超过预计回收区间
- **THEN** 系统标记为高风险并提醒用户

---

### Requirement: 风格指纹
系统 SHALL 支持通过系统预设或上传样章提取风格指纹。风格字段包括：叙述视角、叙述距离、句长分布、对白比例、心理描写比例、动作描写比例、信息密度、情绪外露程度、修辞系统、章末风格等。每章生成后计算 Style Drift Score，偏移过高自动风格重写。

#### Scenario: 设置风格指纹
- **WHEN** 用户选择预设风格或上传样章
- **THEN** 系统生成风格指纹并保存到作品设定

#### Scenario: 风格偏移检测
- **WHEN** 新章节生成完成
- **THEN** 计算 Style Drift Score
- **AND** 若偏移超过阈值，自动进入风格重写流程

---

### Requirement: 一致性审稿器
系统 SHALL 在每章生成后执行多维度审稿检查：设定一致性、人物一致性、时间线一致性、伏笔状态、主线推进、冲突强度、爽点密度、节奏风险、重复桥段、风格偏移、水文风险、章末钩子。结果分为绿色（可发布）、黄色（建议修改）、红色（必须重写）。

#### Scenario: 自动审稿
- **WHEN** 一章正文生成完成
- **THEN** 审稿器输出总分、发布建议、风险列表、修改建议
- **AND** 标记为绿色/黄色/红色

#### Scenario: 审稿报告展示
- **WHEN** 用户查看审稿报告
- **THEN** 展示总分、逐项评分、主要风险、修改建议、自动重写入口

---

### Requirement: 章节质量评分
每章生成后 SHALL 按公式打分：主线推进(0.15) + 人物变化(0.15) + 冲突强度(0.12) + 章末钩子(0.12) + 风格一致性(0.10) + 设定一致性(0.10) + 信息增量(0.08) + 情绪张力(0.08) + 新鲜度(0.05) + 可读性(0.05)。阈值：90+ 强推荐发布，80-89 可发布建议微调，70-79 需要修改，70 以下自动重写。

#### Scenario: 章节评分
- **WHEN** 审稿完成
- **THEN** 输出 0-100 的质量分和各维度子分

---

### Requirement: 章节功能系统
每章 SHALL 有一个主功能（主线推进/人物转折/伏笔埋设/伏笔回收/爽点爆发/危机升级/世界观扩张/关系推进/反派压迫/情绪沉淀/阶段收束/新篇开启）和若干副功能。系统根据当前作品状态自动推荐下一章功能。

#### Scenario: 功能推荐
- **WHEN** 系统判断下一章功能
- **THEN** 考虑主线推进频率、伏笔状态、爽点密度、压抑/释放节奏、角色出场频率

---

### Requirement: 作品驾驶舱
系统 SHALL 提供作品总览页面，展示：作品名、当前字数、当前章节、当前卷、主线进度、质量均分、未回收伏笔数、高风险伏笔数、长期未出场角色、最近 10 章节奏曲线、下一章推荐功能、今日生成任务。核心按钮：生成下一章、检查全书风险。

#### Scenario: 查看驾驶舱
- **WHEN** 用户进入某作品
- **THEN** 展示完整的作品状态仪表盘

---

### Requirement: AI 模型网关
系统 SHALL 通过兼容 OpenAI 的 API 接口调用大模型，支持配置 API endpoint、API key、model name。所有 AI 功能（规划、写作、审稿、状态抽取）统一通过此网关调用。

#### Scenario: 配置 AI 模型
- **WHEN** 用户在设置中配置 API 端点和密钥
- **THEN** 系统使用该配置调用 AI 模型

#### Scenario: 模型调用
- **WHEN** 任意 AI 功能被触发
- **THEN** 通过统一的模型网关发送请求
- **AND** 记录调用耗时、token 用量、成本

---

## MODIFIED Requirements
无（全新项目）

## REMOVED Requirements
无（全新项目）

---

## 技术架构

### 前端
- **框架**: Next.js 14+ (App Router)
- **UI 库**: React 18
- **样式**: Tailwind CSS
- **组件库**: shadcn/ui
- **编辑器**: Tiptap (富文本)
- **状态管理**: Zustand
- **图表**: Recharts（节奏曲线等）
- **图标**: Lucide React

### 后端
- **API 层**: Next.js API Routes (Route Handlers)
- **ORM**: Prisma
- **数据库**: PostgreSQL 15+ (启用 pgvector 扩展)
- **向量搜索**: pgvector（正史语义召回）
- **认证**: JWT（V1 简版，V2 可升级 NextAuth/Clerk）

### AI 层
- **接口标准**: OpenAI-compatible API (chat/completions)
- **配置化**: API endpoint / key / model 可配置
- **角色系统**: Orchestrator 统一调度 Planner / Writer / Auditor
- **Prompt 管理**: 结构化 prompt 模板，按角色/任务分文件管理

### 数据模型（核心表）
- `users` - 用户
- `projects` - 作品项目
- `book_dna` - 作品 DNA
- `volumes` - 卷
- `arcs` - 篇章单元
- `chapters` - 章节
- `scenes` - 场景
- `characters` - 人物
- `relationships` - 关系
- `world_rules` - 世界规则
- `locations` - 地点
- `items` - 道具
- `abilities` - 能力
- `organizations` - 组织
- `events` - 事件
- `foreshadows` - 伏笔
- `reader_promises` - 读者承诺
- `style_fingerprints` - 风格指纹
- `audit_reports` - 审稿报告
- `generation_jobs` - 生成任务
- `state_diffs` - 状态变化

### 页面路由
```
/                           - 首页（项目列表）
/project/new                - 创建新作品（向导）
/project/[id]               - 作品驾驶舱
/project/[id]/editor        - 小说编辑器（默认章节）
/project/[id]/editor/[chId] - 小说编辑器（指定章节）
/project/[id]/bible         - 作品 Bible
/project/[id]/characters    - 人物库
/project/[id]/foreshadows   - 伏笔账本
/project/[id]/planner       - 章节规划器
/project/[id]/audit/[chId]  - 审稿报告
/settings                   - 设置（AI 模型配置等）
```

### 服务层
```
lib/
  ai/
    gateway.ts              - AI 模型网关（OpenAI-compatible）
    prompts/
      planner.ts            - Planner 角色 prompt 模板
      writer.ts             - Writer 角色 prompt 模板
      auditor.ts            - Auditor 角色 prompt 模板
      extractor.ts          - 状态抽取 prompt 模板
      dna.ts                - 作品 DNA 生成 prompt
      style.ts              - 风格指纹 prompt
  services/
    project.service.ts      - 作品 CRUD
    chapter.service.ts      - 章节 CRUD + 生成
    character.service.ts    - 人物管理
    foreshadow.service.ts   - 伏笔管理
    memory.service.ts       - 正史记忆库（存储 + 召回）
    audit.service.ts        - 审稿服务
    style.service.ts        - 风格指纹服务
    planning.service.ts     - 规划服务
    generation.service.ts   - 生成流水线编排
  orchestrator/
    pipeline.ts             - 章节生成完整流水线
    context-builder.ts      - 上下文构建器（为 AI 组装输入）
```
