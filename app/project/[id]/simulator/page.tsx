"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useChapterStore } from "@/stores/chapter.store";
import { AIResultCard } from "@/components/ai/ai-result-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, AlertTriangle, Users, ThumbsUp, ThumbsDown, Heart, Brain, Zap, BookOpen } from "lucide-react";

interface PersonaReaction {
  name: string;
  traits: string;
  reaction: string;
  highlights: string[];
  complaints: string[];
  continueReadingRate: number;
  satisfaction: number;
  engagement: number;
}

interface OverallPrediction {
  continueReadingRate: number;
  satisfaction: number;
  engagement: number;
  summary: string;
}

interface SimulatorResult {
  chapterId: string;
  chapterNumber: number;
  title: string;
  overallPrediction: OverallPrediction;
  personas: PersonaReaction[];
  dropRiskPoints: string[];
  retentionSuggestions: string[];
}

function scoreColor(n: number) {
  if (n >= 80) return "var(--forest)";
  if (n >= 60) return "var(--ochre)";
  return "var(--rose)";
}

const PERSONA_ICONS: Record<string, React.ReactNode> = {
  "爽文读者": <Zap width={14} height={14} />,
  "剧情读者": <Brain width={14} height={14} />,
  "情感读者": <Heart width={14} height={14} />,
};

