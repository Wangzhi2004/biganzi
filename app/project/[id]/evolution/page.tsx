"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Loader2, Brain, Zap, RefreshCw, Play,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Cpu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EvolutionPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [cycles, setCycles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"cycles" | "agents" | "prompts">("cycles");
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cRes, aRes, pRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/evolution/cycles`),
        fetch(`/api/projects/${projectId}/agents/status`),
        fetch(`/api/projects/${projectId}/prompts/versions`),
      ]);
      if (cRes.ok) setCycles(await cRes.json());
      if (aRes.ok) setAgents(await aRes.json());
      if (pRes.ok) setPrompts(await pRes.json());
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

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/project/${projectId}`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">自进化系统</h1>
            </div>
          </div>
          <button
            onClick={runEvolution}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "进化中..." : "运行一次进化"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {(["cycles", "agents", "prompts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-4 py-2 rounded border transition-colors ${
                activeTab === tab
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab === "cycles" ? "进化周期" : tab === "agents" ? "Agent 性能" : "提示词版本"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <>
            {activeTab === "cycles" && (
              <div className="space-y-3">
                {cycles.length === 0 ? (
                  <div className="text-center py-24">
                    <Brain className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-primary)] font-medium">暂无进化周期</p>
                    <p className="text-sm text-[var(--text-muted)]">点击「运行一次进化」开始</p>
                  </div>
                ) : cycles.map((cycle) => (
                  <div key={cycle.id} className="bg-white border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 cursor-pointer hover:bg-[var(--cream)] transition-colors" onClick={() => setExpandedCycle(expandedCycle === cycle.id ? null : cycle.id)}>
                      <div className="flex items-center justify-between mb-3">
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
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "观察", count: Array.isArray(cycle.observations) ? cycle.observations.length : 0, icon: "🔍" },
                          { label: "假设", count: Array.isArray(cycle.hypotheses) ? cycle.hypotheses.length : 0, icon: "💡" },
                          { label: "实验", count: Array.isArray(cycle.experiments) ? cycle.experiments.length : 0, icon: "🧪" },
                          { label: "学习", count: Array.isArray(cycle.learnings) ? cycle.learnings.length : 0, icon: "📚" },
                        ].map((item) => (
                          <div key={item.label} className="p-2 rounded bg-[var(--cream)] text-center">
                            <p className="text-lg">{item.icon}</p>
                            <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{item.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {expandedCycle === cycle.id && (
                      <div className="border-t border-[var(--border)] p-4 space-y-4 bg-[var(--cream)]/30">
                        {Array.isArray(cycle.experiments) && cycle.experiments.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">实验详情</p>
                            {cycle.experiments.map((exp: any, i: number) => (
                              <div key={i} className="p-2 mb-2 rounded bg-white border border-[var(--border-subtle)] text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={exp.success ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-red-50 text-red-700 border-red-200 text-[10px]"}>
                                    {exp.success ? "成功" : "失败"}
                                  </Badge>
                                  <span className="text-[var(--text-muted)]">{exp.type}</span>
                                </div>
                                {exp.result && <p className="text-[var(--text-muted)]">{JSON.stringify(exp.result).slice(0, 200)}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                        {Array.isArray(cycle.learnings) && cycle.learnings.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">学习记录</p>
                            {cycle.learnings.map((learn: any, i: number) => (
                              <div key={i} className="p-2 mb-2 rounded bg-white border border-[var(--border-subtle)] text-xs">
                                <p className="font-medium text-[var(--text-primary)]">{learn.pattern}</p>
                                <p className="text-[var(--text-muted)]">适用场景：{learn.applicability}</p>
                                <p className="text-[var(--text-muted)]">置信度：{((learn.confidence || 0) * 100).toFixed(0)}%</p>
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

            {activeTab === "agents" && (
              <div className="space-y-3">
                {agents.length === 0 ? (
                  <div className="text-center py-24">
                    <Cpu className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-primary)] font-medium">暂无 Agent 性能数据</p>
                    <p className="text-sm text-[var(--text-muted)]">运行进化周期后将自动记录</p>
                  </div>
                ) : agents.map((agent) => (
                  <div key={agent.id} className="bg-white border border-[var(--border)] rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{agent.agentId}</p>
                        <p className="text-xs text-[var(--text-muted)]">完成 {agent.tasksCompleted} 个任务</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: agent.avgScore >= 8 ? "var(--forest)" : agent.avgScore >= 6 ? "var(--ochre)" : "var(--rose)" }}>
                          {agent.avgScore?.toFixed(1) || "-"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">平均分</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "prompts" && (
              <div className="space-y-3">
                {prompts.length === 0 ? (
                  <div className="text-center py-24">
                    <Zap className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-primary)] font-medium">暂无提示词版本</p>
                    <p className="text-sm text-[var(--text-muted)]">系统将在生成过程中自动创建</p>
                  </div>
                ) : prompts.map((prompt) => (
                  <div key={prompt.id} className="bg-white border border-[var(--border)] rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{prompt.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{prompt.taskType} · v{prompt.version}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {prompt.usageCount || 0} 次使用
                        </Badge>
                        <span className="text-sm font-mono" style={{ color: (prompt.avgScore || 0) >= 8 ? "var(--forest)" : (prompt.avgScore || 0) >= 6 ? "var(--ochre)" : "var(--rose)" }}>
                          {prompt.avgScore?.toFixed(1) || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                      <span>成功率: {((prompt.successRate || 0) * 100).toFixed(0)}%</span>
                      <span>平均 Token: {prompt.avgTokens || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
