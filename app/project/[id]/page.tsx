"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/project.store";
import { useChapterStore } from "@/stores/chapter.store";
import { useGenerationStore } from "@/stores/generation.store";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Users,
  ChevronRight,
  PenLine,
  Shield,
  TrendingUp,
  Zap,
  FileText,
  BookMarked,
  Cpu,
  Clock,
  Brain,
  Layers,
} from "lucide-react";
import {
  PROJECT_STATUS_LABELS,
  CHAPTER_FUNCTION_LABELS,
  type ChapterFunction,
} from "@/types";
import { CallChain } from "@/components/ai/call-chain";
import { SceneCardList } from "@/components/ai/scene-card-list";
import { StateDiffPanel } from "@/components/ai/state-diff-panel";
import { ChapterGoalCard } from "@/components/ai/chapter-goal-card";

interface Foreshadow {
  id: string; clueText: string; status: string;
  heatScore: number; urgencyScore: number;
  expectedPayoffStart: number | null; expectedPayoffEnd: number | null;
  plantedChapter: number;
}
interface Character {
  id: string; name: string; roleType: string;
  lastSeenChapter: number | null; currentStatus: string | null; currentLocation: string | null;
}
interface NextChapterSuggestion {
  suggestedFunction: string; suggestedGoal: string;
  tensionDirection: string; reasoning: string;
}

function scoreColor(n: number) {
  if (n >= 80) return "var(--forest)";
  if (n >= 60) return "var(--ochre)";
  return "var(--rose)";
}

function auditBadge(s: string) {
  const m: Record<string, { label: string; cls: string }> = {
    green: { label: "通过", cls: "badge-active" },
    yellow: { label: "需改", cls: "badge-warning" },
    red: { label: "风险", cls: "badge-danger" },
    pending: { label: "待审", cls: "badge-draft" },
  };
  const v = m[s] || m.pending;
  return <span className={`badge ${v.cls}`}>{v.label}</span>;
}

