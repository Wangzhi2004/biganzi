import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";
import { jsonCompletion, type LogContext } from "@/lib/ai";

interface Agent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: "idle" | "working" | "error" | "evolving";
  currentTask?: string;
  performance: {
    tasksCompleted: number;
    avgScore: number;
    errorRate: number;
  };
  lastActive: Date;
}

interface Task {
  id: string;
  type: string;
  priority: number;
  data: any;
  status: "pending" | "assigned" | "completed" | "failed";
  assignedTo?: string;
  dependencies: string[];
  result?: any;
  createdAt: Date;
}

interface Collaboration {
  id: string;
  taskId: string;
  initiator: string;
  participants: string[];
  protocol: string;
  messages: CollaborationMessage[];
  consensus?: any;
  status: "active" | "resolved" | "stale";
}

interface CollaborationMessage {
  from: string;
  role: "propose" | "challenge" | "support" | "synthesize";
  content: string;
  timestamp: Date;
}

interface SwarmConfig {
  minAgents: number;
  maxAgents: number;
  consensusThreshold: number;
  timeoutMs: number;
}

export class SelfOrganizingSwarm extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private collaborations: Map<string, Collaboration> = new Map();
  private config: SwarmConfig;

  constructor(config: Partial<SwarmConfig> = {}) {
    super();
    this.config = {
      minAgents: 2,
      maxAgents: 5,
      consensusThreshold: 0.7,
      timeoutMs: 120000,
      ...config,
    };
  }

  async registerAgent(agent: Omit<Agent, "performance" | "lastActive">): Promise<Agent> {
    const fullAgent: Agent = {
      ...agent,
      performance: {
        tasksCompleted: 0,
        avgScore: 0,
        errorRate: 0,
      },
      lastActive: new Date(),
    };

    this.agents.set(agent.id, fullAgent);
    this.emit("agent:registered", fullAgent);
    return fullAgent;
  }

  async submitTask(task: Omit<Task, "status" | "createdAt">): Promise<Task> {
    const fullTask: Task = {
      ...task,
      status: "pending",
      createdAt: new Date(),
    };

    this.tasks.set(task.id, fullTask);
    this.emit("task:submitted", fullTask);

    await this.orchestrate();
    return fullTask;
  }

  private async orchestrate(): Promise<void> {
    const pendingTasks = Array.from(this.tasks.values())
      .filter((t) => t.status === "pending" && this.dependenciesMet(t));

    for (const task of pendingTasks) {
      const candidates = this.findCandidates(task);
      
      if (candidates.length === 0) {
        this.emit("task:unassigned", task);
        continue;
      }

      if (this.requiresCollaboration(task)) {
        await this.initiateCollaboration(task, candidates);
      } else {
        const bestAgent = this.selectBestAgent(candidates, task);
        await this.assignTask(task, bestAgent);
      }
    }
  }

  private dependenciesMet(task: Task): boolean {
    return task.dependencies.every((depId) => {
      const dep = this.tasks.get(depId);
      return dep?.status === "completed";
    });
  }

  private findCandidates(task: Task): Agent[] {
    return Array.from(this.agents.values()).filter(
      (agent) =>
        agent.status === "idle" &&
        task.type.split(",").some((cap) => agent.capabilities.includes(cap.trim()))
    );
  }

  private requiresCollaboration(task: Task): boolean {
    const complexity = this.assessComplexity(task);
    return complexity > 0.7 || task.type.includes("audit") || task.type.includes("plan");
  }

  private assessComplexity(task: Task): number {
    const factors = [
      task.data?.multiChapter ? 0.3 : 0,
      task.data?.characterCount > 5 ? 0.2 : 0,
      task.data?.requiresConsistency ? 0.2 : 0,
      task.priority > 8 ? 0.1 : 0,
      task.dependencies.length > 2 ? 0.2 : 0,
    ];
    return Math.min(factors.reduce((a, b) => a + b, 0), 1);
  }

  private selectBestAgent(candidates: Agent[], task: Task): Agent {
    return candidates.sort((a, b) => {
      const scoreA = this.calculateAgentScore(a, task);
      const scoreB = this.calculateAgentScore(b, task);
      return scoreB - scoreA;
    })[0];
  }

  private calculateAgentScore(agent: Agent, task: Task): number {
    const capabilityMatch = task.type
      .split(",")
      .filter((cap) => agent.capabilities.includes(cap.trim())).length;
    const performanceScore = agent.performance.avgScore * (1 - agent.performance.errorRate);
    const recencyPenalty = Math.min(
      (Date.now() - agent.lastActive.getTime()) / 3600000,
      10
    );

    return capabilityMatch * 0.4 + performanceScore * 0.4 + recencyPenalty * 0.02;
  }

  private async assignTask(task: Task, agent: Agent): Promise<void> {
    task.status = "assigned";
    task.assignedTo = agent.id;
    agent.status = "working";
    agent.currentTask = task.id;
    agent.lastActive = new Date();

    this.emit("task:assigned", { task, agent });
  }

  private async initiateCollaboration(task: Task, candidates: Agent[]): Promise<void> {
    const participants = candidates.slice(0, this.config.maxAgents);
    const collaborationId = `collab_${Date.now()}_${task.id}`;

    const collaboration: Collaboration = {
      id: collaborationId,
      taskId: task.id,
      initiator: participants[0].id,
      participants: participants.map((p) => p.id),
      protocol: this.determineProtocol(task),
      messages: [],
      status: "active",
    };

    this.collaborations.set(collaborationId, collaboration);
    this.emit("collaboration:started", collaboration);

    participants.forEach((p) => {
      p.status = "working";
      p.currentTask = task.id;
    });

    await this.runCollaborationProtocol(collaboration, task, participants);
  }

  private determineProtocol(task: Task): string {
    if (task.type.includes("audit")) return "peer_review";
    if (task.type.includes("plan")) return "deliberation";
    if (task.type.includes("write")) return "draft_competition";
    return "consensus";
  }

  private async runCollaborationProtocol(
    collaboration: Collaboration,
    task: Task,
    participants: Agent[]
  ): Promise<void> {
    switch (collaboration.protocol) {
      case "peer_review":
        await this.runPeerReview(collaboration, task, participants);
        break;
      case "deliberation":
        await this.runDeliberation(collaboration, task, participants);
        break;
      case "draft_competition":
        await this.runDraftCompetition(collaboration, task, participants);
        break;
      default:
        await this.runConsensus(collaboration, task, participants);
    }
  }

  private async runPeerReview(
    collaboration: Collaboration,
    task: Task,
    participants: Agent[]
  ): Promise<void> {
    const reviewer = participants[0];
    const validator = participants[1];

    const review = await this.agentExecute(reviewer, task);
    
    collaboration.messages.push({
      from: reviewer.id,
      role: "propose",
      content: JSON.stringify(review),
      timestamp: new Date(),
    });

    const validationTask = {
      ...task,
      data: { ...task.data, reviewResult: review },
    };
    const validation = await this.agentExecute(validator, validationTask);

    collaboration.messages.push({
      from: validator.id,
      role: "challenge",
      content: JSON.stringify(validation),
      timestamp: new Date(),
    });

    const consensus = await this.synthesizeConsensus(collaboration, task);
    collaboration.consensus = consensus;
    collaboration.status = "resolved";

    task.status = "completed";
    task.result = consensus;

    participants.forEach((p) => {
      p.status = "idle";
      p.currentTask = undefined;
      p.performance.tasksCompleted++;
    });

    this.emit("collaboration:resolved", collaboration);
    this.emit("task:completed", task);
  }

  private async runDeliberation(
    collaboration: Collaboration,
    task: Task,
    participants: Agent[]
  ): Promise<void> {
    const proposals = await Promise.all(
      participants.map((agent) => this.agentExecute(agent, task))
    );

    proposals.forEach((proposal, i) => {
      collaboration.messages.push({
        from: participants[i].id,
        role: "propose",
        content: JSON.stringify(proposal),
        timestamp: new Date(),
      });
    });

    const synthesis = await this.synthesizeDeliberation(collaboration, proposals, task);
    collaboration.consensus = synthesis;
    collaboration.status = "resolved";

    task.status = "completed";
    task.result = synthesis;

    participants.forEach((p) => {
      p.status = "idle";
      p.currentTask = undefined;
      p.performance.tasksCompleted++;
    });

    this.emit("collaboration:resolved", collaboration);
    this.emit("task:completed", task);
  }

  private async runDraftCompetition(
    collaboration: Collaboration,
    task: Task,
    participants: Agent[]
  ): Promise<void> {
    const drafts = await Promise.all(
      participants.map((agent) => this.agentExecute(agent, task))
    );

    drafts.forEach((draft, i) => {
      collaboration.messages.push({
        from: participants[i].id,
        role: "propose",
        content: JSON.stringify(draft).slice(0, 500),
        timestamp: new Date(),
      });
    });

    const judgeTask = {
      ...task,
      data: { ...task.data, drafts },
    };

    const winner = await this.selectBestDraft(judgeTask, drafts);
    collaboration.consensus = winner;
    collaboration.status = "resolved";

    task.status = "completed";
    task.result = winner;

    participants.forEach((p) => {
      p.status = "idle";
      p.currentTask = undefined;
      p.performance.tasksCompleted++;
    });

    this.emit("collaboration:resolved", collaboration);
    this.emit("task:completed", task);
  }

  private async runConsensus(
    collaboration: Collaboration,
    task: Task,
    participants: Agent[]
  ): Promise<void> {
    const responses = await Promise.all(
      participants.map((agent) => this.agentExecute(agent, task))
    );

    const consensus = await this.voteConsensus(responses);
    collaboration.consensus = consensus;
    collaboration.status = "resolved";

    task.status = "completed";
    task.result = consensus;

    participants.forEach((p) => {
      p.status = "idle";
      p.currentTask = undefined;
      p.performance.tasksCompleted++;
    });

    this.emit("collaboration:resolved", collaboration);
    this.emit("task:completed", task);
  }

  private async agentExecute(agent: Agent, task: Task): Promise<any> {
    const prompt = this.buildAgentPrompt(agent, task);
    const { data } = await jsonCompletion(prompt);
    return data;
  }

  private buildAgentPrompt(
    agent: Agent,
    task: Task
  ): Array<{ role: "system" | "user"; content: string }> {
    return [
      {
        role: "system",
        content: `你是 ${agent.name}，一个 ${agent.role}。
        你的能力：${agent.capabilities.join(", ")}。
        请基于你的专业角度完成任务。`,
      },
      {
        role: "user",
        content: `任务类型：${task.type}\n任务数据：${JSON.stringify(task.data)}`,
      },
    ];
  }

  private async synthesizeConsensus(
    collaboration: Collaboration,
    task: Task
  ): Promise<any> {
    const messages = collaboration.messages.map((m) => `${m.from}: ${m.content}`).join("\n");
    
    const { data } = await jsonCompletion([
      {
        role: "system",
        content: "你是一个共识合成器。基于多方意见，提取共同点和最佳方案。",
      },
      {
        role: "user",
        content: `任务：${task.type}\n\n讨论记录：\n${messages}\n\n请合成最终共识方案。`,
      },
    ]);

    return data;
  }

  private async synthesizeDeliberation(
    collaboration: Collaboration,
    proposals: any[],
    task: Task
  ): Promise<any> {
    const { data } = await jsonCompletion([
      {
        role: "system",
        content: "你是一个方案合成器。综合多个提案的优点，生成最优方案。",
      },
      {
        role: "user",
        content: `任务：${task.type}\n\n提案：\n${JSON.stringify(proposals)}\n\n请合成最优方案。`,
      },
    ]);

    return data;
  }

  private async selectBestDraft(task: Task, drafts: any[]): Promise<any> {
    const { data } = await jsonCompletion([
      {
        role: "system",
        content: "你是一个评审专家。从多个草稿中选择最佳方案，并说明理由。",
      },
      {
        role: "user",
        content: `任务：${task.type}\n\n草稿：\n${JSON.stringify(drafts.map((d, i) => ({ index: i, content: d })))}\n\n请选择最佳方案。`,
      },
    ]);

    return data.selectedDraft || drafts[0];
  }

  private async voteConsensus(responses: any[]): Promise<any> {
    const { data } = await jsonCompletion([
      {
        role: "system",
        content: "基于多方回应，找出最大共识。",
      },
      {
        role: "user",
        content: `回应：\n${JSON.stringify(responses)}\n\n请提取共识。`,
      },
    ]);

    return data;
  }

  getAgentStatus(): Agent[] {
    return Array.from(this.agents.values());
  }

  getTaskStatus(): Task[] {
    return Array.from(this.tasks.values());
  }

  getCollaborations(): Collaboration[] {
    return Array.from(this.collaborations.values());
  }

  async updateAgentPerformance(agentId: string, score: number, success: boolean): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const totalTasks = agent.performance.tasksCompleted + 1;
    agent.performance.avgScore =
      (agent.performance.avgScore * agent.performance.tasksCompleted + score) / totalTasks;
    agent.performance.errorRate = success
      ? agent.performance.errorRate * 0.95
      : (agent.performance.errorRate * totalTasks + 1) / totalTasks;

    await prisma.agentPerformance.upsert({
      where: { agentId },
      create: {
        agentId,
        tasksCompleted: totalTasks,
        avgScore: agent.performance.avgScore,
        errorRate: agent.performance.errorRate,
      },
      update: {
        tasksCompleted: totalTasks,
        avgScore: agent.performance.avgScore,
        errorRate: agent.performance.errorRate,
      },
    });
  }
}
