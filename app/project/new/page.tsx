"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Wand2,
} from "lucide-react";
import { useProjectStore } from "@/stores/project.store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallChain } from "@/components/ai/call-chain";
import { SceneCardList } from "@/components/ai/scene-card-list";
import { StateDiffPanel } from "@/components/ai/state-diff-panel";
import { ChapterGoalCard } from "@/components/ai/chapter-goal-card";
import { AIConsole } from "@/components/ai/ai-console";

const GENRES = [
  { value: "玄幻", label: "玄幻" }, { value: "都市", label: "都市" },
  { value: "科幻", label: "科幻" }, { value: "悬疑", label: "悬疑" },
  { value: "历史", label: "历史" }, { value: "仙侠", label: "仙侠" },
  { value: "末日", label: "末日" }, { value: "无限流", label: "无限流" },
];

interface StylePreset {
  name: string; narrativePOV: string; narrativeDistance: string;
  avgSentenceLength: number; dialogueRatio: number;
}

interface FormData {
  genre: string; idea: string; targetWords: string;
  targetReader: string; style: string; sampleChapter: string;
}

interface ConsoleStep {
  step: string;
  order: number;
  label: string;
  status: "pending" | "running" | "done" | "error";
  prompt?: any[];
  tokens: string;
  durationMs?: number;
  tokenCount?: number;
  error?: string;
  showPrompt?: boolean;
}

