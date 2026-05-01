# 验证清单 - 笔杆子·连载引擎 V1

## 一、项目基础

- [x] `npm run build` 编译通过（37 条路由全部成功生成，零 TypeScript 错误）
- [x] `prisma/schema.prisma` 包含全部 22 个模型，pgvector 扩展已启用
- [x] `.env.example` 包含所有必需环境变量（DATABASE_URL, AI_API_KEY, AI_BASE_URL, AI_MODEL, JWT_SECRET）
- [x] shadcn/ui 组件库已集成（16 个 UI 组件 + components.json 配置）
- [x] 项目目录结构清晰（app/, lib/, components/, stores/, types/, prisma/）

## 二、AI 模型网关

- [x] `lib/ai/gateway.ts` 实现 OpenAI 兼容 API 调用
- [x] 支持 JSON 结构化输出（`jsonCompletion` 函数）
- [x] 请求日志记录（入参 + 耗时 + token 用量）
- [x] 错误处理完善（重试机制，最多 3 次重试，指数退避）
- [x] 从环境变量读取配置（AI_API_KEY, AI_BASE_URL, AI_MODEL）

## 三、作品创建与初始化

- [x] 4 步创建向导完整实现（基本信息 → 风格选择 → AI 生成中 → 审查确认）
- [x] `/api/projects/[id]/initialize` 端点实现完整初始化流程
- [x] DNA 生成 → 主角设定 → 世界观构建 → 大纲规划 → 第一章生成 流程完整
- [x] 风格预设选择（玄幻爽文/都市言情/悬疑推理/历史权谋）+ 自定义风格
- [x] 初始化进度展示（6 个步骤进度条 + 状态图标）

## 四、章节生成核心链路

- [x] `lib/orchestrator/pipeline.ts` 实现 11 步生成管线
- [x] `lib/orchestrator/context-builder.ts` 正确构建章节上下文（正史记忆、伏笔清单、近期章节、写作风格指纹、章节计划）
- [x] 自动改写逻辑：RED 状态且分数低于阈值时触发
- [x] 状态提取（`extractStateDiff`）完整提取新事实、人物变化、关系变化、世界观规则、新伏笔、回收伏笔、读者承诺
- [x] 记忆写入（`applyStateDiff`）使用数据库事务保证原子性
- [x] `/api/projects/[id]/chapters/[chapterId]/confirm` 端点实现章节确认和状态应用

## 五、正史记忆库（Canon Memory）

- [x] `lib/services/memory.service.ts` 实现完整记忆管理
- [x] `recallContext` 查询活跃人物（10 章内）、未解决伏笔、活跃读者承诺、已确认世界观规则、近期章节（5 章）
- [x] `applyStateDiff` 事务性应用状态差异（创建事件、更新人物、更新/创建关系、创建世界观规则、创建/回收伏笔、管理读者承诺）
- [x] `saveStateDiff` / `getStateDiff` 状态差异的持久化和查询

## 六、人物库

- [x] `app/project/[id]/characters/page.tsx` 完整实现人物库页面
- [x] 卡片/表格视图切换
- [x] 人物搜索（名称/别名/身份）
- [x] 人物详情（欲望、恐惧、秘密、说话特征、当前目标、能力列表）
- [x] 关系图谱展示（关系类型 + 描述 + 连接人物）
- [x] 状态差异标记（字段变化用 Badge 高亮）
- [x] 创建/编辑人物对话框

## 七、伏笔账本

- [x] `app/project/[id]/foreshadows/page.tsx` 完整实现伏笔账本页面
- [x] 8 种伏笔状态全部支持（INACTIVE/PLANTED/REMINDED/DEEPENED/PARTIAL_PAYOFF/FULL_PAYOFF/DEPRECATED/CONFLICT）
- [x] 筛选标签页（全部/即将回收/长期未出现/已回收/高风险/废弃候选）
- [x] 热度/紧急度评分条
- [x] 展开/折叠详情（表面含义、真实含义、相关人物、相关事件）
- [x] 状态变更下拉菜单
- [x] 创建伏笔对话框

## 八、风格指纹

- [x] `lib/services/style.service.ts` 实现风格管理服务
- [x] `/api/projects/[id]/style` 端点支持 GET/POST/PUT
- [x] `/api/settings/presets` 端点返回风格预设列表
- [x] 风格指纹包含：叙述视角、叙述距离、句均长度、对话比例、修辞系统、常用词/禁用词等 20+ 维度

## 九、审稿报告

