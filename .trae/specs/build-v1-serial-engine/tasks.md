# Tasks

## Phase 1: 项目基础搭建

- [x] Task 1: 初始化 Next.js 项目并配置基础依赖
  - [x] 1.1 使用 `create-next-app` 创建项目（App Router, TypeScript, Tailwind CSS, ESLint）
  - [x] 1.2 安装核心依赖：prisma, @prisma/client, @tiptap/react, @tiptap/starter-kit, @tiptap/extension-*, zustand, recharts, lucide-react, openai, bcryptjs, jsonwebtoken, uuid
  - [x] 1.3 安装 shadcn/ui 并初始化配置
  - [x] 1.4 配置项目结构：`app/`, `lib/`, `components/`, `prisma/`, `types/`
  - [x] 1.5 配置环境变量模板 `.env.example`（DATABASE_URL, AI_API_KEY, AI_BASE_URL, AI_MODEL, JWT_SECRET）
  - [x] 1.6 验证 `npm run dev` 能正常启动

- [x] Task 2: 数据库 Schema 设计与 Prisma 配置
  - [x] 2.1 初始化 Prisma，配置 PostgreSQL 连接（含 pgvector 扩展）
  - [x] 2.2 编写 `schema.prisma`，定义全部核心表：users, projects, book_dna, volumes, arcs, chapters, scenes, characters, relationships, world_rules, locations, items, abilities, organizations, events, foreshadows, reader_promises, style_fingerprints, audit_reports, generation_jobs, state_diffs
  - [x] 2.3 定义表间关系和索引
  - [x] 2.4 执行 `prisma migrate dev` 验证 schema 正确
  - [x] 2.5 编写 `prisma/seed.ts` 基础种子数据（预设风格、预设类型等）
  - [x] 2.6 生成 Prisma Client 并导出单例

- [x] Task 3: AI 模型网关
  - [x] 3.1 创建 `lib/ai/gateway.ts`，封装 OpenAI-compatible API 调用
  - [x] 3.2 支持配置化：API endpoint, API key, model name 从环境变量读取
  - [x] 3.3 实现基础 chat completion 调用（支持 system + user messages）
  - [x] 3.4 实现 JSON mode 调用（用于结构化输出如状态抽取、审稿等）
  - [x] 3.5 实现调用日志记录（耗时、token 用量）
  - [x] 3.6 实现基础错误处理和重试逻辑

## Phase 2: Prompt 模板与 AI 角色系统

- [x] Task 4: 构建 Prompt 模板体系
  - [x] 4.1 创建 `lib/ai/prompts/dna.ts` - 作品 DNA 生成 prompt（输入类型/创意，输出完整 DNA JSON）
  - [x] 4.2 创建 `lib/ai/prompts/planner.ts` - Planner 角色 prompt（判断章节功能、生成目标、生成场景卡）
  - [x] 4.3 创建 `lib/ai/prompts/writer.ts` - Writer 角色 prompt（生成正文、风格对齐、续写/改写/扩写/压缩）
  - [x] 4.4 创建 `lib/ai/prompts/auditor.ts` - Auditor 角色 prompt（一致性检查、质量评分、风险检测）
  - [x] 4.5 创建 `lib/ai/prompts/extractor.ts` - 状态抽取 prompt（抽取摘要、人物变化、伏笔变化等）
  - [x] 4.6 创建 `lib/ai/prompts/style.ts` - 风格指纹 prompt（提取/对齐风格）
  - [x] 4.7 创建 `lib/ai/prompts/character.ts` - 人物相关 prompt（生成人物设定、检测漂移）
  - [x] 4.8 统一 prompt 管理：所有 prompt 导出为函数，接收上下文参数，返回 messages 数组

## Phase 3: 核心服务层

- [x] Task 5: 作品服务 (Project Service)
  - [x] 5.1 创建 `lib/services/project.service.ts`
  - [x] 5.2 实现创建作品（基础信息）
  - [x] 5.3 实现获取作品列表、作品详情
  - [x] 5.4 实现更新/删除作品
  - [x] 5.5 创建 `app/api/projects/route.ts` 和 `app/api/projects/[id]/route.ts`

