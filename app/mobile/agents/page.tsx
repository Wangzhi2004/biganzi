"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Activity, Cpu, Brain, TrendingUp, AlertTriangle } from "lucide-react";

interface Agent {
  id: string;
  tasksCompleted: number;
  avgScore: number;
  errorRate: number;
  updatedAt: string;
}

interface Cycle {
  id: string;
  projectId: string;
  cycleNumber: number;
  status: string;
  observations: number;
  hypotheses: number;
  experiments: number;
  learnings: number;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"agents" | "cycles">("agents");

  useEffect(() => {
    fetch("/api/mobile/agents")
      .then((r) => r.json())
      .then((d) => {
        setAgents(d.agents || []);
        setCycles(d.recentCycles || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
        <a href="/mobile" style={{ color: "var(--text-muted)" }}><ChevronLeft style={{ width: 20, height: 20 }} /></a>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Agent 管理</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, margin: "12px 0", borderBottom: "1px solid var(--border)" }}>
        {(["agents", "cycles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0", background: "none", border: "none",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t ? "var(--accent)" : "var(--text-muted)",
              fontSize: 14, fontWeight: tab === t ? 600 : 400, cursor: "pointer",
            }}
          >
            {t === "agents" ? "Agent 状态" : "进化周期"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 style={{ width: 24, height: 24, color: "var(--accent)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <>
          {tab === "agents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {agents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                  <Cpu style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.5 }} />
                  <p style={{ fontSize: 14 }}>暂无 Agent 数据</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>运行进化周期后将自动记录</p>
                </div>
              ) : agents.map((agent) => (
                <div key={agent.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Cpu style={{ width: 16, height: 16, color: "var(--accent)" }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>{agent.id}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                          {agent.tasksCompleted} 个任务 · 更新于 {new Date(agent.updatedAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 20, fontWeight: 700, color: agent.avgScore >= 8 ? "var(--forest)" : agent.avgScore >= 6 ? "var(--ochre)" : "var(--rose)", margin: 0 }}>
                        {agent.avgScore.toFixed(1)}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>平均分</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      错误率: <span style={{ color: agent.errorRate > 0.2 ? "var(--rose)" : "var(--forest)", fontWeight: 600 }}>
                        {(agent.errorRate * 100).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "cycles" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {cycles.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                  <Brain style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.5 }} />
                  <p style={{ fontSize: 14 }}>暂无进化周期</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>在进化页面手动运行或等待自动触发</p>
                </div>
              ) : cycles.map((cycle) => (
                <div key={cycle.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10,
                        background: cycle.status === "completed" ? "var(--forest-pale)" : cycle.status === "failed" ? "var(--rose-pale)" : "var(--ochre-pale)",
                        color: cycle.status === "completed" ? "var(--forest)" : cycle.status === "failed" ? "var(--rose)" : "var(--ochre)",
                      }}>
                        {cycle.status === "completed" ? "已完成" : cycle.status === "failed" ? "失败" : cycle.status}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>#{cycle.cycleNumber}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(cycle.startedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {[
                      { label: "观察", count: cycle.observations, emoji: "🔍" },
                      { label: "假设", count: cycle.hypotheses, emoji: "💡" },
                      { label: "实验", count: cycle.experiments, emoji: "🧪" },
                      { label: "学习", count: cycle.learnings, emoji: "📚" },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "var(--cream)", borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
                        <p style={{ fontSize: 14, margin: 0 }}>{item.emoji}</p>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>{item.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>{item.count}</p>
                      </div>
                    ))}
                  </div>
                  {cycle.durationMs && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 0", textAlign: "right" }}>
                      耗时 {(cycle.durationMs / 1000).toFixed(0)}s
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
