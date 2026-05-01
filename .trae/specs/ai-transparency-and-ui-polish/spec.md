# AI 工作流透明度增强 & UI 全面优化

## Why

当前系统存在两个核心问题：
1. **AI 工作流黑箱化**：生成管线内部执行 7-11 次 AI 调用，但只有最终汇总数据存储在 GenerationJob 中。用户无法看到 AI 的决策过程、prompt 内容、中间结果，也无法回溯调试。
2. **UI 设计粗糙**：虽然功能完整，但界面缺乏视觉层次、交互反馈不足、设计细节不够精致，影响用户信任感和使用体验。

## What Changes

### AI 透明度
- 新增 `AICallLog` 数据库模型，记录每次 AI 调用的完整上下文
- 改造 `gateway.ts`，自动持久化每次调用
- 改造 `pipeline.ts`，记录每步中间结果
- 新增 AI 交互历史 UI 组件，展示调用链、prompt、response、token 消耗
- 新增编辑器 AI 操作历史（版本快照 + diff 对比）
- 改造创建向导，展示真实 AI 步骤进度

### UI 优化
- 统一设计系统：升级色彩方案、间距体系、排版层级
- 增强所有页面的视觉质量：卡片、表格、表单、按钮、标签
- 优化交互反馈：hover 状态、过渡动画、加载骨架屏
- 改善信息密度和可读性

## Impact

- Affected specs: `build-v1-serial-engine`（数据模型扩展、UI 层重构）
- Affected code: 
  - `prisma/schema.prisma` — 新增 AICallLog 模型
  - `lib/ai/gateway.ts` — 增加日志持久化
  - `lib/orchestrator/pipeline.ts` — 步骤级追踪
  - `app/globals.css` — 设计系统升级
  - 所有页面组件 — UI 优化
  - 所有 UI 组件 — 视觉升级
  - 新增 `components/ai/` — AI 交互历史组件

---

## ADDED Requirements

### Requirement: AI 调用日志持久化

系统 SHALL 将每次 AI API 调用的完整信息持久化到数据库。

#### Scenario: AI 调用被记录
- **WHEN** 任何 AI 函数（chatCompletion / jsonCompletion）被调用
- **THEN** 系统创建一条 AICallLog 记录，包含：jobId(关联的生成任务)、stepName(步骤名)、model、messages(完整 prompt)、response(完整回复)、promptTokens、completionTokens、durationMs、status(SUCCESS/FAILED)、errorMessage、createdAt

#### Scenario: 调用链可追踪
- **WHEN** 一次 GenerationJob 执行完成
- **THEN** 所有相关的 AICallLog 记录均可通过 jobId 查询，且按 stepOrder 排序

### Requirement: AI 交互历史展示

系统 SHALL 在工作区界面中提供 AI 交互历史的查看功能。

#### Scenario: 查看生成任务的 AI 调用链
- **WHEN** 用户在驾驶舱或编辑器中点击某个生成任务
- **THEN** 系统展示该任务下所有 AI 调用的步骤列表，每个步骤显示：步骤名、模型、耗时、token 用量、状态
- **AND** 用户可展开任意步骤查看完整 prompt 和 AI 回复

#### Scenario: 创建向导展示真实 AI 进度
- **WHEN** 用户在创建向导中触发 AI 生成
- **THEN** 系统实时展示当前 AI 执行步骤（如"正在生成主角设定..."、"正在构建世界观..."）
- **AND** 每步完成后显示该步骤的耗时和状态

#### Scenario: 编辑器 AI 操作历史
- **WHEN** 用户在编辑器中执行 AI 操作（续写/扩写/压缩/改写等）
- **THEN** 系统保存操作前的内容快照
- **AND** 用户可在侧边栏查看操作历史列表
- **AND** 用户可对比任意两次操作的内容差异

### Requirement: AI 交互历史 API

系统 SHALL 提供 AI 调用日志的查询 API。

#### Scenario: 查询项目 AI 调用记录
- **WHEN** 用户请求 `GET /api/projects/[id]/ai-logs`
- **THEN** 返回该项目下所有 AI 调用记录，支持按 jobType 和时间范围筛选，分页返回

#### Scenario: 查询单次生成任务的 AI 调用链
- **WHEN** 用户请求 `GET /api/projects/[id]/generate/[jobId]/logs`
- **THEN** 返回该任务下所有 AI 调用记录，按 stepOrder 排序

### Requirement: UI 设计系统升级

系统 SHALL 提供专业级的视觉设计体验。

#### Scenario: 统一色彩方案
- **WHEN** 用户访问任何页面
- **THEN** 页面使用统一的色彩体系：背景色（深灰渐变而非纯黑）、卡片（微渐变 + 柔和阴影）、主色调（indigo 到 purple 渐变）、文字层级（4 级灰度：标题/正文/次要/提示）

#### Scenario: 增强卡片和容器
- **WHEN** 用户查看任何卡片组件
- **THEN** 卡片具有微渐变背景、柔和的发光边框效果、hover 时的微妙提升动画

#### Scenario: 增强表格和列表
- **WHEN** 用户查看任何表格或列表
- **THEN** 行具有交替背景色、hover 高亮、选中状态的左侧色条指示

#### Scenario: 增强按钮和交互元素
- **WHEN** 用户与任何按钮交互
- **THEN** 按钮具有渐变背景、hover 时的发光效果、点击时的缩放反馈、禁用态的半透明效果

#### Scenario: 增强表单和输入
- **WHEN** 用户聚焦任何输入框
- **THEN** 输入框具有聚焦时的 glow 边框效果、label 浮动动画、错误态的红色边框 + 图标

#### Scenario: 增强加载状态
- **WHEN** 系统正在加载数据
- **THEN** 使用骨架屏（Skeleton）替代纯 Spinner，模拟实际内容布局

#### Scenario: 增强空状态
- **WHEN** 页面无数据时
- **THEN** 展示精心设计的空状态插图（使用 SVG 图标 + 渐变色）和引导操作按钮

---

## MODIFIED Requirements

### Requirement: AI Gateway 日志
原实现仅 console.log 一条摘要。修改为：每次调用自动创建 AICallLog 记录，同时保留 console.log。

### Requirement: 生成管线追踪
原实现仅保存最终结果。修改为：每步 AI 调用通过 jobId 关联，步骤名由 pipeline 定义。

### Requirement: 全局样式
原 globals.css 使用纯黑背景。修改为：使用深灰渐变背景、更丰富的色彩层次、更精致的动画效果。