- [x] Task 6: 作品 DNA 生成服务
  - [x] 6.1 创建 `lib/services/dna.service.ts`
  - [x] 6.2 实现从用户输入（类型、创意、目标字数等）调用 AI 生成完整作品 DNA
  - [x] 6.3 实现 DNA 的存储和更新
  - [x] 6.4 实现生成主角设定、世界观、主线、卷纲、前 30 章规划
  - [x] 6.5 实现生成前 5 章场景卡和第 1 章正文草稿
  - [x] 6.6 创建 `app/api/projects/[id]/dna/route.ts` 和 `app/api/projects/[id]/initialize/route.ts`

- [x] Task 7: 章节服务 (Chapter Service)
  - [x] 7.1 创建 `lib/services/chapter.service.ts`
  - [x] 7.2 实现章节 CRUD（创建、查询列表、查询详情、更新、删除）
  - [x] 7.3 实现章节树结构查询（按卷/篇章分组）
  - [x] 7.4 实现场景卡 CRUD
  - [x] 7.5 创建 `app/api/projects/[id]/chapters/route.ts` 和 `app/api/projects/[id]/chapters/[chapterId]/route.ts`

- [x] Task 8: 正史记忆库服务 (Memory Service)
  - [x] 8.1 创建 `lib/services/memory.service.ts`
  - [x] 8.2 实现正史写入（章节确认后批量写入人物/事件/伏笔/规则等变化）
  - [x] 8.3 实现正史召回（根据当前章节上下文，精准召回相关人物、伏笔、规则）
  - [x] 8.4 实现状态变化记录（state_diff 存储和查询）
  - [x] 8.5 实现版本管理（每条正史记录版本变更历史）

- [x] Task 9: 人物服务 (Character Service)
  - [x] 9.1 创建 `lib/services/character.service.ts`
  - [x] 9.2 实现人物 CRUD
  - [x] 9.3 实现人物关系管理（创建/更新关系）
  - [x] 9.4 实现人物出场记录查询
  - [x] 9.5 实现人物状态更新（来自状态抽取结果）
  - [x] 9.6 创建 `app/api/projects/[id]/characters/route.ts` 和 `app/api/projects/[id]/characters/[characterId]/route.ts`

- [x] Task 10: 伏笔服务 (Foreshadow Service)
  - [x] 10.1 创建 `lib/services/foreshadow.service.ts`
  - [x] 10.2 实现伏笔 CRUD
  - [x] 10.3 实现伏笔状态管理（状态机：未激活→已埋设→已提醒→已加深→部分回收→完整回收/废弃/冲突）
  - [x] 10.4 实现热度/紧急度评分计算
  - [x] 10.5 实现过期伏笔检测（超过预计回收区间）
  - [x] 10.6 创建 `app/api/projects/[id]/foreshadows/route.ts`

- [x] Task 11: 风格指纹服务 (Style Service)
  - [x] 11.1 创建 `lib/services/style.service.ts`
  - [x] 11.2 实现预设风格列表（冷峻升级流、轻松吐槽流、古典仙侠感等）
  - [x] 11.3 实现从样章提取风格指纹（调用 AI）
  - [x] 11.4 实现风格指纹存储和更新
  - [x] 11.5 实现 Style Drift Score 计算（对比章节文本与风格指纹）
  - [x] 11.6 创建 `app/api/projects/[id]/style/route.ts`

- [x] Task 12: 审稿服务 (Audit Service)
  - [x] 12.1 创建 `lib/services/audit.service.ts`
  - [x] 12.2 实现多维度一致性检查（设定、人物、时间线、伏笔、风格等）
  - [x] 12.3 实现质量评分计算（按 PRD 公式加权）
  - [x] 12.4 实现审稿报告生成（绿色/黄色/红色，风险列表，修改建议）
  - [x] 12.5 创建 `app/api/projects/[id]/chapters/[chapterId]/audit/route.ts`

## Phase 4: 核心生成流水线