const STREAM_STEPS: Omit<ConsoleStep, "status" | "tokens">[] = [
  { step: "DNA_GENERATION", order: 1, label: "作品DNA生成" },
  { step: "SCENE_CARDS", order: 2, label: "场景卡设计" },
  { step: "CHAPTER_FUNCTION", order: 3, label: "章节功能推断" },
  { step: "CHAPTER_GOAL", order: 4, label: "章节目标设定" },
  { step: "PLANNER_SCENE_CARDS", order: 5, label: "场景卡规划" },
  { step: "CHAPTER_BODY", order: 6, label: "正文写作" },
  { step: "STYLE_DRIFT_CHECK", order: 7, label: "风格漂移检测" },
  { step: "STYLE_ALIGN", order: 8, label: "风格修正" },
  { step: "AUDIT", order: 9, label: "质量审计" },
  { step: "REWRITE", order: 10, label: "自动改写" },
  { step: "STATE_DIFF", order: 11, label: "状态差异提取" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject, isLoading } = useProjectStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    genre: "", idea: "", targetWords: "1000000",
    targetReader: "18-35岁男性读者", style: "", sampleChapter: "",
  });
  const [stylePresets, setStylePresets] = useState<StylePreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customStyle, setCustomStyle] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [stepError, setStepError] = useState("");
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Streaming state
  const [consoleSteps, setConsoleSteps] = useState<ConsoleStep[]>([]);
  const [currentTokens, setCurrentTokens] = useState<Record<string, string>>({});
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamModel, setStreamModel] = useState("");
  const [streamError, setStreamError] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/settings/presets").then(r => r.json()).then(d => Array.isArray(d) && setStylePresets(d)).catch(() => {});
  }, []);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const updateForm = (key: keyof FormData, val: string) => setForm(p => ({ ...p, [key]: val }));
  const canProceedStep1 = form.genre && form.idea && form.targetWords && form.targetReader;
  const canProceedStep2 = form.style || selectedPreset;

  const handleCreateProject = async () => {
    try {
      setStepError("");
      const project = await createProject({ name: form.idea.slice(0, 50), genre: form.genre, subGenre: form.genre, description: form.idea, status: "draft" });
      setProjectId(project.id);
      return project.id;
    } catch (err: any) {
      setStepError(err.message || "创建项目失败");
      return null;
    }
  };

  const handleInitialize = (pId: string) => {
    setStep(3);
    setStreamError("");
    setStreamConnected(false);
    setStreamModel("");
    setOverallProgress(0);
    setCurrentTokens({});

    // Initialize steps
    const initialSteps: ConsoleStep[] = STREAM_STEPS.map(s => ({
      ...s,
      status: "pending",
      tokens: "",
    }));
    setConsoleSteps(initialSteps);

    // Build SSE URL with POST body as query params (EventSource only supports GET)
    // We'll use fetch with ReadableStream instead
    const abortController = new AbortController();

    fetch(`/api/projects/${pId}/initialize/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genre: form.genre,
        idea: form.idea,
        targetWords: parseInt(form.targetWords),
        targetReader: form.targetReader,
        style: customStyle ? "custom" : selectedPreset,
        sampleChapter: form.sampleChapter || undefined,
      }),
      signal: abortController.signal,
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              handleSSEEvent(currentEvent, data);
            } catch {}
            currentEvent = "";
          }
        }
      }
    }).catch((err) => {
      if (err.name === "AbortError") return;
      setStreamError(err.message || "连接失败");
      setConsoleSteps(prev => prev.map(s =>
        s.status === "running" ? { ...s, status: "error" as const, error: err.message } : s
      ));
    });

    eventSourceRef.current = { close: () => abortController.abort() } as any;
  };

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case "connected":
        setStreamConnected(true);
        setStreamModel(data.model || "");
        break;

      case "step_start":
        setConsoleSteps(prev => {
          const exists = prev.some(s => s.step === data.step);
          if (exists) {
            return prev.map(s =>
              s.step === data.step
                ? { ...s, status: "running" as const, label: data.label || s.label }
                : s
            );
          }
          // Dynamically add steps not in the initial list (e.g. conditional steps)
          return [...prev, {
            step: data.step,
            order: data.order ?? prev.length + 1,
            label: data.label || data.step,
            status: "running" as const,
            tokens: "",
          }];
        });
        break;

      case "prompt":
        setConsoleSteps(prev => prev.map(s =>
          s.step === data.step
            ? { ...s, prompt: data.messages }
            : s
        ));
        break;

      case "token":
        setCurrentTokens(prev => ({
          ...prev,
          [data.step]: (prev[data.step] || "") + data.delta,
        }));
        break;

      case "step_end":
        setConsoleSteps(prev => {
          const updated = prev.map(s =>
            s.step === data.step
              ? {
                  ...s,
                  status: "done" as const,
                  durationMs: data.durationMs,
                  tokenCount: data.tokens,
                }
              : s
          );
          const doneCount = updated.filter(s => s.status === "done").length;
          setOverallProgress((doneCount / updated.length) * 100);
          return updated;
        });
        break;

      case "complete":
        setConsoleSteps(prev => prev.map(s =>
          s.status === "pending" ? { ...s, status: "done" as const } : s
        ));
        setOverallProgress(100);
        setGeneratedData(data.data);

        // Fetch logs for step 4
        if (data.jobId) {
          setLogsLoading(true);
          fetch(`/api/projects/${data.projectId}/generate/${data.jobId}/logs`)
            .then(r => r.ok ? r.json() : { logs: [] })
            .then(d => setAiLogs(d.logs || []))
            .catch(() => {})
            .finally(() => setLogsLoading(false));
        }

        // Auto-advance to step 4
        setTimeout(() => setStep(4), 1500);
        break;

      case "error":
        setStreamError(data.message || "未知错误");
        if (data.step && data.step !== "unknown") {
          setConsoleSteps(prev => prev.map(s =>
            s.step === data.step
              ? { ...s, status: "error" as const, error: data.message }
              : s.status === "running"
                ? { ...s, status: "error" as const, error: data.message }
                : s
          ));
        }
        break;
    }
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border-faint)", padding: "0 var(--space-16)", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px", maxWidth: "720px", margin: "0 auto" }}>
          <Link href="/" style={{ textDecoration: "none" }}><button className="btn-ghost"><ChevronLeft width={14} height={14} /> 返回</button></Link>
          <span className="type-display" style={{ fontSize: "0.9375rem" }}>创建新作品</span>
          <span style={{ width: "40px" }} />
        </div>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "var(--space-12) var(--space-16)" }}>
        {/* Steps indicator */}
        <nav style={{ marginBottom: "var(--space-10)", paddingBottom: "var(--space-6)", borderBottom: "1px solid var(--border-faint)" }}>
          <ol style={{ display: "flex", alignItems: "center", gap: 0, listStyle: "none" }}>
            {[1, 2, 3, 4].map(s => (
              <li key={s} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <span style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.6875rem", fontWeight: 600,
                  background: step > s ? "var(--accent)" : step === s ? "var(--accent)" : "transparent",
                  color: step >= s ? "#fff" : "var(--text-muted)",
                  border: step > s ? "none" : "1px solid var(--border)",
                  transition: "all 0.3s ease",
                }}>{step > s ? <Check width={11} height={11} /> : s}</span>
                {s < 4 && <span style={{
                  width: "32px", height: "1px", margin: "0 var(--space-2)",
                  background: step > s ? "var(--accent)" : "var(--border-faint)",
                  transition: "background-color 0.4s ease",
                }} />}
              </li>
            ))}
            <li style={{ marginLeft: "var(--space-4)" }}>
              <span className="type-label">{step === 1 ? "基本信息" : step === 2 ? "风格选择" : step === 3 ? "AI 生成中" : "审查确认"}</span>
            </li>
          </ol>
        </nav>

        {/* ====== STEP 1 ====== */}
        {step === 1 && (
          <>
            <h2 className="type-display" style={{ fontSize: "1.5rem", color: "var(--text)", marginBottom: "var(--space-3)", letterSpacing: "-0.02em" }}>基本信息</h2>
            <p className="type-body" style={{ marginBottom: "var(--space-8)", maxWidth: "480px" }}>告诉我们你的故事创意，AI 将为你构建完整的世界</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <div>
                <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>小说类型</label>
                <Select value={form.genre} onValueChange={v => updateForm("genre", v)}>
                  <SelectTrigger className="input-field">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>核心创意</label>
                <textarea
                  placeholder="一句话概括你的故事..."
                  value={form.idea}
                  onChange={e => updateForm("idea", e.target.value)}
                  className="input-field"
                  rows={4}
                  style={{ resize: "vertical", minHeight: "88px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                <div>
                  <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>目标字数</label>
                  <input type="number" value={form.targetWords}
                    onChange={e => updateForm("targetWords", e.target.value)} className="input-field" />
                  <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>
                    {parseInt(form.targetWords) >= 10000 ? `约 ${(parseInt(form.targetWords) / 10000).toFixed(0)} 万字` : `${form.targetWords} 字`}
                  </p>
                </div>
                <div>
                  <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>目标读者</label>
                  <input value={form.targetReader}
                    onChange={e => updateForm("targetReader", e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            <div style={{ marginTop: "var(--space-8)", textAlign: "right" }}>
              <button onClick={() => setStep(2)} disabled={!canProceedStep1} className="btn-solid">下一步 <ChevronRight width={14} height={14} /></button>
            </div>
          </>
        )}

        {/* ====== STEP 2 ====== */}
        {step === 2 && (
          <>
            <h2 className="type-display" style={{ fontSize: "1.5rem", color: "var(--text)", marginBottom: "var(--space-3)", letterSpacing: "-0.02em" }}>风格选择</h2>
            <p className="type-body" style={{ marginBottom: "var(--space-8)", maxWidth: "480px" }}>选择一个预设风格，或自定义描述你想要的写作风格</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
              {stylePresets.map(preset => (
                <button key={preset.name} onClick={() => { setSelectedPreset(preset.name); setCustomStyle(false); }}
                  style={{
                    padding: "var(--space-5)", textAlign: "left",
                    border: selectedPreset === preset.name && !customStyle ? "1px solid var(--accent)" : "1px solid var(--border-faint)",
                    borderRadius: "var(--radius)", background: "var(--surface)",
                    cursor: "pointer", transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                    <span className="type-body" style={{ fontWeight: 500 }}>{preset.name}</span>
                    {selectedPreset === preset.name && !customStyle && <Check width={14} height={14} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
                  </div>
                  <p className="type-caption">{preset.narrativePOV} · 句均{preset.avgSentenceLength} · 对话{Math.round(preset.dialogueRatio * 100)}%</p>
                </button>
              ))}

              <button onClick={() => { setCustomStyle(true); setSelectedPreset(""); }}
                style={{
                  padding: "var(--space-5)", textAlign: "left",
                  border: customStyle ? "1px solid var(--accent)" : "1px dashed var(--border-faint)",
                  borderRadius: "var(--radius)", cursor: "pointer", transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                  <span className="type-body" style={{ fontWeight: customStyle ? 500 : 400, color: customStyle ? "var(--text)" : "var(--text-muted)" }}>自定义风格</span>
                  {customStyle && <Check width={14} height={14} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
                </div>
                <p className="type-caption">用文字描述你想要的写作风格</p>
              </button>
            </div>

            {customStyle && (
              <div style={{ marginBottom: "var(--space-6)" }}>
                <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>风格描述</label>
                <textarea placeholder="描述你想要的写作风格..." value={form.style}
                  onChange={e => updateForm("style", e.target.value)} className="input-field" rows={3} style={{ resize: "vertical" }} />
              </div>
            )}

            {stepError && <p className="type-body" style={{ color: "var(--rose)", marginBottom: "var(--space-6)" }}>{stepError}</p>}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} className="btn-ghost"><ChevronLeft width={14} height={14} /> 上一步</button>
              <button onClick={async () => { const pid = await handleCreateProject(); if (pid) handleInitialize(pid); }} disabled={!canProceedStep2 || isLoading} className="btn-solid">
                {isLoading ? <Loader2 width={14} height={14} className="animate-spin" /> : <Wand2 width={14} height={14} />} 开始生成
              </button>
            </div>
          </>
        )}

        {/* ====== STEP 3 - AI Console ====== */}
        {step === 3 && (
          <div style={{ paddingTop: "var(--space-4)" }}>
            <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
              <h2 className="type-display" style={{ fontSize: "1.25rem", marginBottom: "var(--space-2)" }}>
                AI 正在创作中
              </h2>
              <p className="type-body" style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                实时查看 AI 的思考过程和生成进度
              </p>
            </div>

            <AIConsole
              steps={consoleSteps}
              currentTokens={currentTokens}
              overallProgress={overallProgress}
              connected={streamConnected}
              model={streamModel}
              error={streamError}
            />

            {streamError && (
              <div style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
                <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
                  <button onClick={() => { if (projectId) handleInitialize(projectId); }} className="btn-solid">重试</button>
                  <button onClick={() => setStep(2)} className="btn-ghost">返回修改</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== STEP 4 ====== */}
        {step === 4 && (
          <>
            <h2 className="type-display" style={{ fontSize: "1.5rem", color: "var(--text)", marginBottom: "var(--space-3)", letterSpacing: "-0.02em" }}>审查确认</h2>
            <p className="type-body" style={{ marginBottom: "var(--space-8)" }}>AI 已完成作品初始化，请确认以下内容</p>

            {generatedData && (
              <Tabs defaultValue="dna">
                <TabsList style={{
                  borderBottom: "1px solid var(--border-faint)", background: "transparent",
                  padding: 0, gap: 0, height: "auto", marginBottom: "var(--space-6)",
                }}>
                  {[
                    { v: "dna", l: "DNA" }, { v: "protagonist", l: "主角" },
                    { v: "worldview", l: "世界观" }, { v: "outline", l: "大纲" },
                    { v: "sceneCards", l: "场景卡" },
                    { v: "chapter1", l: "第一章" },
                    { v: "stateDiff", l: "状态差异" },
                    { v: "audit", l: "审核报告" },
                    { v: "aiProcess", l: "AI 过程" },
                  ].map(t => (
                    <TabsTrigger key={t.v} value={t.v}
                      style={{
                        padding: "var(--space-3) var(--space-4)", background: "none", border: "none",
                        fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)", cursor: "pointer",
                        borderBottom: "2px solid transparent", transition: "color 0.15s ease",
                      }}
                    >{t.l}</TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="dna">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    {generatedData.dna ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                        {[
                          ["核心钩子", generatedData.dna.coreHook],
                          ["主角主题", generatedData.dna.protagonistTheme],
                          ["爽点机制", generatedData.dna.pleasureMechanism],
                          ["风格方向", generatedData.dna.styleDirection],
                        ].map(([k, v]) => (
                          <div key={String(k)}>
                            <p className="type-label" style={{ marginBottom: "var(--space-1)" }}>{k}</p>
                            <p className="type-body">{v || "未生成"}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>数据未生成</p>}
                  </div>
                </TabsContent>

                <TabsContent value="protagonist">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    {generatedData.dna?.protagonist ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
                          <span style={{
                            width: "28px", height: "28px", borderRadius: "50%",
                            background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-soft)",
                          }}>{generatedData.dna.protagonist.name?.[0]}</span>
                          <div><p className="type-body" style={{ fontWeight: 500 }}>{generatedData.dna.protagonist.name}</p><p className="type-caption">{generatedData.dna.protagonist.roleType}</p></div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                          <div><p className="type-label" style={{ marginBottom: "var(--space-1)" }}>欲望</p><p className="type-body">{generatedData.dna.protagonist.desire || "-"}</p></div>
                          <div><p className="type-label" style={{ marginBottom: "var(--space-1)" }}>恐惧</p><p className="type-body">{generatedData.dna.protagonist.fear || "-"}</p></div>
                        </div>
                      </div>
                    ) : <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>数据未生成</p>}
                  </div>
                </TabsContent>

                <TabsContent value="worldview">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    {generatedData.dna?.worldRules?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        {generatedData.dna.worldRules.map((rule: any, i: number) => (
                          <div key={i} style={{ padding: "var(--space-4)", background: "var(--bg)", borderRadius: "var(--radius)" }}>
                            <span className="badge badge-warning" style={{ marginBottom: "var(--space-2)" }}>{rule.category}</span>
                            <p className="type-body">{rule.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>数据未生成</p>}
                  </div>
                </TabsContent>

                <TabsContent value="outline">
                  <div style={{ borderTop: "1px solid var(--border-faint)" }}>
                    {(generatedData.dna?.chapterPlan || []).map((ch: any, i: number) => (
                      <div key={i} className="row-item" style={{ borderBottom: "1px solid var(--border-faint)", padding: "var(--space-3) 0" }}>
                        <span className="type-mono type-caption" style={{ minWidth: "20px" }}>{ch.chapterNumber}</span>
                        <span className="type-body" style={{ flex: 1 }}>{ch.title}</span>
                        <span className="badge badge-draft">{ch.chapterFunction}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="sceneCards">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    {generatedData.firstChapter?.sceneCards?.length > 0 ? (
                      <SceneCardList scenes={generatedData.firstChapter.sceneCards} />
                    ) : <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>未生成场景卡</p>}
                  </div>
                </TabsContent>

                <TabsContent value="chapter1">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    {generatedData.firstChapter ? (
                      <div>
                        <ChapterGoalCard
                          goal={generatedData.firstChapter.chapterGoal}
                          className="mb-4"
                        />
                        <h3 className="type-display" style={{ fontSize: "1rem", marginBottom: "var(--space-4)" }}>
                          {generatedData.firstChapter.chapterTitle}
                        </h3>
                        <p className="type-body" style={{ whiteSpace: "pre-wrap", lineHeight: 1.85 }}>
                          {generatedData.firstChapter.chapterBody || "内容生成中..."}
                        </p>
                      </div>
                    ) : <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>未生成</p>}
                  </div>
                </TabsContent>

                <TabsContent value="stateDiff">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    <StateDiffPanel stateDiff={generatedData.firstChapter?.stateDiff} />
                  </div>
                </TabsContent>

                <TabsContent value="audit">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    {generatedData.firstChapter?.auditReport ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="type-label">质量评分</span>
                          <span className="type-display" style={{
                            fontSize: "1.5rem", fontWeight: 700,
                            color: generatedData.firstChapter.auditReport.qualityScore >= 80 ? "var(--forest)"
                              : generatedData.firstChapter.auditReport.qualityScore >= 60 ? "var(--ochre)" : "var(--rose)",
                          }}>
                            {Math.round(generatedData.firstChapter.auditReport.qualityScore)}
                          </span>
                        </div>
                        {generatedData.firstChapter.auditReport.risks?.length > 0 && (
                          <div>
                            <p className="type-label mb-2">风险 ({generatedData.firstChapter.auditReport.risks.length})</p>
                            <div className="space-y-1.5">
                              {generatedData.firstChapter.auditReport.risks.map((risk: any, i: number) => (
                                <div key={i} className="text-xs p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                                  <span className="text-zinc-400">[{risk.level}]</span>{" "}
                                  <span className="text-zinc-300">{risk.description}</span>
                                  {risk.suggestion && <p className="text-zinc-500 mt-0.5">建议：{risk.suggestion}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {generatedData.firstChapter.auditReport.rewriteActions?.length > 0 && (
                          <div>
                            <p className="type-label mb-2">改写建议 ({generatedData.firstChapter.auditReport.rewriteActions.length})</p>
                            <div className="space-y-1.5">
                              {generatedData.firstChapter.auditReport.rewriteActions.map((action: any, i: number) => (
                                <div key={i} className="text-xs p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                                  <span className="text-zinc-300 font-medium">{action.action}</span>
                                  <p className="text-zinc-500 mt-0.5">{action.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>未生成审核报告</p>}
                  </div>
                </TabsContent>

                <TabsContent value="aiProcess">
                  <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)" }}>
                    {aiLogs.length > 0 ? (
                      <CallChain logs={aiLogs} />
                    ) : logsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8">
                        <Loader2 width={14} height={14} className="animate-spin text-zinc-500" />
                        <span className="type-caption">加载 AI 调用记录...</span>
                      </div>
                    ) : (
                      <p className="type-caption text-center py-8">暂无 AI 调用记录</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <hr className="rule" style={{ margin: "var(--space-8) 0 var(--space-5)" }} />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(2)} className="btn-ghost"><ChevronLeft width={14} height={14} /> 重新生成</button>
              <button onClick={() => projectId && router.push(`/project/${projectId}`)} className="btn-solid"><Check width={14} height={14} /> 确认入库</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
