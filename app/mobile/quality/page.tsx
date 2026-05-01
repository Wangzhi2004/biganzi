"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, Loader2, BarChart3, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Minus,
} from "lucide-react";

interface QualityData {
  summary: { avgScore: number; minScore: number; maxScore: number; totalChapters: number };
  chapters: { chapterNumber: number; title: string; qualityScore: number | null; auditStatus: string; wordCount: number }[];
  auditReports: any[];
  consistencyTrend: any[];
  riskCounts: { red: number; yellow: number; green: number };
}

export default function QualityPage() {
  const [data, setData] = useState<QualityData | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mobile/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects?.map((p: any) => ({ id: p.id, name: p.name })) || []);
        if (d.projects?.length > 0) setSelectedProject(d.projects[0].id);
      });
  }, []);

  const fetchQuality = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mobile/quality?projectId=${selectedProject}`);
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { fetchQuality(); }, [fetchQuality]);

  const scoreColor = (s: number) => s >= 80 ? "var(--forest)" : s >= 60 ? "var(--ochre)" : "var(--rose)";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
        <a href="/mobile" style={{ color: "var(--text-muted)" }}><ChevronLeft style={{ width: 20, height: 20 }} /></a>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>质量报告</h1>
      </div>

      {/* 项目选择 */}
      {projects.length > 1 && (
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", color: "var(--text)", fontSize: 14, margin: "12px 0" }}
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {loading || !data ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 style={{ width: 24, height: 24, color: "var(--accent)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {/* 概览卡片 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: scoreColor(data.summary.avgScore), margin: 0 }}>{data.summary.avgScore.toFixed(0)}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>均分</p>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>{data.summary.totalChapters}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>已评分</p>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: data.riskCounts.red > 0 ? "var(--rose)" : "var(--forest)", margin: 0 }}>{data.riskCounts.red}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>高风险</p>
            </div>
          </div>

          {/* 风险分布 */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 10px" }}>审稿风险分布</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "通过", count: data.riskCounts.green, color: "var(--forest)", bg: "var(--forest-pale)" },
                { label: "警告", count: data.riskCounts.yellow, color: "var(--ochre)", bg: "var(--ochre-pale)" },
                { label: "风险", count: data.riskCounts.red, color: "var(--rose)", bg: "var(--rose-pale)" },
              ].map((r) => (
                <div key={r.label} style={{ flex: 1, background: r.bg, borderRadius: 6, padding: "8px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: r.color, margin: 0 }}>{r.count}</p>
                  <p style={{ fontSize: 11, color: r.color, margin: 0 }}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 章节质量趋势（简单柱状图） */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 10px" }}>章节质量趋势</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
              {data.chapters.map((ch) => {
                const score = ch.qualityScore || 0;
                const height = Math.max((score / 100) * 70, 4);
                return (
                  <div key={ch.chapterNumber} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{score.toFixed(0)}</span>
                    <div style={{ width: "100%", height, background: scoreColor(score), borderRadius: "2px 2px 0 0", minHeight: 4 }} />
                    <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{ch.chapterNumber}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 最近审稿详情 */}
          {data.auditReports.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 10px" }}>最近审稿</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.auditReports.slice(0, 5).map((r: any, i: number) => (
                  <div key={i} style={{ padding: "8px 10px", background: "var(--cream)", borderRadius: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text)" }}>
                        第 {r.chapter?.chapterNumber} 章「{r.chapter?.title}」
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(r.qualityScore) }}>
                        {r.qualityScore?.toFixed(0)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {[
                        { label: "主线", score: r.mainPlotScore },
                        { label: "人物", score: r.characterChangeScore },
                        { label: "冲突", score: r.conflictScore },
                        { label: "钩子", score: r.hookScore },
                        { label: "风格", score: r.styleConsistencyScore },
                      ].map((dim) => (
                        <span key={dim.label} style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 8,
                          background: dim.score >= 7 ? "var(--forest-pale)" : dim.score >= 5 ? "var(--ochre-pale)" : "var(--rose-pale)",
                          color: dim.score >= 7 ? "var(--forest)" : dim.score >= 5 ? "var(--ochre)" : "var(--rose)",
                        }}>
                          {dim.label} {dim.score?.toFixed(0)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