export default function ReaderSimulatorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { chapters, fetchChapters } = useChapterStore();

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimulatorResult[]>([]);
  const [averageRate, setAverageRate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  useEffect(() => { fetchChapters(projectId); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async (chapterId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/simulator/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapterId ? { chapterId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "模拟失败");
      setResults(data.results || []);
      setAverageRate(data.averageContinueReadingRate || 0);
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
            <h1 className="type-display" style={{ fontSize: "1.5rem" }}>读者模拟器</h1>
            <span className="badge badge-draft">AI 分析</span>
          </div>
          <p className="type-body" style={{ color: "var(--text-muted)", maxWidth: "600px" }}>
            模拟三种典型读者画像对章节的阅读反应，预测追读率、满意度与投入度，识别可能导致弃读的风险点。
          </p>
        </header>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-8)", flexWrap: "wrap" }}>
          <button className="btn-solid" onClick={() => handleAnalyze()} disabled={loading || chapters.length === 0}>
            {loading ? <Loader2 width={14} height={14} className="animate-spin" /> : <Sparkles width={14} height={14} />}
            {loading ? "模拟中..." : "模拟全部章节"}
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
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>平均追读率</p>
                <p className="type-display" style={{ fontSize: "1.5rem", color: scoreColor(averageRate) }}>{averageRate}%</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>模拟章节</p>
                <p className="type-display" style={{ fontSize: "1.5rem" }}>{results.length}</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>高追读（≥80%）</p>
                <p className="type-display" style={{ fontSize: "1.5rem", color: "var(--forest)" }}>
                  {results.filter((r) => (r.overallPrediction?.continueReadingRate || 0) >= 80).length}
                </p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>流失风险（&lt;60%）</p>
                <p className="type-display" style={{ fontSize: "1.5rem", color: "var(--rose)" }}>
                  {results.filter((r) => (r.overallPrediction?.continueReadingRate || 0) < 60).length}
                </p>
              </div>
            </div>

            {/* 快速单章模拟 */}
            <section>
              <p className="type-label" style={{ marginBottom: "var(--space-4)" }}>快速模拟单章</p>
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
                        borderColor: analyzed ? scoreColor(analyzed.overallPrediction?.continueReadingRate || 0) : undefined,
                        color: analyzed ? scoreColor(analyzed.overallPrediction?.continueReadingRate || 0) : undefined,
                      }}
                    >
                      <Users width={12} height={12} />
                      第{ch.chapterNumber}章
                      {analyzed && ` · ${Math.round(analyzed.overallPrediction?.continueReadingRate || 0)}%`}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 详细结果 */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                <Users width={16} height={16} style={{ color: "var(--text-muted)" }} />
                <p className="type-label">模拟结果详情</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                {results.map((r) => (
                  <AIResultCard
                    key={r.chapterId}
                    title={`第${r.chapterNumber}章《${r.title}》`}
                    badge={`追读率 ${Math.round(r.overallPrediction?.continueReadingRate || 0)}%`}
                    badgeClassName={
                      (r.overallPrediction?.continueReadingRate || 0) >= 80
                        ? "badge-active"
                        : (r.overallPrediction?.continueReadingRate || 0) >= 60
                        ? "badge-warning"
                        : "badge-danger"
                    }
                    icon={<BookOpen width={14} height={14} />}
                  >
                    {/* 总体预测 */}
                    {r.overallPrediction && (
                      <div style={{ background: "var(--cream)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                        <p className="type-body" style={{ marginBottom: "var(--space-3)" }}>{r.overallPrediction.summary}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
                          {[
                            { label: "追读率", value: r.overallPrediction.continueReadingRate },
                            { label: "满意度", value: r.overallPrediction.satisfaction },
                            { label: "投入度", value: r.overallPrediction.engagement },
                          ].map((m) => (
                            <div key={m.label} style={{ textAlign: "center" }}>
                              <p className="type-caption">{m.label}</p>
                              <p className="type-display" style={{ fontSize: "1.25rem", color: scoreColor(m.value) }}>{Math.round(m.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 读者画像 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {r.personas?.map((p, idx) => (
                        <div key={idx} style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-4)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                              <span style={{ color: "var(--text-muted)" }}>{PERSONA_ICONS[p.name] || <Users width={14} height={14} />}</span>
                              <p className="type-body" style={{ fontWeight: 500 }}>{p.name}</p>
                            </div>
                            <div style={{ display: "flex", gap: "var(--space-4)" }}>
                              <span className="type-caption">追读 {Math.round(p.continueReadingRate)}%</span>
                              <span className="type-caption">满意 {Math.round(p.satisfaction)}</span>
                              <span className="type-caption">投入 {Math.round(p.engagement)}</span>
                            </div>
                          </div>
                          <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>{p.traits}</p>
                          <p className="type-body" style={{ fontSize: "0.8125rem", marginBottom: "var(--space-3)" }}>{p.reaction}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                            {p.highlights && p.highlights.length > 0 && (
                              <div>
                                <p className="type-caption" style={{ color: "var(--forest)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                  <ThumbsUp width={10} height={10} /> 点赞
                                </p>
                                {p.highlights.map((h, i) => (
                                  <p key={i} className="type-caption">• {h}</p>
                                ))}
                              </div>
                            )}
                            {p.complaints && p.complaints.length > 0 && (
                              <div>
                                <p className="type-caption" style={{ color: "var(--rose)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                  <ThumbsDown width={10} height={10} /> 吐槽
                                </p>
                                {p.complaints.map((h, i) => (
                                  <p key={i} className="type-caption">• {h}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 风险点与建议 */}
                    {(r.dropRiskPoints?.length > 0 || r.retentionSuggestions?.length > 0) && (
                      <div style={{ marginTop: "var(--space-3)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                        {r.dropRiskPoints && r.dropRiskPoints.length > 0 && (
                          <div>
                            <p className="type-caption" style={{ color: "var(--rose)", marginBottom: "var(--space-2)" }}>流失风险点</p>
                            <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                              {r.dropRiskPoints.map((p, i) => (
                                <li key={i} className="type-caption">{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {r.retentionSuggestions && r.retentionSuggestions.length > 0 && (
                          <div>
                            <p className="type-caption" style={{ color: "var(--forest)", marginBottom: "var(--space-2)" }}>留存建议</p>
                            <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                              {r.retentionSuggestions.map((s, i) => (
                                <li key={i} className="type-caption">{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
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
