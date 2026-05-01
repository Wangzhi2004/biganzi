"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BookOpen, BarChart3, Users, Layers, Play, Loader2,
  RefreshCw, LogOut, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Activity, Settings,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  genre: string;
  status: string;
  totalWords: number;
  currentChapter: number;
  updatedAt: string;
  latestChapter: { chapterNumber: number; title: string; qualityScore: number | null; auditStatus: string } | null;
  avgQuality: number;
  pendingJobs: number;
  characterCount: number;
  foreshadowCount: number;
  agents: { id: string; tasksCompleted: number; avgScore: number }[];
  recentCycle: { cycleNumber: number; status: string; startedAt: string } | null;
}

interface Task {
  id: string;
  projectId: string;
  jobType: string;
  status: string;
  durationMs: number | null;
  cost: number | null;
  errorMessage: string | null;
  createdAt: string;
  projectName?: string;
  chapter: { chapterNumber: number; title: string; qualityScore: number | null } | null;
}

interface StreamEvent {
  type: string;
  label?: string;
  status?: string;
  percent?: number;
  totalTokens?: number;
  currentStep?: string;
  qualityScore?: number;
  error?: string;
  completedSteps?: number;
  totalSteps?: number;
}

export default function MobilePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [streamData, setStreamData] = useState<StreamEvent[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "tasks">("dashboard");
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, tasksRes] = await Promise.all([
        fetch("/api/mobile/dashboard"),
        fetch("/api/mobile/tasks?limit=20"),
      ]);
      if (dashRes.ok) {
        const data = await dashRes.json();
        setProjects(data.projects || []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const connectStream = useCallback((projectId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setStreamData([]);

    const es = new EventSource(`/api/mobile/tasks/${projectId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamEvent;
        if (data.type === "connected" || data.type === "job_found") {
          setStreamData([data]);
          return;
        }
        setStreamData((prev) => [...prev, data]);
        if (data.type === "completed" || data.type === "failed") {
          es.close();
          eventSourceRef.current = null;
          setGenerating(null);
          setTimeout(fetchData, 1000);
        }
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setTimeout(fetchData, 3000);
    };
  }, [fetchData]);

  const handleGenerate = async (projectId: string) => {
    setGenerating(projectId);
    try {
      const res = await fetch("/api/mobile/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "next_chapter" }),
      });
      if (res.ok) {
        connectStream(projectId);
      } else {
        const err = await res.json();
        alert(err.error || "生成失败");
        setGenerating(null);
      }
    } catch {
      alert("网络错误");
      setGenerating(null);
    }
  };

  const handleCancel = async (projectId: string) => {
    try {
      await fetch(`/api/mobile/tasks/${projectId}/cancel`, { method: "POST" });
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setGenerating(null);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleLogout = async () => {
    await fetch("/api/mobile/auth", { method: "DELETE" });
    window.location.href = "/mobile/login";
  };

  const latestProgress = streamData.filter((e) => e.type === "progress").pop();
  const latestCompleted = streamData.find((e) => e.type === "completed");
  const latestFailed = streamData.find((e) => e.type === "failed");

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--accent)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: '"Noto Serif SC", serif' }}>
          笔杆子
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={fetchData} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)" }}>
            <RefreshCw style={{ width: 18, height: 18 }} />
          </button>
          <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)" }}>
            <LogOut style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, margin: "12px 0", borderBottom: "1px solid var(--border)" }}>
        {(["dashboard", "tasks"] as const).map((t) => (
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
            {t === "dashboard" ? "仪表盘" : "任务"}
          </button>
        ))}
      </div>

      {/* 实时进度条 */}
      {generating && latestProgress && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Loader2 style={{ width: 16, height: 16, color: "var(--accent)", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {latestCompleted ? "生成完成" : latestFailed ? "生成失败" : latestProgress.currentStep || "生成中..."}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--cream)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${latestProgress.percent || 0}%`, background: "var(--accent)", borderRadius: 3, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
            <span>{latestProgress.completedSteps}/{latestProgress.totalSteps} 步骤 · {((latestProgress.totalTokens || 0) / 1000).toFixed(1)}k tokens</span>
            {!latestCompleted && !latestFailed && (
              <button
                onClick={() => handleCancel(generating)}
                style={{ background: "none", border: "1px solid var(--rose)", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "var(--rose)", cursor: "pointer" }}
              >
                取消
              </button>
            )}
          </div>
          {latestCompleted && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--forest-pale)", borderRadius: 6, fontSize: 13, color: "var(--forest)" }}>
              质量分：{latestCompleted.qualityScore?.toFixed(1) || "-"}
            </div>
          )}
          {latestFailed && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--rose-pale)", borderRadius: 6, fontSize: 13, color: "var(--rose)" }}>
              {latestFailed.error}
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {tab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
              <BookOpen style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>暂无项目</p>
            </div>
          ) : (
            projects.map((p) => (
              <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>{p.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{p.genre} · 第 {p.currentChapter} 章</p>
                    </div>
                    {expandedProject === p.id
                      ? <ChevronUp style={{ width: 18, height: 18, color: "var(--text-muted)" }} />
                      : <ChevronDown style={{ width: 18, height: 18, color: "var(--text-muted)" }} />}
                  </div>
                </div>

                {expandedProject === p.id && (
                  <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border-faint)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, margin: "12px 0" }}>
                      {[
                        { label: "字数", value: (p.totalWords / 1000).toFixed(1) + "k", icon: BookOpen },
                        { label: "质量", value: p.avgQuality.toFixed(0), icon: BarChart3 },
                        { label: "角色", value: String(p.characterCount), icon: Users },
                        { label: "伏笔", value: String(p.foreshadowCount), icon: Layers },
                      ].map((s) => (
                        <div key={s.label} style={{ background: "var(--cream)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
                          <s.icon style={{ width: 14, height: 14, color: "var(--text-muted)", margin: "0 auto 2px" }} />
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>{s.value}</p>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {p.latestChapter && (
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                        最新：第 {p.latestChapter.chapterNumber} 章「{p.latestChapter.title}」
                        {p.latestChapter.qualityScore && (
                          <span style={{ marginLeft: 8, color: p.latestChapter.qualityScore >= 80 ? "var(--forest)" : "var(--ochre)" }}>
                            {p.latestChapter.qualityScore.toFixed(0)} 分
                          </span>
                        )}
                      </div>
                    )}

                    {p.agents.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {p.agents.map((a) => (
                          <span key={a.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--cream)", color: "var(--text-secondary)" }}>
                            {a.id.replace("_agent", "")} {a.avgScore.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); handleGenerate(p.id); }}
                      disabled={generating !== null}
                      style={{
                        width: "100%", padding: "10px 0",
                        background: generating ? "var(--cream)" : "var(--accent)",
                        color: generating ? "var(--text-muted)" : "#fff",
                        border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600,
                        cursor: generating ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      {generating === p.id
                        ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> 生成中...</>
                        : <><Play style={{ width: 16, height: 16 }} /> 生成下一章</>}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {tab === "tasks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
              <Clock style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>暂无任务</p>
            </div>
          ) : (
            tasks.map((t) => {
              const StatusIcon = t.status === "COMPLETED" ? CheckCircle2 : t.status === "FAILED" ? XCircle : t.status === "RUNNING" ? Loader2 : Clock;
              const statusColor = t.status === "COMPLETED" ? "var(--forest)" : t.status === "FAILED" ? "var(--rose)" : t.status === "RUNNING" ? "var(--accent)" : "var(--text-muted)";

              return (
                <div
                  key={t.id}
                  onClick={() => { if (t.status === "RUNNING" || t.status === "PENDING") { connectStream(t.projectId); setTab("dashboard"); } }}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
                    padding: "12px 14px",
                    cursor: t.status === "RUNNING" || t.status === "PENDING" ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusIcon style={{ width: 16, height: 16, color: statusColor, flexShrink: 0, animation: t.status === "RUNNING" ? "spin 1s linear infinite" : undefined }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.chapter ? `第 ${t.chapter.chapterNumber} 章「${t.chapter.title}」` : t.jobType}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                        {t.projectName} · {new Date(t.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })}
                        {t.durationMs ? ` · ${(t.durationMs / 1000).toFixed(0)}s` : ""}
                      </p>
                    </div>
                    {t.chapter?.qualityScore && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.chapter.qualityScore >= 80 ? "var(--forest)" : "var(--ochre)" }}>
                        {t.chapter.qualityScore.toFixed(0)}
                      </span>
                    )}
                  </div>
                  {t.errorMessage && (
                    <p style={{ fontSize: 12, color: "var(--rose)", margin: "6px 0 0", paddingLeft: 24 }}>{t.errorMessage}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 底部导航栏 */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--surface)", borderTop: "1px solid var(--border)",
        display: "flex", justifyContent: "center", padding: "8px 0",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))", zIndex: 50,
      }}>
        <div style={{ display: "flex", gap: 0, maxWidth: 480, width: "100%" }}>
          {[
            { label: "总览", icon: BookOpen, href: "/mobile" },
            { label: "质量", icon: BarChart3, href: "/mobile/quality" },
            { label: "Agent", icon: Activity, href: "/mobile/agents" },
            { label: "设置", icon: Settings, href: "/mobile/settings" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, padding: "4px 0", textDecoration: "none",
                color: item.href === "/mobile" ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <item.icon style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: 10 }}>{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
