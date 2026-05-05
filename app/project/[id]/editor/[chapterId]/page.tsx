"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import CharacterCount from "@tiptap/extension-character-count";
import { useChapterStore } from "@/stores/chapter.store";
import { useEditorStore } from "@/stores/editor.store";
import { useGenerationStore } from "@/stores/generation.store";
import { useHistoryStore } from "@/stores/history.store";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Save,
  CheckCircle2,
  Sparkles,
  PenLine,
  Expand,
  Minimize,
  RotateCcw,
  Wand2,
  Swords,
  MessageSquare,
  Eye,
  MousePointerClick,
  ChevronLeft,
  FileText,
  AlertCircle,
  Palette,
} from "lucide-react";
import {
  CHAPTER_FUNCTION_LABELS,
  type ChapterFunction,
} from "@/types";
import { SceneCardList } from "@/components/ai/scene-card-list";
import { StateDiffPanel } from "@/components/ai/state-diff-panel";
import { ChapterGoalCard } from "@/components/ai/chapter-goal-card";
import { AuditRawPanel } from "@/components/ai/audit-raw-panel";
import { CallChain } from "@/components/ai/call-chain";

const AI_FULL = [
  { key: "continue", label: "续写", icon: PenLine },
  { key: "expand", label: "扩写", icon: Expand },
  { key: "compress", label: "压缩", icon: Minimize },
  { key: "rewrite", label: "重写", icon: RotateCcw },
  { key: "change_style", label: "改文风", icon: Palette },
  { key: "change_plot", label: "改情节", icon: FileText },
  { key: "style_only_rewrite", label: "保剧情改文风", icon: Palette },
  { key: "plot_only_rewrite", label: "保文风改情节", icon: FileText },
] as const;

const AI_SEL = [
  { key: "rewrite_selection", label: "改写", icon: Wand2 },
  { key: "enhance_conflict", label: "增强冲突", icon: Swords },
  { key: "enhance_dialogue", label: "增强对白", icon: MessageSquare },
  { key: "enhance_imagery", label: "增强画面", icon: Eye },
  { key: "enhance_hook", label: "增强钩子", icon: MousePointerClick },
  { key: "enhance_romance", label: "增强暧昧", icon: Sparkles },
  { key: "enhance_pleasure", label: "增强爽点", icon: Sparkles },
] as const;

const opLabels: Record<string, string> = {
  continue: "续写", expand: "扩写", compress: "压缩", rewrite: "重写",
  change_style: "改文风", change_plot: "改情节",
  style_only_rewrite: "保剧情改文风", plot_only_rewrite: "保文风改情节",
  rewrite_selection: "改写", enhance_conflict: "增强冲突",
  enhance_dialogue: "增强对白", enhance_imagery: "增强画面", enhance_hook: "增强钩子",
  enhance_romance: "增强暧昧", enhance_pleasure: "增强爽点",
};

