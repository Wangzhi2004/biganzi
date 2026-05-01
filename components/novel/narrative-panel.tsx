"use client";

import { cn } from "@/lib/utils";
import { CHAPTER_FUNCTION_LABELS, ChapterFunction } from "@/types";

interface NarrativePanelProps {
  chapterGoal?: string;
  chapterFunction?: ChapterFunction;
  characters?: Array<{ id: string; name: string; roleType?: string }>;
  foreshadows?: Array<{ id: string; clueText: string; status: string }>;
  qualityScore?: number;
  styleDeviation?: number;
}

function scoreColor(n: number): string {
  if (n >= 80) return "var(--forest)";
  if (n >= 60) return "var(--ochre)";
  return "var(--rose)";
}

export function NarrativePanel({ chapterGoal, chapterFunction, characters = [], foreshadows = [], qualityScore, styleDeviation }: NarrativePanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: "1px solid var(--border-faint)", background: "var(--surface)" }}>
      <div style={{ padding: "var(--space-5) var(--space-6)", borderBottom: "1px solid var(--border-faint)" }}>
        <p className="type-label">章节上下文</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-6)" }}>
        {chapterFunction && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <p className="type-label" style={{ marginBottom: "var(--space-2)" }}>本章功能</p>
            <span className="badge badge-warning">{CHAPTER_FUNCTION_LABELS[chapterFunction]}</span>
          </div>
        )}

        {chapterGoal && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <p className="type-label" style={{ marginBottom: "var(--space-2)" }}>本章目标</p>
            <p className="type-body">{chapterGoal}</p>
          </div>
        )}

        <hr className="rule" style={{ margin: "var(--space-6) 0 var(--space-5)" }} />

        {characters.length > 0 && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>出场人物 · {characters.length}</p>
            {characters.map(char => (
              <div key={char.id} className="row-item" style={{ padding: "var(--space-2) 0" }}>
                <span style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "var(--cream)", fontSize: "0.6875rem", fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", flexShrink: 0,
                }}>{char.name[0]}</span>
                <span className="type-body" style={{ fontSize: "0.8125rem" }}>{char.name}</span>
                {char.roleType && <span className="type-caption" style={{ marginLeft: "auto" }}>{char.roleType}</span>}
              </div>
            ))}
          </div>
        )}

        {foreshadows.length > 0 && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>相关伏笔 · {foreshadows.length}</p>
            {foreshadows.map(fs => (
              <div key={fs.id} className="row-item" style={{ padding: "var(--space-2) 0" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ochre)", flexShrink: 0 }} />
                <span className="type-body" style={{ fontSize: "0.8125rem" }}>{fs.clueText}</span>
              </div>
            ))}
          </div>
        )}

        <hr className="rule" style={{ margin: "var(--space-6) 0 var(--space-5)" }} />

        {qualityScore != null && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <p className="type-label" style={{ marginBottom: "var(--space-2)" }}>质量评分</p>
            <span className="type-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: scoreColor(qualityScore) }}>
              {Math.round(qualityScore)}
            </span>
            <span className="type-caption"> / 100</span>
          </div>
        )}

        {styleDeviation != null && (
          <div>
            <p className="type-label" style={{ marginBottom: "var(--space-2)" }}>风格偏移</p>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div style={{ flex: 1, height: "3px", background: "var(--cream)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${Math.min(styleDeviation, 100)}%`, borderRadius: "2px",
                  background: styleDeviation < 20 ? "var(--forest)" : styleDeviation < 40 ? "var(--ochre)" : "var(--rose)",
                }} />
              </div>
              <span className="type-mono type-caption">{styleDeviation}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