- [x] Task 13: 章节生成流水线 (Orchestrator)
  - [x] 13.1 创建 `lib/orchestrator/context-builder.ts` - 构建 AI 输入上下文（作品DNA、当前目标、最近章节、活跃人物、未回收伏笔、世界规则、风格指纹）
  - [x] 13.2 创建 `lib/orchestrator/pipeline.ts` - 实现完整章节生成流程
  - [x] 13.3 实现步骤：读取状态 → Planner判断功能 → 生成目标 → 生成场景卡 → Writer生成正文 → 风格对齐 → 审稿 → 自动重写（<70分）→ 状态抽取 → 返回结果
  - [x] 13.4 创建 `lib/services/generation.service.ts` - 生成任务管理（创建/查询/取消）
  - [x] 13.5 实现 GenerationJob 记录（输入上下文、模型、输出、耗时、token 用量、成本、状态）
  - [x] 13.6 创建 `app/api/projects/[id]/generate/route.ts` - 触发生成
  - [x] 13.7 创建 `app/api/projects/[id]/generate/[jobId]/route.ts` - 查询生成状态
  - [x] 13.8 实现章节确认入库 API `app/api/projects/[id]/chapters/[chapterId]/confirm/route.ts`

- [x] Task 14: 规划服务 (Planning Service)
  - [x] 14.1 创建 `lib/services/planning.service.ts`
  - [x] 14.2 实现章节功能推荐逻辑（基于主线推进频率、伏笔状态、爽点密度、节奏等）
  - [x] 14.3 实现生成前 30 章规划（卷级规划）
  - [x] 14.4 创建 `app/api/projects/[id]/plan/route.ts`

## Phase 5: 前端页面与组件

- [x] Task 15: 前端布局与导航框架
  - [x] 15.1 创建全局布局：顶部导航栏（项目选择、设置入口）
  - [x] 15.2 创建作品级布局：左侧章节树 + 中间内容区 + 右侧状态面板 + 底部时间线
  - [x] 15.3 实现章节树组件（树形结构，可展开/折叠，显示状态标签）
  - [x] 15.4 实现右侧叙事状态面板组件骨架
  - [x] 15.5 创建 shadcn/ui 自定义主题配置（配色方案、字体等）

- [x] Task 16: 首页与作品创建向导
  - [x] 16.1 创建首页 `app/page.tsx` - 展示作品列表卡片（作品名、字数、章节、最近更新）
  - [x] 16.2 创建作品创建向导 `app/project/new/page.tsx` - 多步骤表单
  - [x] 16.3 步骤 1：选择类型、输入创意、目标字数、目标读者
  - [x] 16.4 步骤 2：选择预设风格或上传样章
  - [x] 16.5 步骤 3：AI 生成中加载动画（展示生成进度：DNA → 主角 → 世界观 → 大纲 → 场景卡 → 第1章）
  - [x] 16.6 步骤 4：审查生成结果（可编辑），确认后写入正史
  - [x] 16.7 创建 `app/api/projects/[id]/initialize/route.ts` 的流式响应支持（SSE）

- [x] Task 17: 作品驾驶舱
  - [x] 17.1 创建 `app/project/[id]/page.tsx` - 作品驾驶舱
  - [x] 17.2 实现状态概览卡片：作品名、字数、当前章节、当前卷
  - [x] 17.3 实现关键指标：主线进度条、质量均分、未回收伏笔数、高风险伏笔数
  - [x] 17.4 实现节奏曲线图（最近 10 章质量分趋势，使用 Recharts）
  - [x] 17.5 实现长期未出场角色提醒
  - [x] 17.6 实现今日推荐：下一章推荐功能 + 快捷操作按钮（生成下一章、检查风险）

- [x] Task 18: 小说编辑器
  - [x] 18.1 创建 `app/project/[id]/editor/[chapterId]/page.tsx`
  - [x] 18.2 集成 Tiptap 编辑器，配置中文支持和基础格式
  - [x] 18.3 实现右侧状态面板：本章目标、本章功能、出场人物、相关伏笔、审稿风险、质量评分、风格偏移
  - [x] 18.4 实现 AI 辅助工具栏：选中文本后弹出（改写/增强冲突/增强对白/增强画面/增强钩子/改风格）
  - [x] 18.5 实现全文操作栏：续写/扩写/压缩/保持剧情重写/保持风格重写
  - [x] 18.6 实现自动保存（防抖 2 秒）
  - [x] 18.7 实现"生成下一章"按钮（调用生成流水线，展示进度）
  - [x] 18.8 实现"确认入库"按钮

