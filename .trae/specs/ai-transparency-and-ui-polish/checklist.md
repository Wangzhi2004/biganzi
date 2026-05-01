# 验证清单 - AI 透明度 & UI 优化

## 一、AI 调用日志持久化

- [ ] `prisma/schema.prisma` 包含 `AICallLog` 模型，字段完整（jobId, projectId, stepName, stepOrder, model, messages, response, promptTokens, completionTokens, durationMs, status, errorMessage, createdAt）
- [ ] AICallLog 与 GenerationJob 建立正确的关系（GenerationJob hasMany AICallLog）
- [ ] `prisma migrate dev` 迁移成功，无数据丢失
- [ ] `lib/ai/gateway.ts` 的 `chatCompletion` 和 `jsonCompletion` 支持 `logContext` 参数
- [ ] AI 调用成功时自动创建 AICallLog 记录（status=SUCCESS）
- [ ] AI 调用失败时自动创建 AICallLog 记录（status=FAILED，含 errorMessage）
- [ ] 原有 console.log 摘要日志仍然保留

## 二、生成管线步骤追踪

- [ ] `pipeline.ts` 中每步 AI 调用传入正确的 stepName 和 stepOrder
- [ ] 步骤名称常量定义完整（CHAPER_FUNCTION, CHAPTER_GOAL, SCENE_CARDS, CHAPTER_BODY, STYLE_DRIFT_CHECK, STYLE_ALIGN, AUDIT, REWRITE, STATE_DIFF）
- [ ] `initialize/route.ts` 中 AI 调用同样传入步骤信息
- [ ] 一次 GenerationJob 完成后，可通过 jobId 查询所有相关 AICallLog 记录
- [ ] AICallLog 记录按 stepOrder 正确排序

## 三、AI 调用日志 API

- [ ] `GET /api/projects/[id]/ai-logs` 返回项目下 AI 日志列表
- [ ] 支持 jobType 筛选参数
- [ ] 支持时间范围筛选参数
- [ ] 支持分页（offset/limit）
- [ ] `GET /api/projects/[id]/generate/[jobId]/logs` 返回单任务 AI 调用链
- [ ] 调用链按 stepOrder 排序

## 四、AI 交互历史 UI

- [ ] `components/ai/call-chain.tsx` 展示竖向步骤列表
- [ ] 每步显示：步骤名、模型、耗时、token 用量、状态图标（成功/失败）
- [ ] 步骤可展开查看完整 prompt（代码块格式）和 AI 回复
- [ ] `components/ai/call-detail.tsx` 提供 prompt/response/metadata 三个 Tab
- [ ] 创建向导 Step 3 展示真实 AI 步骤进度（非模拟进度条）
- [ ] 编辑器 AI 操作前保存内容快照
- [ ] 编辑器右侧面板新增"AI 历史"Tab
- [ ] 历史条目可恢复到对应版本
- [ ] 支持两个版本之间的 diff 对比
- [ ] 驾驶舱展示最近 AI 活动列表
- [ ] AI 活动可展开查看调用链

## 五、UI 设计系统

- [ ] `globals.css` 背景色从纯黑改为深灰渐变
- [ ] 新增 glow 效果 CSS 类（glow-border, glow-text 等）
- [ ] 新增 `components/ui/skeleton.tsx` 骨架屏组件
- [ ] 新增 `components/ui/empty-state.tsx` 空状态组件
- [ ] 色彩方案包含语义色（success/warning/error/info）
- [ ] 渐变主色（indigo → purple）应用于关键元素

## 六、首页 UI

- [ ] 作品卡片具有微渐变背景和 hover 发光边框
- [ ] 创建按钮具有渐变背景和发光效果
- [ ] 页面标题区域有装饰元素

## 七、驾驶舱 UI

- [ ] 统计卡片具有渐变背景和图标发光
- [ ] Recharts 图表使用渐变填充
- [ ] 章节列表有交替行色和 hover 效果
- [ ] 快捷操作按钮组样式优化

## 八、编辑器 UI

- [ ] 编辑器区域排版优化（段落间距、行高）
- [ ] AI 工具栏按钮有渐变和 hover 发光效果
- [ ] 右侧面板 Tab 样式优化
- [ ] 保存状态指示器样式优化

## 九、列表页面 UI

- [ ] 人物卡片有渐变边框和 hover 效果
- [ ] 伏笔表格有行高亮和状态标签色彩
- [ ] 搜索框和筛选器样式优化

## 十、创建向导 UI

- [ ] 步骤指示器有渐变进度线和当前步骤发光
- [ ] 风格选择卡片选中态有渐变边框 + 发光
- [ ] AI 生成进度展示优化

## 十一、其他页面 UI

- [ ] 设置页面表单样式优化
- [ ] 审计报告页面评分展示和风险列表优化
- [ ] Bible 页面 Tab 和表单优化

## 十二、布局和导航

- [ ] 项目布局 header 导航样式优化
- [ ] 章节树组件展开/折叠动画和选中态优化
- [ ] 叙事面板折叠动画和内容排版优化

## 十三、构建验证

- [ ] `npm run build` 编译通过，零 TypeScript 错误
- [ ] 所有新增 API 路由在构建输出中可见
- [ ] 无运行时错误
