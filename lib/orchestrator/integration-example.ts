import { SelfOrganizingSwarm } from "./self-organization";
import { AdaptivePipeline } from "./adaptive-pipeline";
import { MetaLearner } from "./meta-learner";
import { SelfEvolutionEngine } from "./self-evolution-engine";
import { selfEvolution } from "./self-evolution";

/**
 * 自进化Agent系统集成示例
 * 
 * 展示如何将自组织、自适应流水线、元学习和自进化引擎
 * 集成到现有的章节生成流程中。
 */

export async function initializeSelfEvolvingSystem() {
  // 1. 初始化自组织Swarm
  const swarm = new SelfOrganizingSwarm({
    minAgents: 2,
    maxAgents: 5,
    consensusThreshold: 0.7,
    timeoutMs: 120000,
  });

  // 注册核心Agent角色
  await swarm.registerAgent({
    id: "planner_agent",
    name: "规划Agent",
    role: "负责章节规划、功能选择、场景卡生成",
    capabilities: ["planning", "chapter_function", "scene_cards", "goal_generation"],
    status: "idle",
  });

  await swarm.registerAgent({
    id: "writer_agent",
    name: "写作Agent",
    role: "负责正文生成、风格对齐、改写",
    capabilities: ["writing", "style_align", "rewrite", "dialogue_enhance"],
    status: "idle",
  });

  await swarm.registerAgent({
    id: "auditor_agent",
    name: "审稿Agent",
    role: "负责一致性检查、节奏检查、质量评分",
    capabilities: ["audit", "consistency_check", "pacing_check", "quality_score"],
    status: "idle",
  });

  await swarm.registerAgent({
    id: "extractor_agent",
    name: "抽取Agent",
    role: "负责状态抽取、摘要生成、实体识别",
    capabilities: ["extract", "state_diff", "summary", "entity_recognition"],
    status: "idle",
  });

  // 2. 初始化自适应流水线
  const pipeline = new AdaptivePipeline(swarm);

  // 3. 初始化元学习器
  const metaLearner = new MetaLearner();

  // 4. 初始化自进化引擎
  const evolutionEngine = new SelfEvolutionEngine(swarm, pipeline, metaLearner);

  // 5. 启动进化循环（每小时一次）
  evolutionEngine.startEvolutionLoop(3600000);

  // 监听进化事件
  evolutionEngine.on("cycle:completed", (cycle) => {
    console.log(`[System] 进化周期完成: #${cycle.cycleNumber}, 学习数: ${cycle.learnings.length}`);
  });

  evolutionEngine.on("learning:applied", (learning) => {
    console.log(`[System] 应用新学习: ${learning.pattern}`);
  });

  return {
    swarm,
    pipeline,
    metaLearner,
    evolutionEngine,
  };
}

/**
 * 使用自适应流水线生成章节
 */
export async function generateChapterWithSelfEvolution(
  projectId: string,
  system: Awaited<ReturnType<typeof initializeSelfEvolvingSystem>>
) {
  const { pipeline, metaLearner, evolutionEngine } = system;

  // 获取项目历史学习
  const recommendations = await metaLearner.getRecommendations(projectId, {
    genre: "东方玄幻",
    chapterFunction: "main_plot",
  });

  console.log("[Generate] 历史推荐:", recommendations);

  // 执行自适应流水线
  const result = await pipeline.executePipeline(
    "chapter_generation",
    projectId,
    {
      genre: "东方玄幻",
      useMultiDraft: true,
      recommendations,
    }
  );

  // 记录学习episode
  await metaLearner.recordEpisode({
    projectId,
    taskType: "chapter_generation",
    input: result.variables,
    expectedOutput: { qualityScore: 85 },
    actualOutput: { qualityScore: result.stageResults["multi_audit"]?.qualityScore },
    score: result.stageResults["multi_audit"]?.qualityScore || 0,
    feedback: result.metrics.errorCount > 0 ? "存在执行错误" : undefined,
  });

  // 触发进化检查
  if (result.metrics.errorCount > 0 || result.stageResults["multi_audit"]?.qualityScore < 70) {
    await evolutionEngine.runEvolutionCycle(projectId);
  }

  return result;
}

/**
 * 提示词自进化示例
 */
export async function evolvePromptsAutomatically(
  taskType: string,
  role: string
) {
  // 获取当前最佳版本
  const currentBest = await selfEvolution.getBestPromptVersion(taskType, role);
  
  if (!currentBest) {
    console.log("[Evolve] 无现有提示词版本");
    return null;
  }

  console.log(`[Evolve] 当前最佳版本: v${currentBest.version}, 平均分: ${currentBest.performance.avgScore}`);

  // 尝试进化
  const evolved = await selfEvolution.evolvePrompt(currentBest.id);
  
  if (evolved) {
    console.log(`[Evolve] 生成新版本: v${evolved.version}`);
    console.log(`[Evolve] 变更: ${evolved.mutations.slice(-1)[0]?.change}`);
    return evolved;
  }

  console.log("[Evolve] 当前版本无需进化");
  return currentBest;
}

/**
 * 多Agent协作审稿示例
 */
export async function collaborativeAudit(
  chapterContent: string,
  system: Awaited<ReturnType<typeof initializeSelfEvolvingSystem>>
) {
  const { swarm } = system;

  // 提交协作审稿任务
  const auditTask = await swarm.submitTask({
    id: `audit_${Date.now()}`,
    type: "audit,consistency_check,pacing_check",
    priority: 8,
    data: {
      chapterContent,
      checkTypes: ["consistency", "pacing", "style"],
    },
    dependencies: [],
  });

  return new Promise((resolve) => {
    swarm.once("task:completed", (task) => {
      if (task.id === auditTask.id) {
        resolve(task.result);
      }
    });
  });
}

/**
 * 系统健康监控
 */
export function startSystemMonitoring(
  system: Awaited<ReturnType<typeof initializeSelfEvolvingSystem>>
) {
  const { swarm, pipeline, evolutionEngine } = system;

  setInterval(() => {
    const agents = swarm.getAgentStatus();
    const tasks = swarm.getTaskStatus();
    const cycles = evolutionEngine.getActiveCycles();

    console.log("[Monitor] === 系统状态 ===");
    console.log(`[Monitor] Agent状态: ${agents.map(a => `${a.name}(${a.status})`).join(", ")}`);
    console.log(`[Monitor] 待处理任务: ${tasks.filter(t => t.status === "pending").length}`);
    console.log(`[Monitor] 活跃进化周期: ${cycles.length}`);
  }, 30000);
}
