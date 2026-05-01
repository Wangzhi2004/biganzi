"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChapterStore } from "@/stores/chapter.store";
import { AIResultCard } from "@/components/ai/ai-result-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, AlertTriangle, Anchor, TrendingUp, BookOpen } from "lucide-react";

interface HookScore {
  curiosityScore: number;
  tensionScore: number;
  emotionScore: number;
  promiseScore: number;
}

interface HookResult {
  chapterId: string;
  chapterNumber: number;
  title: string;
  hookStrength: number;
  scores: HookScore;
  endingSummary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  hookType: string;
}

function scoreColor(n: number) {
  if (n >= 80) return "var(--forest)";
  if (n >= 60) return "var(--ochre)";
  return "var(--rose)";
}

export default function HookDiagnosisPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { chapters, fetchChapters } = useChapterStore();

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HookResult[]>([]);
  const [average, setAverage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  useEffect(() => { fetchChapters(projectId); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async (chapterId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/hooks/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapterId ? { chapterId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "诊断失败");
      setResults(data.results || []);
      setAverage(data.averageHookStrength || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollArea style={{ height: "100%" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "var(--space-12) var(--space-16)" }}>
        <header style={{ marginBottom: "var(--space-10)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-3)" }}>
            <h1 className="type-display" style={{ fontSize: "1.5rem" }}>追读钩子诊断</h1>
            <span className="badge badge-draft">AI 分析</span>
          </div>
          <p className="type-body" style={{ color: "var(--text-muted)", maxWidth: "600px" }}>
            逐章诊断章末追读钩子强度，从好奇心、张力、情绪、承诺四个维度评估读者继续阅读的欲望。
          </p>
        </header>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-8)", flexWrap: "wrap" }}>
          <button className="btn-solid" onClick={() => handleAnalyze()} disabled={loading || chapters.length === 0}>
            {loading ? <Loader2 width={14} height={14} className="animate-spin" /> : <Sparkles width={14} height={14} />}
            {loading ? "诊断中..." : "诊断全部章节"}
          </button>
          <span className="type-caption">{chapters.length} 章可用</span>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ marginBottom: "var(--space-6)", padding: "var(--space-3) var(--space-4)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle width={14} height={14} /> {error}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {/* 总览 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>平均钩子强度</p>
                <p className="type-display" style={{ fontSize: "1.5rem", color: scoreColor(average) }}>{average}</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>诊断章节</p>
                <p className="type-display" style={{ fontSize: "1.5rem" }}>{results.length}</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>强钩子（≥80）</p>
                <p className="type-display" style={{ fontSize: "1.5rem", color: "var(--forest)" }}>
                  {results.filter((r) => (r.hookStrength || 0) >= 80).length}
                </p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>弱钩子（&lt;60）</p>
                <p className="type-display" style={{ fontSize: "1.5rem", color: "var(--rose)" }}>
                  {results.filter((r) => (r.hookStrength || 0) < 60).length}
                </p>
              </div>
            </div>

            {/* 章节选择快速诊断 */}
            <section>
              <p className="type-label" style={{ marginBottom: "var(--space-4)" }}>快速诊断单章</p>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {chapters.map((ch) => {
                  const analyzed = results.find((r) => r.chapterId === ch.id);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => { setSelectedChapter(ch.id); handleAnalyze(ch.id); }}
                      className="btn-ghost"
                      style={{
                        fontSize: "0.75rem",
                        borderColor: analyzed ? scoreColor(analyzed.hookStrength || 0) : undefined,
                        color: analyzed ? scoreColor(analyzed.hookStrength || 0) : undefined,
                      }}
                    >
                      <Anchor width={12} height={12} />
                      第{ch.chapterNumber}章
                      {analyzed && ` · ${Math.round(analyzed.hookStrength)}`}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 详细结果 */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                <TrendingUp width={16} height={16} style={{ color: "var(--text-muted)" }} />
                <p className="type-label">详细诊断报告</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {results.map((r) => (
                  <AIResultCard
                    key={r.chapterId}
                    title={`第${r.chapterNumber}章《${r.title}》`}
                    badge={`${Math.round(r.hookStrength || 0)} 分 · ${r.hookType || "未知类型"}`}
                    badgeClassName={
                      (r.hookStrength || 0) >= 80
                        ? "badge-active"
                        : (r.hookStrength || 0) >= 60
                        ? "badge-warning"
                        : "badge-danger"
                    }
                    icon={<BookOpen width={14} height={14} />}
                  >
                    {/* 四维评分 */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                      {[
                        { label: "好奇心", key: "curiosityScore" },
                        { label: "张力", key: "tensionScore" },
                        { label: "情绪", key: "emotionScore" },
                        { label: "承诺", key: "promiseScore" },
                      ].map((dim) => {
                        const val = (r.scores as any)?.[dim.key] || 0;
                        return (
                          <div key={dim.key} style={{ textAlign: "center" }}>
                            <p className="type-caption" style={{ marginBottom: 2 }}>{dim.label}</p>
                            <p className="type-display" style={{ fontSize: "1.125rem", color: scoreColor(val) }}>{Math.round(val)}</p>
                            <div style={{ height: 3, background: "var(--cream)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${val}%`, background: scoreColor(val), borderRadius: 2 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {r.endingSummary && (
                      <div style={{ background: "var(--cream)", borderRadius: "var(--radius)", padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-3)" }}>
                        <p className="type-caption" style={{ marginBottom: 2 }}>结尾摘要</p>
                        <p className="type-body" style={{ fontSize: "0.8125rem" }}>{r.endingSummary}</p>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                      {r.strengths && r.strengths.length > 0 && (
                        <div>
                          <p className="type-caption" style={{ color: "var(--forest)", marginBottom: "var(--space-2)" }}>优势</p>
                          <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                            {r.strengths.map((s, i) => (
                              <li key={i} className="type-caption">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.weaknesses && r.weaknesses.length > 0 && (
                        <div>
                          <p className="type-caption" style={{ color: "var(--rose)", marginBottom: "var(--space-2)" }}>不足</p>
                          <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                            {r.weaknesses.map((s, i) => (
                              <li key={i} className="type-caption">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {r.suggestions && r.suggestions.length > 0 && (
                      <div style={{ marginTop: "var(--space-3)", borderTop: "1px solid var(--border-faint)", paddingTop: "var(--space-3)" }}>
                        <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>改进建议</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                          {r.suggestions.map((s, i) => (
                            <p key={i} className="type-body" style={{ fontSize: "0.8125rem" }}>• {s}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: "var(--space-3)", textAlign: "right" }}>
                      <button className="btn-ghost" style={{ fontSize: "0.7rem" }} onClick={() => router.push(`/project/${projectId}/editor/${r.chapterId}`)}>
                        去编辑器修改 →
                      </button>
                    </div>
                  </AIResultCard>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
