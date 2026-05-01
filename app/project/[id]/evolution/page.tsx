"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Loader2, Brain, Zap, RefreshCw, Play,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Cpu,
  Activity, BarChart3, GitBranch, Sparkles, Target,
  Layers, Search, BookOpen, ArrowUpRight, ArrowDownRight,
  Minus, Eye, Lightbulb, FlaskConical, GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  overview: {
    cyclesCount: number;
    latestCycle: any;
    totalExecutions: number;
    avgScore: number;
    successRate: number;
    totalTokens: number;
    learningEpisodesCount: number;
    promptVersionsCount: number;
  };
  promptVersions: any[];
  executionLogs: any[];
  learningEpisodes: any[];
  agentPerformances: any[];
  pipelineExecutions: any[];
  learningRecords: any[];
  strategyStats: {
    score_driven: number;
    error_pattern: number;
    token_efficiency: number;
  };
  recentChapters: any[];
}

export default function EvolutionPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "working" | "learning" | "prompts">("overview");
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [cycles, setCycles] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, cRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/evolution/dashboard`),
        fetch(`/api/projects/${projectId}/evolution/cycles`),
      ]);
      if (dRes.ok) setDashboard(await dRes.json());
      if (cRes.ok) setCycles(await cRes.json());
    } catch {} finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runEvolution = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/evolution/run`, { method: "POST" });
      if (res.ok) fetchData();
    } catch {} finally { setRunning(false); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-600";
    if (score >= 6) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return "bg-emerald-50 border-emerald-200";
    if (score >= 6) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/project/${projectId}`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">自进化看板</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--cream)]"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={runEvolution}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "进化中..." : "运行进化"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : !dashboard ? (
          <div className="text-center py-24">
            <Brain className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-primary)] font-medium">暂无数据</p>
            <p className="text-sm text-[var(--text-muted)]">生成章节后自进化系统将自动记录</p>
          </div>
        ) : (
          <>
            {/* === OVERVIEW CARDS === */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)]">执行次数</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{dashboard.overview.totalExecutions}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">总生成记录</p>
              </div>
              <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)]">平均质量</span>
                </div>
                <p className={`text-2xl font-bold ${getScoreColor(dashboard.overview.avgScore)}`}>
                  {dashboard.overview.avgScore.toFixed(1)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">/ 10 分</p>
              </div>
              <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)]">成功率</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{dashboard.overview.successRate}%</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">通过质量检查</p>
              </div>
              <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)]">Token消耗</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {(dashboard.overview.totalTokens / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">累计使用</p>
              </div>
            </div>

            {/* === TABS === */}
            <div className="flex gap-2 mb-6">
              {([
                { key: "overview", label: "总览", icon: BarChart3 },
                { key: "working", label: "工作中", icon: Cpu },
                { key: "learning", label: "学习中", icon: GraduationCap },
                { key: "prompts", label: "提示词", icon: Sparkles },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 text-xs px-4 py-2 rounded border transition-colors ${
                    activeTab === tab.key
                      ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* === OVERVIEW TAB === */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Strategy Stats */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[var(--accent)]" />
                    进化策略触发统计
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded bg-[var(--cream)] text-center">
                      <p className="text-lg font-bold text-[var(--text-primary)]">{dashboard.strategyStats.score_driven}</p>
                      <p className="text-xs text-[var(--text-muted)]">分数驱动优化</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">低分自动修复</p>
                    </div>
                    <div className="p-3 rounded bg-[var(--cream)] text-center">
                      <p className="text-lg font-bold text-[var(--text-primary)]">{dashboard.strategyStats.error_pattern}</p>
                      <p className="text-xs text-[var(--text-muted)]">错误模式修复</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">针对性修复</p>
                    </div>
                    <div className="p-3 rounded bg-[var(--cream)] text-center">
                      <p className="text-lg font-bold text-[var(--text-primary)]">{dashboard.strategyStats.token_efficiency}</p>
                      <p className="text-xs text-[var(--text-muted)]">Token效率优化</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">压缩提示词</p>
                    </div>
                  </div>
                </div>

                {/* Recent Chapters Quality */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                    最近章节质量趋势
                  </h3>
                  {dashboard.recentChapters.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无章节数据</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.recentChapters.map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between p-3 rounded bg-[var(--cream)]">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[var(--text-muted)]">第{ch.chapterNumber}章</span>
                            <span className="text-sm text-[var(--text-primary)]">{ch.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(ch.qualityScore || 0)}%`,
                                  backgroundColor: (ch.qualityScore || 0) >= 80 ? "#10b981" : (ch.qualityScore || 0) >= 60 ? "#f59e0b" : "#ef4444",
                                }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${getScoreColor((ch.qualityScore || 0) / 10)}`}>
                              {ch.qualityScore?.toFixed(0) || "-"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Evolution Cycles */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--accent)]" />
                    进化周期历史
                  </h3>
                  {cycles.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无进化周期</p>
                  ) : (
                    <div className="space-y-3">
                      {cycles.slice(0, 5).map((cycle) => (
                        <div key={cycle.id} className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                          <div
                            className="p-3 cursor-pointer hover:bg-[var(--cream)] transition-colors"
                            onClick={() => setExpandedCycle(expandedCycle === cycle.id ? null : cycle.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  cycle.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  cycle.status === "failed" ? "bg-red-50 text-red-700 border-red-200" :
                                  "bg-blue-50 text-blue-700 border-blue-200"
                                }>
                                  {cycle.status === "completed" ? "已完成" : cycle.status === "failed" ? "失败" : cycle.status}
                                </Badge>
                                <span className="text-xs text-[var(--text-muted)]">#{cycle.cycleNumber}</span>
                              </div>
                              <span className="text-xs text-[var(--text-muted)]">
                                {new Date(cycle.startedAt).toLocaleString("zh-CN")}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              {[
                                { label: "观察", count: Array.isArray(cycle.observations) ? cycle.observations.length : 0, icon: Eye },
                                { label: "假设", count: Array.isArray(cycle.hypotheses) ? cycle.hypotheses.length : 0, icon: Lightbulb },
                                { label: "实验", count: Array.isArray(cycle.experiments) ? cycle.experiments.length : 0, icon: FlaskConical },
                                { label: "学习", count: Array.isArray(cycle.learnings) ? cycle.learnings.length : 0, icon: GraduationCap },
                              ].map((item) => (
                                <div key={item.label} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                  <item.icon className="w-3 h-3" />
                                  <span>{item.label}: {item.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {expandedCycle === cycle.id && (
                            <div className="border-t border-[var(--border-subtle)] p-3 bg-[var(--cream)]/30 space-y-3">
                              {Array.isArray(cycle.learnings) && cycle.learnings.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">学习记录</p>
                                  {cycle.learnings.map((learn: any, i: number) => (
                                    <div key={i} className="p-2 mb-1 rounded bg-white border border-[var(--border-subtle)] text-xs">
                                      <p className="font-medium text-[var(--text-primary)]">{learn.pattern}</p>
                                      <p className="text-[var(--text-muted)]">适用：{learn.applicability}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === WORKING TAB === */}
            {activeTab === "working" && (
              <div className="space-y-6">
                {/* Pipeline Executions */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent)]" />
                    流水线执行记录
                  </h3>
                  {dashboard.pipelineExecutions.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无执行记录</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.pipelineExecutions.map((exec) => (
                        <div key={exec.id} className="flex items-center justify-between p-3 rounded bg-[var(--cream)]">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={
                              exec.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" :
                              exec.status === "failed" ? "bg-red-50 text-red-700 border-red-200 text-[10px]" :
                              "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                            }>
                              {exec.status}
                            </Badge>
                            <span className="text-xs font-mono text-[var(--text-muted)]">{exec.templateId}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-[var(--text-muted)]">{(exec.duration / 1000).toFixed(1)}s</span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(exec.createdAt).toLocaleDateString("zh-CN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agent Performance */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[var(--accent)]" />
                    Agent 工作状态
                  </h3>
                  {dashboard.agentPerformances.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无 Agent 数据</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.agentPerformances.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between p-3 rounded bg-[var(--cream)]">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{agent.agentId}</p>
                            <p className="text-xs text-[var(--text-muted)]">完成 {agent.tasksCompleted} 个任务</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-sm font-bold ${getScoreColor(agent.avgScore)}`}>
                                {agent.avgScore?.toFixed(1) || "-"}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)]">平均分</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[var(--text-primary)]">
                                {((agent.errorRate || 0) * 100).toFixed(1)}%
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)]">错误率</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Execution Logs */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[var(--accent)]" />
                    最近执行日志
                  </h3>
                  {dashboard.executionLogs.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无日志</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.executionLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded bg-[var(--cream)]">
                          <div className="flex items-center gap-2">
                            {log.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-xs text-[var(--text-muted)]">
                              {log.success ? "成功" : log.errorType || "失败"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs font-bold ${getScoreColor(log.score)}`}>{log.score.toFixed(1)}</span>
                            <span className="text-xs text-[var(--text-muted)]">{log.tokensUsed} tokens</span>
                            <span className="text-xs text-[var(--text-muted)]">{(log.durationMs / 1000).toFixed(1)}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === LEARNING TAB === */}
            {activeTab === "learning" && (
              <div className="space-y-6">
                {/* Meta Learning Episodes */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[var(--accent)]" />
                    元学习样本
                  </h3>
                  {dashboard.learningEpisodes.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无学习样本</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.learningEpisodes.map((ep) => (
                        <div key={ep.id} className="flex items-center justify-between p-3 rounded bg-[var(--cream)]">
                          <div>
                            <p className="text-sm text-[var(--text-primary)]">{ep.taskType}</p>
                            <p className="text-xs text-[var(--text-muted)]">{ep.feedback || "无反馈"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${getScoreColor(ep.score)}`}>{ep.score.toFixed(1)}</span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(ep.createdAt).toLocaleDateString("zh-CN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Learning Records */}
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                    已应用的学习
                  </h3>
                  {dashboard.learningRecords.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无学习记录</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.learningRecords.map((record) => (
                        <div key={record.id} className="p-3 rounded bg-[var(--cream)]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{record.pattern}</p>
                            <Badge variant="outline" className={record.applied ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-gray-50 text-gray-700 border-gray-200 text-[10px]"}>
                              {record.applied ? "已应用" : "待应用"}
                            </Badge>
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">适用：{record.applicability}</p>
                          <p className="text-xs text-[var(--text-muted)]">置信度：{((record.confidence || 0) * 100).toFixed(0)}%</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === PROMPTS TAB === */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div className="bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    提示词版本进化
                  </h3>
                  {dashboard.promptVersions.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-8">暂无提示词版本</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.promptVersions.map((prompt) => (
                        <div key={prompt.id} className="border border-[var(--border-subtle)] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">{prompt.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">{prompt.taskType} · v{prompt.version}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-[10px]">
                                {prompt.usageCount || 0} 次使用
                              </Badge>
                              <span className={`text-sm font-bold ${getScoreColor(prompt.avgScore)}`}>
                                {prompt.avgScore?.toFixed(1) || "-"}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                            <span>成功率: {((prompt.successRate || 0) * 100).toFixed(0)}%</span>
                            <span>平均 Token: {prompt.avgTokens || 0}</span>
                            <span>创建: {new Date(prompt.createdAt).toLocaleDateString("zh-CN")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