export default function ProjectDashboard() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  const currentProject = useProjectStore(s => s.currentProject);
  const pLoading = useProjectStore(s => s.isLoading);
  const chapters = useChapterStore(s => s.chapters);
  const cLoading = useChapterStore(s => s.isLoading);
  const isGenerating = useGenerationStore(s => s.isGenerating);
  const generationProgress = useGenerationStore(s => s.generationProgress);

  const [foreshadows, setForeshadows] = useState<Foreshadow[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [nextSuggestion, setNextSuggestion] = useState<NextChapterSuggestion | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [latestChapter, setLatestChapter] = useState<any>(null);
  const [latestChapterLoading, setLatestChapterLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    useProjectStore.getState().fetchProject(projectId);
    useChapterStore.getState().fetchChapters(projectId);
  }, [projectId]);

  const dataFetchedRef = useRef(false);
  const logsFetchedRef = useRef(false);

  useEffect(() => {
    if (!projectId || dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    setDataLoading(true);
    Promise.all([
      fetch(`/api/projects/${projectId}/foreshadows`).then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      fetch(`/api/projects/${projectId}/characters`).then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
    ]).then(([f, c]) => { setForeshadows(Array.isArray(f) ? f : []); setCharacters(Array.isArray(c) ? c : []); })
      .catch(() => { setForeshadows([]); setCharacters([]); })
      .finally(() => setDataLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || logsFetchedRef.current) return;
    logsFetchedRef.current = true;
    setAiLogsLoading(true);
    fetch(`/api/projects/${projectId}/ai-logs?limit=30`)
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => setAiLogs(d.logs || [])).catch(() => setAiLogs([]))
      .finally(() => setAiLogsLoading(false));
  }, [projectId]);

  useEffect(() => {
    const confirmed = chapters.filter(c => c.isConfirmed);
    if (confirmed.length > 0) {
      const last = confirmed.sort((a, b) => b.chapterNumber - a.chapterNumber)[0];
      setLatestChapterLoading(true);
      fetch(`/api/projects/${projectId}/chapters/${last.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(ch => {
          if (ch) {
            setLatestChapter(ch);
            if (ch.stateDiff?.nextChapterSuggestion) {
              setNextSuggestion(ch.stateDiff.nextChapterSuggestion);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLatestChapterLoading(false));
    }
  }, [chapters, projectId]);

  const confirmedChapters = chapters.filter(c => c.isConfirmed);
  const totalPlanned = currentProject?.bookDna?.targetWords
    ? Math.ceil(currentProject.bookDna.targetWords / 3000)
    : Math.max(chapters.length, 1);
  const progressPct = Math.min(Math.round((confirmedChapters.length / totalPlanned) * 100), 100);
  const avgQuality = confirmedChapters.length > 0
    ? Math.round(confirmedChapters.reduce((s, c) => s + (c.qualityScore || 0), 0) / confirmedChapters.length)
    : 0;
  const unrecovered = foreshadows.filter(f => f.status !== "full_payoff" && f.status !== "deprecated");
  const highRisk = foreshadows.filter(f => f.urgencyScore > 0.7 || f.status === "conflict");
  const curCh = currentProject?.currentChapter || 0;
  const staleChars = characters.filter(
    c => c.lastSeenChapter != null && curCh - c.lastSeenChapter > 10 && c.roleType !== "minor"
  );

  const chartData = [...confirmedChapters]
    .sort((a, b) => a.chapterNumber - b.chapterNumber).slice(-10)
    .map(c => ({ chapter: `第${c.chapterNumber}章`, score: c.qualityScore || 0, title: c.title }));

  const handleGenerate = async () => {
    try {
      await useGenerationStore.getState().startGeneration(projectId);
      toast({ title: "生成完成", description: useGenerationStore.getState().generationProgress || "新章节已生成" });
      useChapterStore.getState().fetchChapters(projectId);
      useProjectStore.getState().fetchProject(projectId);
    } catch {
      toast({ title: "生成失败", description: "请稍后重试", variant: "destructive" } as any);
    }
  };

  if (pLoading || cLoading || dataLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <Loader2 width={20} height={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }
  if (!currentProject) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
      <p className="type-body">项目不存在</p>
    </div>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", padding: "var(--space-12) var(--space-16)", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── 项目头 ── */}
      <header style={{ marginBottom: "var(--space-10)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
          <h1 className="type-display" style={{ fontSize: "1.75rem", color: "var(--text)", letterSpacing: "-0.02em" }}>
            {currentProject.name}
          </h1>
          <span className="badge badge-draft">{currentProject.genre}</span>
          <span className="badge">
            {PROJECT_STATUS_LABELS[currentProject.status.toLowerCase() as keyof typeof PROJECT_STATUS_LABELS] || currentProject.status}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
          <span className="type-caption"><FileText width={12} height={12} style={{ marginRight: 4, verticalAlign: "-1px" }} />{currentProject.totalWords?.toLocaleString() || 0} 字</span>
          <span className="type-caption">·</span>
          <span className="type-caption">{chapters.length} 章</span>
          <span className="type-caption">·</span>
          <span className="type-caption">{characters.length} 角色</span>
          <span className="type-caption">·</span>
          <span className="type-caption">{foreshadows.length} 伏笔</span>
          <span className="type-caption">·</span>
          <span className="type-caption" style={{ color: scoreColor(avgQuality) }}>均分 {avgQuality}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-outline" onClick={() => router.push(`/project/${projectId}/bible`)}>
            <BookMarked width={13} height={13} /> 作品设定
          </button>
          <button className="btn-outline" onClick={() => router.push(`/project/${projectId}/history`)}>
            <Clock width={13} height={13} /> 版本历史
          </button>
          <button className="btn-outline" onClick={() => router.push(`/project/${projectId}/evolution`)}>
            <Cpu width={13} height={13} /> 自进化
          </button>
          <button className="btn-outline">
            <Shield width={13} height={13} /> 检查风险
          </button>
          <button className="btn-solid" disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? <Loader2 width={14} height={14} className="animate-spin" /> : <Sparkles width={14} height={14} />}
            {isGenerating ? "生成中..." : "生成下一章"}
          </button>
        </div>
      </header>

      <hr className="rule" style={{ marginBottom: "var(--space-12)" }} />

      {/* ── 进度条（内联，非卡片） ── */}
      <section style={{ marginBottom: "var(--space-12)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          <p className="type-label">主线进度</p>
          <p className="type-caption">{progressPct}% · 已确认 {confirmedChapters.length}/{totalPlanned} 章</p>
        </div>
        <div style={{ height: "3px", background: "var(--cream)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--accent)", borderRadius: "2px", transition: "width 0.5s ease" }} />
        </div>
      </section>

      {/* ── 主区域：图表 + 推荐 ── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: chartData.length > 0 ? "1fr 320px" : "1fr",
        gap: "var(--space-12)",
        marginBottom: "var(--space-12)",
      }}>
        {/* 图表 — 无卡片包裹，直接呈现 */}
        <div>
          <p className="type-label" style={{ marginBottom: "var(--space-5)" }}>节奏曲线 · 近 10 章质量走势</p>
          {chartData.length > 0 ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", height: "280px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--rust)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--rust)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" vertical={false} />
                  <XAxis dataKey="chapter" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      color: "var(--text)",
                      fontSize: "12px",
                      boxShadow: "var(--shadow-sm)",
                      padding: "8px 12px",
                    }}
                    formatter={(v: any, _n: any, p: any) => [`${v} 分`, p.payload.title || "质量分"]}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--rust)" strokeWidth={1.5} fill="url(#sg)"
                    dot={{ r: 2.5, fill: "var(--rust)", stroke: "var(--surface)", strokeWidth: 1.5 }}
                    activeDot={{ r: 4, fill: "var(--rust-dark)", stroke: "var(--surface)", strokeWidth: 1.5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ border: "1px dashed var(--border)", borderRadius: "var(--radius)", padding: "var(--space-16)", textAlign: "center", height: "280px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p className="type-body" style={{ color: "var(--text-muted)" }}>确认章节后将显示节奏曲线</p>
            </div>
          )}
        </div>

        {/* 下一章推荐 — 便签风格 */}
        <aside>
          <p className="type-label" style={{ marginBottom: "var(--space-5)" }}>下一章建议</p>
          {nextSuggestion ? (
            <div style={{
              background: "var(--cream)",
              borderRadius: "var(--radius)",
              padding: "var(--space-6)",
              borderLeft: "3px solid var(--accent)",
            }}>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p className="type-label" style={{ marginBottom: "var(--space-1)" }}>功能类型</p>
                <p className="type-display" style={{ fontSize: "0.9375rem", color: "var(--text)" }}>
                  {CHAPTER_FUNCTION_LABELS[nextSuggestion.suggestedFunction as ChapterFunction] || nextSuggestion.suggestedFunction}
                </p>
              </div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p className="type-label" style={{ marginBottom: "var(--space-1)" }}>目标</p>
                <p className="type-body" style={{ lineHeight: 1.7 }}>{nextSuggestion.suggestedGoal}</p>
              </div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p className="type-label" style={{ marginBottom: "var(--space-1)" }}>张力方向</p>
                <p className="type-body">{nextSuggestion.tensionDirection}</p>
              </div>
              <hr className="rule" style={{ margin: "var(--space-4) 0" }} />
              <p className="type-caption" style={{ fontStyle: "italic" }}>{nextSuggestion.reasoning}</p>
            </div>
          ) : (
            <div style={{
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius)",
              padding: "var(--space-8)",
              textAlign: "center",
            }}>
              <Zap width={24} height={24} style={{ color: "var(--text-muted)", marginBottom: "var(--space-3)" }} />
              <p className="type-caption">确认章节后自动生成推荐</p>
            </div>
          )}
        </aside>
      </section>

      {/* ── 最新章节 AI 分析 ── */}
      {latestChapter && (
        <section style={{ marginBottom: "var(--space-12)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
            <p className="type-label">最新章节 AI 分析 · 第{latestChapter.chapterNumber}章</p>
            <button className="btn-ghost" onClick={() => router.push(`/project/${projectId}/editor/${latestChapter.id}`)}>
              进入编辑器 →
            </button>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: latestChapter.sceneCards?.length > 0 ? "1fr 1fr 1fr" : "1fr 1fr",
            gap: "var(--space-8)",
          }}>
            {latestChapter.goal && (
              <div>
                <ChapterGoalCard
                  goal={latestChapter.goal}
                  mustHappen={latestChapter.mustHappen || []}
                  mustNotHappen={latestChapter.mustNotHappen || []}
                  endingHook={latestChapter.endingHook}
                />
              </div>
            )}
            {latestChapter.sceneCards && latestChapter.sceneCards.length > 0 && (
              <div>
                <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>场景卡预览</p>
                <SceneCardList scenes={latestChapter.sceneCards} maxPreview={3} />
              </div>
            )}
            {latestChapter.stateDiff && (
              <div>
                <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>状态差异</p>
                <StateDiffPanel stateDiff={latestChapter.stateDiff} compact />
              </div>
            )}
          </div>
        </section>
      )}
      {latestChapterLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", padding: "var(--space-6) 0", marginBottom: "var(--space-12)" }}>
          <Loader2 width={14} height={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          <span className="type-caption">加载最新章节 AI 分析...</span>
        </div>
      )}

      {/* ── 章节列表 + 角色 ── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: staleChars.length > 0 ? "1fr 340px" : "1fr",
        gap: "var(--space-12)",
        marginBottom: "var(--space-12)",
      }}>
        {/* 章节 */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <p className="type-label">最近章节</p>
            <button className="btn-ghost" onClick={() => router.push(`/project/${projectId}/editor/${chapters[0]?.id}`)}>
              全部查看 →
            </button>
          </div>
          <div style={{ borderTop: "1px solid var(--border-faint)" }}>
            {[...chapters].sort((a, b) => b.chapterNumber - a.chapterNumber).slice(0, 8).map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => router.push(`/project/${projectId}/editor/${ch.id}`)}
                className="row-item row-item-clickable"
                style={{ width: "100%", textAlign: "left", borderBottom: "1px solid var(--border-faint)", padding: "var(--space-3) 0" }}
              >
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <span className="type-mono" style={{ color: "var(--text-muted)", minWidth: "22px" }}>{ch.chapterNumber}</span>
                  <div style={{ minWidth: 0 }}>
                    <p className="type-body" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "360px" }}>{ch.title}</p>
                    <p className="type-caption">
                      {CHAPTER_FUNCTION_LABELS[ch.chapterFunction as ChapterFunction] || ch.chapterFunction} · {(ch.wordCount || 0).toLocaleString()} 字
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
                  {ch.qualityScore != null && (
                    <span className="type-mono" style={{ color: scoreColor(ch.qualityScore), fontWeight: 500 }}>{Math.round(ch.qualityScore)}</span>
                  )}
                  {auditBadge(ch.auditStatus)}
                  <ChevronRight width={14} height={14} style={{ color: "var(--border)" }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 长期未出场角色 */}
        {staleChars.length > 0 && (
          <div>
            <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>长期未出场角色</p>
            <div style={{ borderTop: "1px solid var(--border-faint)" }}>
              {staleChars.map(char => (
                <div key={char.id} className="row-item" style={{ borderBottom: "1px solid var(--border-faint)", padding: "var(--space-3) 0" }}>
                  <div className="row-item" style={{ gap: "12px" }}>
                    <span style={{
                      width: "26px", height: "26px", borderRadius: "50%",
                      background: "var(--cream)", color: "var(--ink-soft)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 600,
                    }}>{char.name[0]}</span>
                    <div>
                      <p className="type-body" style={{ fontWeight: 500 }}>{char.name}</p>
                      <p className="type-caption">{char.roleType}{char.currentLocation ? ` · ${char.currentLocation}` : ""}</p>
                    </div>
                  </div>
                  <span className="type-caption badge-warning" style={{ padding: "2px 6px" }}>
                    {curCh - (char.lastSeenChapter || 0)} 章
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 自进化指标 ── */}
      {currentProject?.evolutionMetrics && (
        <section style={{ marginBottom: "var(--space-12)" }}>
          <p className="type-label" style={{ marginBottom: "var(--space-5)" }}>自进化状态</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-4)",
          }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-2)" }}>
                <Brain width={14} height={14} style={{ color: "var(--accent)" }} />
                <span className="type-caption">进化周期</span>
              </div>
              <p className="type-display" style={{ fontSize: "1.25rem" }}>
                {currentProject.evolutionMetrics.latestCycle
                  ? `#${currentProject.evolutionMetrics.latestCycle.cycleNumber}`
                  : "未启动"}
              </p>
              {currentProject.evolutionMetrics.latestCycle && (
                <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>
                  {currentProject.evolutionMetrics.latestCycle.status === "completed" ? "已完成" : "进行中"}
                  · {currentProject.evolutionMetrics.latestCycle.learningsCount} 项学习
                </p>
              )}
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-2)" }}>
                <Zap width={14} height={14} style={{ color: "var(--accent)" }} />
                <span className="type-caption">提示词版本</span>
              </div>
              <p className="type-display" style={{ fontSize: "1.25rem" }}>
                {currentProject.evolutionMetrics.promptVersions}
              </p>
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>自动进化中</p>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-2)" }}>
                <Layers width={14} height={14} style={{ color: "var(--accent)" }} />
                <span className="type-caption">学习样本</span>
              </div>
              <p className="type-display" style={{ fontSize: "1.25rem" }}>
                {currentProject.evolutionMetrics.learningEpisodes}
              </p>
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>持续积累</p>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-2)" }}>
                <TrendingUp width={14} height={14} style={{ color: "var(--accent)" }} />
                <span className="type-caption">向量记忆</span>
              </div>
              <p className="type-display" style={{ fontSize: "1.25rem" }}>活跃</p>
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>语义检索启用</p>
            </div>
          </div>
        </section>
      )}

      {/* ── AI 活动记录 ── */}
      {aiLogs.length > 0 && (
        <section style={{ marginBottom: "var(--space-12)" }}>
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "var(--space-4) 0" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Cpu width={15} height={15} style={{ color: "var(--text-muted)" }} />
              <span className="type-label" style={{ color: "var(--text-secondary)" }}>AI 活动记录</span>
              <span className="type-caption">{aiLogs.length} 次调用</span>
            </div>
            <span style={{ transform: showAiPanel ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", color: "var(--text-muted)" }}>▼</span>
          </button>
          {showAiPanel && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <CallChain logs={aiLogs} />
            </div>
          )}
        </section>
      )}

      {aiLogsLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", padding: "var(--space-6) 0" }}>
          <Loader2 width={14} height={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          <span className="type-caption">加载 AI 活动记录...</span>
        </div>
      )}

      {/* ── 生成中提示 ── */}
      {isGenerating && (
        <div style={{
          background: "var(--rust-pale)",
          border: "1px solid rgba(160,82,45,0.15)",
          borderRadius: "var(--radius)",
          padding: "var(--space-4) var(--space-5)",
          display: "flex", alignItems: "center", gap: "var(--space-4)",
        }}>
          <Loader2 width={18} height={18} className="animate-spin" style={{ color: "var(--accent)" }} />
          <div>
            <p className="type-body" style={{ fontWeight: 500 }}>正在生成中...</p>
            <p className="type-caption">{generationProgress}</p>
          </div>
        </div>
      )}
    </div>
  );
}
