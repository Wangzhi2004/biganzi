"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useChapterStore } from "@/stores/chapter.store";
import { AIResultCard } from "@/components/ai/ai-result-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, AlertTriangle, Repeat, Lightbulb, BookOpen } from "lucide-react";

interface TropeDetection {
  tropeName: string;
  chapters: number[];
  frequency: number;
  riskLevel: string;
  description: string;
}

interface TropeVariant {
  title: string;
  description: string;
  example: string;
}

interface RepeatedTrope {
  tropeName: string;
  occurrences: number;
  lastUsedChapter: number;
  variants: TropeVariant[];
}

export default function TropeVariantPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { chapters, fetchChapters } = useChapterStore();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    detectedTropes: TropeDetection[];
    repeatedTropes: RepeatedTrope[];
    suggestions: string[];
    totalChapters: number;
    commonTropes: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchChapters(projectId); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tropes/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level: string) => {
    if (level === "high") return "var(--rose)";
    if (level === "medium") return "var(--ochre)";
    return "var(--forest)";
  };

  return (
    <ScrollArea style={{ height: "100%" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "var(--space-12) var(--space-16)" }}>
        <header style={{ marginBottom: "var(--space-10)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-3)" }}>
            <h1 className="type-display" style={{ fontSize: "1.5rem" }}>套路变体生成器</h1>
            <span className="badge badge-draft">AI 分析</span>
          </div>
          <p className="type-body" style={{ color: "var(--text-muted)", maxWidth: "600px" }}>
            分析所有章节中使用的常见桥段，识别重复风险，并自动生成变体建议，避免读者审美疲劳。
          </p>
        </header>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          <button className="btn-solid" onClick={handleAnalyze} disabled={loading || chapters.length === 0}>
            {loading ? <Loader2 width={14} height={14} className="animate-spin" /> : <Sparkles width={14} height={14} />}
            {loading ? "分析中..." : "开始分析桥段"}
          </button>
          <span className="type-caption">{chapters.length} 章可用</span>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ marginBottom: "var(--space-6)", padding: "var(--space-3) var(--space-4)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle width={14} height={14} /> {error}
          </div>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {/* 概览 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>分析章节数</p>
                <p className="type-display" style={{ fontSize: "1.5rem" }}>{result.totalChapters}</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>检测到桥段</p>
                <p className="type-display" style={{ fontSize: "1.5rem" }}>{result.detectedTropes?.length || 0}</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>重复风险</p>
                <p className="type-display" style={{ fontSize: "1.5rem", color: result.repeatedTropes?.length > 0 ? "var(--rose)" : "var(--forest)" }}>
                  {result.repeatedTropes?.length || 0}
                </p>
              </div>
            </div>

            {/* 重复桥段 */}
            {result.repeatedTropes && result.repeatedTropes.length > 0 && (
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                  <Repeat width={16} height={16} style={{ color: "var(--rose)" }} />
                  <p className="type-label">重复桥段与变体建议</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  {result.repeatedTropes.map((rt, idx) => (
                    <AIResultCard
                      key={idx}
                      title={rt.tropeName}
                      badge={`使用 ${rt.occurrences} 次 · 最近第 ${rt.lastUsedChapter} 章`}
                      badgeClassName="badge-warning"
                      icon={<AlertTriangle width={14} height={14} />}
                    >
                      <p className="type-caption" style={{ marginBottom: "var(--space-3)" }}>
                        该桥段已被多次使用，建议尝试以下变体避免审美疲劳：
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        {rt.variants.map((v, vidx) => (
                          <div key={vidx} style={{ background: "var(--cream)", borderRadius: "var(--radius)", padding: "var(--space-3) var(--space-4)" }}>
                            <p className="type-body" style={{ fontWeight: 500, marginBottom: 2 }}>{v.title}</p>
                            <p className="type-caption" style={{ marginBottom: 2 }}>{v.description}</p>
                            <p className="type-caption" style={{ fontStyle: "italic", color: "var(--text-muted)" }}>示例：{v.example}</p>
                          </div>
                        ))}
                      </div>
                    </AIResultCard>
                  ))}
                </div>
              </section>
            )}

            {/* 所有检测到的桥段 */}
            {result.detectedTropes && result.detectedTropes.length > 0 && (
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                  <BookOpen width={16} height={16} style={{ color: "var(--text-muted)" }} />
                  <p className="type-label">全部桥段检测</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  {result.detectedTropes.map((dt, idx) => (
                    <div key={idx} style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-4)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                        <p className="type-body" style={{ fontWeight: 500 }}>{dt.tropeName}</p>
                        <span className="badge" style={{ color: riskColor(dt.riskLevel), borderColor: riskColor(dt.riskLevel) }}>
                          {dt.riskLevel === "high" ? "高风险" : dt.riskLevel === "medium" ? "中风险" : "低风险"}
                        </span>
                      </div>
                      <p className="type-caption" style={{ marginBottom: "var(--space-2)" }}>{dt.description}</p>
                      <p className="type-caption">出现于：第 {dt.chapters.join(", ")} 章 · 共 {dt.frequency} 次</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 综合建议 */}
            {result.suggestions && result.suggestions.length > 0 && (
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                  <Lightbulb width={16} height={16} style={{ color: "var(--accent)" }} />
                  <p className="type-label">AI 综合建议</p>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-5)" }}>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", margin: 0, paddingLeft: "var(--space-5)" }}>
                    {result.suggestions.map((s, idx) => (
                      <li key={idx} className="type-body">{s}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