- [x] Task 19: 作品 Bible 页面
  - [x] 19.1 创建 `app/project/[id]/bible/page.tsx`
  - [x] 19.2 实现分 Tab 展示：DNA、主角、角色、世界观、组织、能力、地点、道具、禁忌、风格
  - [x] 19.3 实现各项内容的编辑表单
  - [x] 19.4 实现修改保存和受影响章节检查

- [x] Task 20: 人物库页面
  - [x] 20.1 创建 `app/project/[id]/characters/page.tsx`
  - [x] 20.2 实现人物列表（卡片/表格切换视图）
  - [x] 20.3 实现人物详情页（基础信息、目标、恐惧、秘密、底线、能力、关系图、出场记录）
  - [x] 20.4 实现人物关系图可视化（使用 SVG 或 canvas 绘制）
  - [x] 20.5 实现人物漂移检测入口

- [x] Task 21: 伏笔账本页面
  - [x] 21.1 创建 `app/project/[id]/foreshadows/page.tsx`
  - [x] 21.2 实现伏笔列表（表格视图，显示状态标签、热度、紧急度）
  - [x] 21.3 实现筛选：全部/即将回收/长期未出现/已回收/高风险/废弃候选
  - [x] 21.4 实现伏笔详情展开（表面含义、真实含义、关联角色、预计回收区间）
  - [x] 21.5 实现伏笔操作：加深/误导/部分回收/完整回收/推迟/废弃

- [x] Task 22: 审稿报告页面
  - [x] 22.1 创建 `app/project/[id]/audit/[chapterId]/page.tsx`
  - [x] 22.2 实现总分展示（大数字 + 颜色状态：绿/黄/红）
  - [x] 22.3 实现逐项评分条形图
  - [x] 22.4 实现风险列表（按严重度排序）
  - [x] 22.5 实现修改建议列表
  - [x] 22.6 实现"自动重写"入口按钮

- [x] Task 23: 设置页面
  - [x] 23.1 创建 `app/settings/page.tsx`
  - [x] 23.2 实现 AI 模型配置表单（API endpoint, API key, model name）
  - [x] 23.3 实现配置保存和连接测试
  - [x] 23.4 实现生成参数配置（默认每章字数、自动重写阈值等）

## Phase 6: 状态管理与全局状态

- [x] Task 24: Zustand 状态管理
  - [x] 24.1 创建 `stores/project.store.ts` - 当前项目状态
  - [x] 24.2 创建 `stores/chapter.store.ts` - 章节列表和当前章节状态
  - [x] 24.3 创建 `stores/editor.store.ts` - 编辑器状态（AI 操作状态、保存状态等）
  - [x] 24.4 创建 `stores/generation.store.ts` - 生成任务状态（进度、结果等）
  - [x] 24.5 实现 SSE 客户端连接（接收生成进度推送）

## Phase 7: 集成与联调

- [x] Task 25: 完整链路集成
  - [x] 25.1 串联创建作品 → 初始化 → 驾驶舱 → 编辑器 → 生成下一章 → 审稿 → 确认入库完整流程
  - [x] 25.2 验证章节生成后状态抽取正确写入人物/伏笔/事件
  - [x] 25.3 验证章节树实时更新
  - [x] 25.4 验证正史召回准确性
  - [x] 25.5 修复集成问题

- [x] Task 26: UI 打磨与响应式
  - [x] 26.1 优化整体视觉一致性（间距、颜色、字体层级）
  - [x] 26.2 实现加载状态和空状态设计
  - [x] 26.3 实现错误状态和 toast 提示
  - [x] 26.4 基础响应式适配（桌面端为主，平板端基本可用）

# Task Dependencies
- Task 1 是所有任务的前置
- Task 2 依赖 Task 1
- Task 3 依赖 Task 1
- Task 4 依赖 Task 3
- Task 5-12 依赖 Task 2, 3
- Task 13 依赖 Task 4, 5, 6, 7, 8, 9, 10, 11, 12
- Task 14 依赖 Task 4, 5
- Task 15-23 依赖 Task 5-12（API 路由就绪）
- Task 24 依赖 Task 15
- Task 25 依赖 Task 13, 14, 15-23
- Task 26 依赖 Task 25
- Task 2 与 Task 3 可并行
- Task 5 与 Task 6 可并行
- Task 7, 8, 9, 10, 11, 12 可并行
- Task 15, 16, 17, 18, 19, 20, 21, 22, 23 可并行