function fmtTime(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const chapterId = params.chapterId as string;

  const { currentChapter, fetchChapter, updateChapter, isLoading } = useChapterStore();
  const { isSaving, isDirty, lastSavedAt, isAiProcessing, setSaving, setDirty, setLastSaved, setAiProcessing, selectedText, setSelectedText } = useEditorStore();
  const { isGenerating, generationProgress, startGeneration } = useGenerationStore();
  const { snapshots, addSnapshot, selectedSnapshotId, restoreSnapshot } = useHistoryStore();

  const [auditReport, setAuditReport] = useState<any>(null);
  const [foreshadows, setForeshadows] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(true);
  const [panelTab, setPanelTab] = useState<"overview" | "scenes" | "state" | "audit" | "history">("overview");
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [styleDrift, setStyleDrift] = useState<{ driftScore: number; driftPoints: string[] } | null>(null);
  const [styleCheckLoading, setStyleCheckLoading] = useState(false);
  const contentLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "开始写作..." }),
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      CharacterCount,
    ],
    editorProps: { attributes: { class: "tiptap" } },
    onUpdate: ({ editor }) => {
      setDirty(true);
      const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
      const { from, to } = editor.state.selection;
      if (from !== to) setSelectedText(editor.state.doc.textBetween(from, to, "\n"));
      else setSelectedText("");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveContent(editor.getHTML(), text.length), 2000);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      setSelectedText(from !== to ? editor.state.doc.textBetween(from, to, "\n") : "");
    },
  });

  const saveContent = useCallback(async (html: string, charCount: number) => {
    setSaving(true);
    try {
      await updateChapter(projectId, chapterId, { content: html, wordCount: charCount });
      setLastSaved(new Date().toISOString());
      toast({ title: "已保存" });
    } catch { toast({ title: "保存失败", variant: "destructive" } as any); }
    finally { setSaving(false); }
  }, [projectId, chapterId, updateChapter, setSaving, setLastSaved, toast]);

  useEffect(() => { contentLoadedRef.current = false; fetchChapter(projectId, chapterId); }, [projectId, chapterId, fetchChapter]);

  useEffect(() => {
    if (currentChapter && editor && !contentLoadedRef.current) {
      currentChapter.content ? editor.commands.setContent(currentChapter.content) : editor.commands.clearContent();
      contentLoadedRef.current = true;
    }
  }, [currentChapter, editor]);

  useEffect(() => {
    if (!projectId || !chapterId) return;
    Promise.all([
      fetch(`/api/projects/${projectId}/chapters/${chapterId}/audit`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/projects/${projectId}/foreshadows`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/projects/${projectId}/characters`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([a, f, c]) => { setAuditReport(a); setForeshadows(f || []); setCharacters(c || []); });
  }, [projectId, chapterId]);

  useEffect(() => {
    if (!projectId || !chapterId) return;
    setAiLogsLoading(true);
    fetch(`/api/projects/${projectId}/ai-logs?chapterId=${chapterId}&limit=50`)
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => setAiLogs(d.logs || []))
      .catch(() => setAiLogs([]))
      .finally(() => setAiLogsLoading(false));
  }, [projectId, chapterId]);

  const handleAiOp = async (op: string, sel: boolean) => {
    if (!editor) return;
    addSnapshot(opLabels[op] || op, editor.getHTML());
    setAiProcessing(true);
    try {
      const payload: Record<string, any> = {
        aiOperation: op,
        content: editor.getHTML(),
      };
      if (sel && selectedText) {
        payload.selectedText = selectedText;
        const { from, to } = editor.state.selection;
        payload.selectionFrom = from;
        payload.selectionTo = to;
      }
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("AI 操作失败");
      const data = await res.json();
      if (data.content) { editor.commands.setContent(data.content); setDirty(true); }
      toast({ title: `${opLabels[op] || op}完成`, description: data.aiResult ? "AI 已返回结果" : undefined });
    } catch (err: any) { toast({ title: "AI 操作失败", description: err.message, variant: "destructive" } as any); }
    finally { setAiProcessing(false); }
  };

  const wordCount = editor?.storage.characterCount?.characters?.() || 0;

  const handleStyleCheck = async () => {
    if (!editor) return;
    setStyleCheckLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}/style-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.getHTML() }),
      });
      if (res.ok) {
        const data = await res.json();
        setStyleDrift(data);
      }
    } catch {} finally { setStyleCheckLoading(false); }
  };

  if (isLoading && !currentChapter) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
      <Loader2 width={20} height={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );
  if (!currentChapter) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
      <p className="type-body">章节不存在</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── 极简顶栏 ── */}
      <header style={{
        display: "flex", alignItems: "center", gap: "var(--space-5)",
        padding: "0 var(--space-8)", height: "48px", flexShrink: 0,
        borderBottom: "1px solid var(--border-faint)", background: "var(--surface)",
      }}>
        <button className="btn-ghost" onClick={() => router.push(`/project/${projectId}`)}>
          <ChevronLeft width={14} height={14} /> 返回
        </button>
        <span style={{ width: "1px", height: "16px", background: "var(--border-faint)" }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="type-display" style={{ fontSize: "0.9375rem" }}>第{currentChapter.chapterNumber}章</span>
          {" "}
          <span className="type-body" style={{ color: "var(--text-muted)" }}>{currentChapter.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", flexShrink: 0 }}>
          {isSaving && <span className="type-caption" style={{ color: "var(--accent)" }}><Loader2 width={12} height={12} className="animate-spin" /> 保存中</span>}
          {!isSaving && isDirty && <span className="type-caption">未保存</span>}
          {!isSaving && !isDirty && lastSavedAt && <span className="type-caption">已保存 {fmtTime(lastSavedAt)}</span>}
          <span style={{ width: "1px", height: "16px", background: "var(--border-faint)" }} />
          <span className="type-mono type-caption">{wordCount.toLocaleString()} 字</span>
          <span style={{ width: "1px", height: "16px", background: "var(--border-faint)" }} />
          <button
            className="btn-ghost"
            onClick={handleStyleCheck}
            disabled={styleCheckLoading}
            style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: 4 }}
            title="检测风格偏移"
          >
            {styleCheckLoading ? (
              <Loader2 width={12} height={12} className="animate-spin" />
            ) : styleDrift ? (
              <span style={{
                display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                background: styleDrift.driftScore > 30 ? "var(--rose)" : styleDrift.driftScore > 15 ? "var(--ochre)" : "var(--forest)",
              }} />
            ) : (
              <Palette width={12} height={12} />
            )}
            {styleDrift ? `偏移 ${styleDrift.driftScore}` : "风格"}
          </button>
          {styleDrift && styleDrift.driftScore > 0 && (
            <div style={{
              position: "absolute", top: "52px", right: "16px",
              background: "var(--surface)", border: "1px solid var(--border-faint)",
              borderRadius: "var(--radius)", padding: "var(--space-4)",
              boxShadow: "var(--shadow-sm)", zIndex: 100, minWidth: "240px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                <span className="type-label">风格漂移分析</span>
                <span className="type-mono" style={{
                  color: styleDrift.driftScore > 30 ? "var(--rose)" : styleDrift.driftScore > 15 ? "var(--ochre)" : "var(--forest)",
                  fontWeight: 700,
                }}>{styleDrift.driftScore}/100</span>
              </div>
              <div style={{ height: "4px", background: "var(--cream)", borderRadius: "2px", overflow: "hidden", marginBottom: "var(--space-3)" }}>
                <div style={{
                  height: "100%", width: `${styleDrift.driftScore}%`,
                  background: styleDrift.driftScore > 30 ? "var(--rose)" : styleDrift.driftScore > 15 ? "var(--ochre)" : "var(--forest)",
                  borderRadius: "2px", transition: "width 0.3s ease",
                }} />
              </div>
              {styleDrift.driftPoints && styleDrift.driftPoints.length > 0 && (
                <div>
                  <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>偏离点：</p>
                  {styleDrift.driftPoints.map((point, i) => (
                    <p key={i} className="type-caption" style={{ padding: "2px 0", color: "var(--text-secondary)" }}>• {point}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── 主区域：编辑器 + 侧边栏 ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* 编辑器 — 占据全部空间 */}
        <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: "var(--space-12) var(--space-16)" }}>
            <EditorContent editor={editor} />
          </div>
        </main>

        {/* 右侧面板 — 可折叠的边注风格 */}
        {showPanel && (
          <aside style={{
            width: "280px", borderLeft: "1px solid var(--border-faint)",
            background: "var(--surface)", overflowY: "auto", flexShrink: 0,
            display: "flex", flexDirection: "column",
          }}>
            {/* Tab 切换 */}
            <div style={{
              display: "flex", gap: 0, borderBottom: "1px solid var(--border-faint)",
              padding: "0 var(--space-4)", overflowX: "auto",
            }}>
              {([
                { key: "overview" as const, label: "概览" },
                { key: "scenes" as const, label: "场景" },
                { key: "state" as const, label: "状态" },
                { key: "audit" as const, label: "审核" },
                { key: "history" as const, label: "AI 历史" },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPanelTab(tab.key)}
                  style={{
                    padding: "var(--space-3) var(--space-3)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.75rem", fontWeight: 500, whiteSpace: "nowrap",
                    color: panelTab === tab.key ? "var(--text)" : "var(--text-muted)",
                    borderBottom: panelTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── 概览 Tab ── */}
            {panelTab === "overview" && (
              <div style={{ padding: "var(--space-5)", flex: 1, overflowY: "auto" }}>
                {currentChapter.goal && (
                  <>
                    <ChapterGoalCard
                      goal={currentChapter.goal}
                      mustHappen={currentChapter.mustHappen || []}
                      mustNotHappen={currentChapter.mustNotHappen || []}
                      endingHook={currentChapter.endingHook}
                    />
                    <hr className="rule" style={{ margin: "var(--space-6) 0" }} />
                  </>
                )}

                {auditReport && (
                  <>
                    <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>审核摘要</p>
                    <div style={{ marginBottom: "var(--space-6)" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                        <span className="type-label">质量评分</span>
                        <span className="type-display" style={{
                          fontSize: "1.25rem", fontWeight: 700,
                          color: (auditReport.qualityScore || 0) >= 80 ? "var(--forest)"
                            : (auditReport.qualityScore || 0) >= 60 ? "var(--ochre)" : "var(--rose)",
                        }}>
                          {Math.round(auditReport.qualityScore || 0)}
                        </span>
                      </div>
                      {[
                        { l: "主线", v: auditReport.mainPlotScore },
                        { l: "人物", v: auditReport.characterChangeScore },
                        { l: "冲突", v: auditReport.conflictScore },
                        { l: "钩子", v: auditReport.hookScore },
                        { l: "风格", v: auditReport.styleConsistencyScore },
                      ].map(item => (
                        <div key={item.l} style={{ marginBottom: "var(--space-2)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                            <span className="type-caption">{item.l}</span>
                            <span className="type-caption type-mono">{Math.round(item.v || 0)}</span>
                          </div>
                          <div style={{ height: "3px", background: "var(--cream)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(item.v || 0, 100)}%`, borderRadius: "2px", background: (item.v || 0) >= 80 ? "var(--forest)" : (item.v || 0) >= 60 ? "var(--ochre)" : "var(--rose)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {characters.length > 0 && (
                  <>
                    <hr className="rule" style={{ margin: "var(--space-6) 0 var(--space-4)" }} />
                    <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>关联角色 · {characters.length}</p>
                    {characters.slice(0, 10).map((char: any) => (
                      <div key={char.id} className="row-item" style={{ padding: "var(--space-2) var(--space-3)" }}>
                        <span style={{
                          width: "22px", height: "22px", borderRadius: "50%",
                          background: "var(--cream)", fontSize: "0.6875rem", fontWeight: 600,
                          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)",
                          flexShrink: 0,
                        }}>{char.name?.[0]}</span>
                        <div style={{ minWidth: 0 }}>
                          <p className="type-body" style={{ fontSize: "0.8125rem" }}>{char.name}</p>
                          <p className="type-caption">{char.roleType}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {foreshadows.filter(f => f.status !== "FULL_PAYOFF" && f.status !== "DEPRECATED").length > 0 && (
                  <>
                    <hr className="rule" style={{ margin: "var(--space-6) 0 var(--space-4)" }} />
                    <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>
                      伏笔 · {foreshadows.filter(f => f.status !== "FULL_PAYOFF" && f.status !== "DEPRECATED").length}
                    </p>
                    {foreshadows.filter(f => f.status !== "FULL_PAYOFF" && f.status !== "DEPRECATED").slice(0, 5).map((f: any) => (
                      <div key={f.id} style={{ padding: "var(--space-3)", marginBottom: "var(--space-1)", background: "var(--cream)", borderRadius: "var(--radius)" }}>
                        <p className="type-body" style={{ fontSize: "0.8125rem", lineHeight: 1.55 }}>{f.clueText}</p>
                        <span className={`badge ${f.status === "CONFLICT" ? "badge-danger" : f.urgencyScore > 0.7 ? "badge-warning" : "badge-draft"}`} style={{ marginTop: "var(--space-2)" }}>
                          {f.status === "PLANTED" ? "已埋设" : f.status === "REMINDED" ? "已提醒" : f.status === "DEEPENED" ? "已深化" : f.status === "PARTIAL_PAYOFF" ? "部分回收" : f.status === "CONFLICT" ? "冲突" : f.status}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── 场景 Tab ── */}
            {panelTab === "scenes" && (
              <div style={{ padding: "var(--space-5)", flex: 1, overflowY: "auto" }}>
                {currentChapter.sceneCards && currentChapter.sceneCards.length > 0 ? (
                  <SceneCardList scenes={currentChapter.sceneCards} />
                ) : (
                  <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-muted)" }}>
                    暂无场景卡数据
                  </p>
                )}
              </div>
            )}

            {/* ── 状态 Tab ── */}
            {panelTab === "state" && (
              <div style={{ padding: "var(--space-5)", flex: 1, overflowY: "auto" }}>
                {currentChapter.stateDiff ? (
                  <StateDiffPanel stateDiff={currentChapter.stateDiff} compact />
                ) : (
                  <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-muted)" }}>
                    暂无状态差异数据
                  </p>
                )}
              </div>
            )}

            {/* ── 审核 Tab ── */}
            {panelTab === "audit" && (
              <div style={{ padding: "var(--space-5)", flex: 1, overflowY: "auto" }}>
                {auditReport ? (
                  <>
                    <div style={{ marginBottom: "var(--space-5)" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                        <span className="type-label">质量评分</span>
                        <span className="type-display" style={{
                          fontSize: "1.5rem", fontWeight: 700,
                          color: (auditReport.qualityScore || 0) >= 80 ? "var(--forest)"
                            : (auditReport.qualityScore || 0) >= 60 ? "var(--ochre)" : "var(--rose)",
                        }}>
                          {Math.round(auditReport.qualityScore || 0)}
                        </span>
                      </div>
                      {[
                        { l: "主线推进", v: auditReport.mainPlotScore },
                        { l: "人物变化", v: auditReport.characterChangeScore },
                        { l: "冲突张力", v: auditReport.conflictScore },
                        { l: "钩子强度", v: auditReport.hookScore },
                        { l: "风格一致", v: auditReport.styleConsistencyScore },
                      ].map(item => (
                        <div key={item.l} style={{ marginBottom: "var(--space-2)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                            <span className="type-caption">{item.l}</span>
                            <span className="type-caption type-mono">{Math.round(item.v || 0)}</span>
                          </div>
                          <div style={{ height: "3px", background: "var(--cream)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(item.v || 0, 100)}%`, borderRadius: "2px", background: (item.v || 0) >= 80 ? "var(--forest)" : (item.v || 0) >= 60 ? "var(--ochre)" : "var(--rose)" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {auditReport.risks && auditReport.risks.length > 0 && (
                      <>
                        <hr className="rule" style={{ margin: "var(--space-5) 0" }} />
                        <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>风险项 · {auditReport.risks.length}</p>
                        {auditReport.risks.map((risk: any, i: number) => (
                          <div key={i} style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)", background: "var(--cream)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--rose)" }}>
                            <p className="type-body" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: "2px" }}>{risk.category}</p>
                            <p className="type-caption">{risk.description}</p>
                            {risk.suggestion && <p className="type-caption" style={{ marginTop: "var(--space-1)", color: "var(--ochre)" }}>建议：{risk.suggestion}</p>}
                          </div>
                        ))}
                      </>
                    )}

                    {auditReport.rewriteActions && auditReport.rewriteActions.length > 0 && (
                      <>
                        <hr className="rule" style={{ margin: "var(--space-5) 0" }} />
                        <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>改写建议 · {auditReport.rewriteActions.length}</p>
                        {auditReport.rewriteActions.map((action: any, i: number) => (
                          <div key={i} style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)", background: "var(--cream)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--ochre)" }}>
                            <p className="type-body" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: "2px" }}>{action.type}</p>
                            <p className="type-caption">{action.description}</p>
                          </div>
                        ))}
                      </>
                    )}

                    <hr className="rule" style={{ margin: "var(--space-5) 0" }} />
                    <AuditRawPanel chapterId={chapterId} projectId={projectId} />
                  </>
                ) : (
                  <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-muted)" }}>
                    暂无审核报告
                  </p>
                )}
              </div>
            )}

            {/* ── AI 历史 Tab ── */}
            {panelTab === "history" && (
              <div style={{ padding: "var(--space-5)", flex: 1, overflowY: "auto" }}>
                <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>编辑操作</p>
                {snapshots.length === 0 ? (
                  <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-6) 0" }}>暂无 AI 操作历史</p>
                ) : (
                  snapshots.map(snap => (
                    <button
                      key={snap.id}
                      onClick={() => { const c = restoreSnapshot(snap.id); if (c && editor) editor.commands.setContent(c); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "var(--space-3) var(--space-4)",
                        background: selectedSnapshotId === snap.id ? "var(--rust-pale)" : "transparent",
                        borderLeft: selectedSnapshotId === snap.id ? "3px solid var(--accent)" : "3px solid transparent",
                        cursor: "pointer", transition: "background-color 0.12s ease",
                        marginBottom: "var(--space-1)",
                      }}
                      onMouseEnter={e => { if (selectedSnapshotId !== snap.id) e.currentTarget.style.background = "var(--cream)"; }}
                      onMouseLeave={e => { if (selectedSnapshotId !== snap.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="type-body" style={{ fontWeight: 500, fontSize: "0.8125rem" }}>{snap.operationType}</span>
                        <span className="type-caption">
                          {new Date(snap.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <span className="type-caption">{snap.wordCount.toLocaleString()} 字 · 点击恢复</span>
                    </button>
                  ))
                )}

                <hr className="rule" style={{ margin: "var(--space-6) 0 var(--space-4)" }} />
                <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>AI 调用记录</p>
                {aiLogsLoading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", padding: "var(--space-6) 0" }}>
                    <Loader2 width={12} height={12} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                    <span className="type-caption">加载中...</span>
                  </div>
                ) : aiLogs.length > 0 ? (
                  <CallChain logs={aiLogs} />
                ) : (
                  <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-6) 0", color: "var(--text-muted)" }}>
                    暂无 AI 调用记录
                  </p>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── 底部工具栏 ── */}
      <footer style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 var(--space-8)", height: "44px", flexShrink: 0,
        borderTop: "1px solid var(--border-faint)", background: "var(--surface)",
        fontSize: "0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", color: "var(--text-muted)" }}>
          <span>第{currentChapter.chapterNumber}章</span>
          <span>·</span>
          <span>{wordCount.toLocaleString()}字</span>
          {isAiProcessing && <><span>·</span><span style={{ color: "var(--accent)" }}><Loader2 width={11} height={11} className="animate-spin" /> 处理中</span></>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          {AI_FULL.map(op => (
            <button key={op.key} disabled={isAiProcessing} onClick={() => handleAiOp(op.key, false)}
              className="btn-ghost" style={{ fontSize: "0.75rem", padding: "var(--space-1) var(--space-3)" }}
            >
              <op.icon width={13} height={13} /> {op.label}
            </button>
          ))}
          {selectedText && (
            <>
              <span style={{ width: "1px", height: "14px", background: "var(--border-faint)", margin: "0 var(--space-2)" }} />
              {AI_SEL.map(op => (
                <button key={op.key} disabled={isAiProcessing} onClick={() => handleAiOp(op.key, true)}
                  className="btn-ghost" style={{ fontSize: "0.75rem", color: "var(--accent)", padding: "var(--space-1) var(--space-3)" }}
                >
                  <op.icon width={13} height={13} /> {op.label}
                </button>
              ))}
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button className="btn-outline" disabled={isGenerating} onClick={async () => { try { await startGeneration(projectId); toast({ title: "生成完成" }); } catch { toast({ title: "生成失败", variant: "destructive" } as any); } }} style={{ fontSize: "0.75rem" }}>
            {isGenerating ? <Loader2 width={12} height={12} className="animate-spin" /> : <Sparkles width={12} height={12} />} 下一章
          </button>
          <button className="btn-solid" disabled={currentChapter.isConfirmed} onClick={async () => { try { await fetch(`/api/projects/${projectId}/chapters/${chapterId}/confirm`, { method: "POST" }); toast({ title: "已确认入库" }); fetchChapter(projectId, chapterId); } catch { toast({ title: "确认失败", variant: "destructive" } as any); } }} style={{ fontSize: "0.75rem" }}>
            <CheckCircle2 width={12} height={12} /> 确认
          </button>
          <button className="btn-ghost" onClick={() => setShowPanel(!showPanel)} style={{ padding: "var(--space-1) var(--space-2)", fontSize: "0.7rem" }}>
            {showPanel ? "▸ 隐藏面板" : "◂ 信息"}
          </button>
        </div>
      </footer>
    </div>
  );
}