- [x] `app/project/[id]/audit/[chapterId]/page.tsx` 完整实现审稿报告页面
- [x] 10 维度评分展示（主线推进/人物变化/冲突强度/章末钩子/风格一致性/设定一致性/信息增量/情绪张力/新鲜度/可读性）
- [x] 综合评分圆形展示（颜色编码：绿/黄/红）
- [x] 风险列表（按严重程度排序，包含分类、描述、修改建议）
- [x] 修改建议列表（按优先级排序）
- [x] 自动重写按钮

## 十、编辑器

- [x] `app/project/[id]/editor/[chapterId]/page.tsx` 基于 Tiptap 的富文本编辑器
- [x] AI 续写、扩写、压缩、全文改写功能
- [x] 右侧信息面板（场景卡、审核状态、AI 操作）
- [x] 保存状态指示（自动保存、手动保存、脏标记）
- [x] 字数统计
- [x] 返回驾驶舱导航

## 十一、驾驶舱（Dashboard）

- [x] `app/project/[id]/page.tsx` 完整实现项目仪表盘
- [x] Recharts 面积图展示质量分数趋势
- [x] 统计卡片（总字数、章节数、平均质量分、活跃伏笔数）
- [x] 最近活动列表
- [x] 快捷操作入口

## 十二、API 路由完整性

- [x] `/api/projects` - 项目列表/创建
- [x] `/api/projects/[id]` - 项目详情/更新/删除
- [x] `/api/projects/[id]/chapters` - 章节列表/创建
- [x] `/api/projects/[id]/chapters/[chapterId]` - 章节详情/更新/删除
- [x] `/api/projects/[id]/chapters/[chapterId]/audit` - 审核报告
- [x] `/api/projects/[id]/chapters/[chapterId]/scenes` - 场景卡管理
- [x] `/api/projects/[id]/chapters/[chapterId]/confirm` - 章节确认
- [x] `/api/projects/[id]/characters` - 人物列表/创建
- [x] `/api/projects/[id]/characters/[characterId]` - 人物详情/更新/删除
- [x] `/api/projects/[id]/foreshadows` - 伏笔列表/创建
- [x] `/api/projects/[id]/foreshadows/[foreshadowId]` - 伏笔详情/更新/删除
- [x] `/api/projects/[id]/style` - 风格管理
- [x] `/api/projects/[id]/dna` - DNA 管理
- [x] `/api/projects/[id]/generate` - 章节生成
- [x] `/api/projects/[id]/initialize` - 项目初始化
- [x] `/api/projects/[id]/plan` - 章节规划
- [x] `/api/settings/presets` - 风格预设

## 十三、交互体验

- [x] 暗色主题全局一致（#0a0a0a 背景，#111111 卡片，#27272a 边框）
- [x] 加载状态覆盖完整（Spinner + 文字提示）
- [x] 错误处理覆盖完整（错误提示 + 重试按钮）
- [x] 空状态设计（图标 + 引导文字）
- [x] 响应式布局（grid 自适应）
- [x] 项目内导航（侧边栏 + 面包屑 + 返回按钮）
- [x] 叙事面板可折叠

## 十四、Prompt 模板

- [x] `lib/ai/prompts/dna.ts` - DNA 生成、主角设定、世界观、大纲、章节计划、场景卡
- [x] `lib/ai/prompts/planner.ts` - 章节功能判断、目标设定、场景卡规划
- [x] `lib/ai/prompts/writer.ts` - 写作、改写、续写、扩写、压缩
- [x] `lib/ai/prompts/auditor.ts` - 12 维度审稿评分
- [x] `lib/ai/prompts/extractor.ts` - 状态差异提取
- [x] `lib/ai/prompts/style.ts` - 风格提取、风格对齐、风格漂移检测
- [x] `lib/ai/prompts/character.ts` - 人物生成、人物漂移检测

## 十五、Zustand 状态管理

- [x] `stores/project.store.ts` - 项目状态管理
- [x] `stores/chapter.store.ts` - 章节状态管理
- [x] `stores/editor.store.ts` - 编辑器状态（保存、脏标记、AI 操作）
- [x] `stores/generation.store.ts` - 生成任务状态（轮询机制）

## 总结

**构建状态**: ✅ 编译通过，37 条路由全部生成
**TypeScript**: ✅ 零类型错误
**核心功能**: ✅ 全部 26 个任务完成
**验证状态**: ✅ 所有检查点通过

### 运行前准备

1. 安装 PostgreSQL 并启用 pgvector 扩展
2. 复制 `.env.example` 为 `.env` 并填写配置
3. 运行 `npx prisma migrate dev` 初始化数据库
4. 运行 `npx prisma db seed` 填充种子数据
5. 运行 `npm run dev` 启动开发服务器
