# Tasks

## Phase A: AI 透明度 — 数据层

- [ ] Task A1: 新增 AICallLog 数据模型并迁移
  - [ ] A1.1 在 `prisma/schema.prisma` 中新增 `AICallLog` 模型（id, jobId, projectId, stepName, stepOrder, model, messages Json, response String, promptTokens Int, completionTokens Int, durationMs Int, status enum(SUCCESS/FAILED), errorMessage String?, createdAt）
  - [ ] A1.2 建立与 GenerationJob 的关系（GenerationJob hasMany AICallLog）
  - [ ] A1.3 运行 `prisma migrate dev` 验证迁移

- [ ] Task A2: 改造 AI Gateway 支持持久化日志
  - [ ] A2.1 修改 `chatCompletion` 和 `jsonCompletion` 函数签名，新增可选参数 `logContext?: { jobId?: string; stepName?: string; stepOrder?: number; projectId?: string }`
  - [ ] A2.2 调用完成后（成功或失败），自动创建 AICallLog 记录
  - [ ] A2.3 保留原有 console.log 摘要日志

- [ ] Task A3: 改造生成管线记录步骤
  - [ ] A3.1 修改 `pipeline.ts` 的 `generateNextChapter` 函数，在每步 AI 调用时传入 stepName 和 stepOrder
  - [ ] A3.2 定义步骤名称常量：CHAPER_FUNCTION, CHAPTER_GOAL, SCENE_CARDS, CHAPTER_BODY, STYLE_DRIFT_CHECK, STYLE_ALIGN, AUDIT, REWRITE, STATE_DIFF
  - [ ] A3.3 修改 `initialize/route.ts` 中的 AI 调用，同样传入步骤信息（DNA_GENERATION, PROTAGONIST, WORLD_RULES, VOLUME_OUTLINE, CHAPTER_PLAN, SCENE_CARDS, FIRST_CHAPTER）

- [ ] Task A4: AI 调用日志 API
  - [ ] A4.1 创建 `app/api/projects/[id]/ai-logs/route.ts` — GET 查询项目下 AI 日志（支持 jobType 筛选、时间范围、分页）
  - [ ] A4.2 创建 `app/api/projects/[id]/generate/[jobId]/logs/route.ts` — GET 查询单个任务的 AI 调用链（按 stepOrder 排序）

## Phase B: AI 透明度 — 前端

- [ ] Task B1: AI 调用链展示组件
  - [ ] B1.1 创建 `components/ai/call-chain.tsx` — 竖向步骤列表，每步显示步骤名、模型、耗时、token、状态图标
  - [ ] B1.2 步骤可展开，显示完整 prompt（代码块格式）和 AI 回复（Markdown 渲染）
  - [ ] B1.3 创建 `components/ai/call-detail.tsx` — 单次调用详情面板（tabs: prompt | response | metadata）

- [ ] Task B2: 创建向导 AI 进度增强
  - [ ] B2.1 改造 `app/project/new/page.tsx` Step 3，通过轮询 `/api/projects/[id]/generate/[jobId]/logs` 获取真实步骤进度
  - [ ] B2.2 显示当前执行步骤名称、已完成步骤列表（带耗时）、总进度百分比
  - [ ] B2.3 每步完成后显示绿色对勾 + 耗时

- [ ] Task B3: 编辑器 AI 操作历史
  - [ ] B3.1 创建 `stores/history.store.ts` — 管理编辑器操作历史（内容快照列表）
  - [ ] B3.2 修改编辑器 `page.tsx`，每次 AI 操作前保存当前内容快照（时间戳 + 操作类型 + 内容）
  - [ ] B3.3 在编辑器右侧信息面板新增"AI 历史"Tab，展示操作列表
  - [ ] B3.4 点击历史条目可恢复到该版本
  - [ ] B3.5 新增 diff 对比视图，高亮两次版本之间的差异

- [ ] Task B4: 驾驶舱 AI 活动面板
  - [ ] B4.1 在驾驶舱页面新增"AI 活动"区域，展示最近的生成任务列表
  - [ ] B4.2 每个任务可展开查看 AI 调用链（复用 B1 组件）
  - [ ] B4.3 显示总 token 消耗和预估成本统计

## Phase C: UI 设计系统升级

- [ ] Task C1: 全局设计系统
  - [ ] C1.1 升级 `app/globals.css`：背景色从纯黑改为深灰渐变、新增 glow 效果类、增强过渡动画
  - [ ] C1.2 升级色彩变量：新增语义色（success/warning/error/info）、渐变主色
  - [ ] C1.3 新增 `components/ui/skeleton.tsx` — 骨架屏组件
  - [ ] C1.4 新增 `components/ui/empty-state.tsx` — 空状态组件（图标 + 标题 + 描述 + 操作按钮）

- [ ] Task C2: 首页 UI 优化
  - [ ] C2.1 优化作品卡片：微渐变背景、hover 发光边框、更丰富的信息展示
  - [ ] C2.2 优化创建按钮：渐变背景 + 发光效果
  - [ ] C2.3 添加页面标题区域的装饰元素

- [ ] Task C3: 驾驶舱 UI 优化
  - [ ] C3.1 优化统计卡片：渐变背景、图标发光、数字动画
  - [ ] C3.2 优化 Recharts 图表：渐变填充、更好的 tooltip 样式
  - [ ] C3.3 优化章节列表：交替行色、状态标签色彩、hover 效果
  - [ ] C3.4 优化快捷操作按钮组

- [ ] Task C4: 编辑器 UI 优化
  - [ ] C4.1 优化编辑器区域：更好的排版、段落间距、行高
  - [ ] C4.2 优化 AI 工具栏：按钮渐变、hover 发光、操作反馈动画
  - [ ] C4.3 优化右侧信息面板：更好的 Tab 样式、卡片分组
  - [ ] C4.4 优化保存状态指示器

- [ ] Task C5: 列表页面 UI 优化（人物库 + 伏笔账本）
  - [ ] C5.1 优化人物卡片：头像渐变边框、状态指示、hover 效果
  - [ ] C5.2 优化伏笔表格：行高亮、状态标签色彩、筛选标签样式
  - [ ] C5.3 优化搜索框和筛选器

- [ ] Task C6: 创建向导 UI 优化
  - [ ] C6.1 优化步骤指示器：渐变进度线、当前步骤发光
  - [ ] C6.2 优化风格选择卡片：选中态的渐变边框 + 发光
  - [ ] C6.3 优化 AI 生成进度展示

- [ ] Task C7: 设置页面和审计页面 UI 优化
  - [ ] C7.1 优化设置页面表单样式
  - [ ] C7.2 优化审计报告页面的评分展示和风险列表
  - [ ] C7.3 优化 Bible 页面的 Tab 和表单

- [ ] Task C8: 布局和导航优化
  - [ ] C8.1 优化项目布局 header：更好的导航样式、breadcrumb
  - [ ] C8.2 优化章节树组件：展开/折叠动画、选中态
  - [ ] C8.3 优化叙事面板：折叠动画、内容排版

# Task Dependencies
- A1 是 A2, A3, A4 的前置
- A2 是 A3 的前置
- A3 是 B2, B4 的前置
- A4 是 B1, B2, B4 的前置
- B1 是 B2, B4 的前置
- C1 是 C2-C8 的前置
- Phase A 和 Phase C 可并行
- Phase B 依赖 Phase A
- C2-C8 之间可并行
