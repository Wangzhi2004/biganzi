"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Clock,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Flame,
  Users,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CHAPTER_FUNCTION_LABELS, type ChapterFunction } from "@/types";
import { StateDiffPanel } from "@/components/ai/state-diff-panel";

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  chapterFunction: string;
  qualityScore: number | null;
  auditStatus: string;
  isConfirmed: boolean;
  wordCount: number;
  summary?: string | null;
  stateDiff?: any;
  createdAt: string;
}

export default function TimelinePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/chapters`);
      if (res.ok) {
        const data = await res.json();
        setChapters(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  function scoreColor(n: number) {
    if (n >= 80) return "var(--forest)";
    if (n >= 60) return "var(--ochre)";
    return "var(--rose)";
  }

  function auditColor(s: string) {
    if (s === "green" || s === "GREEN") return "var(--forest)";
    if (s === "yellow" || s === "YELLOW") return "var(--ochre)";
    if (s === "red" || s === "RED") return "var(--rose)";
    return "var(--text-muted)";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const sorted = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/project/${projectId}`}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">时间线</h1>
              <Badge
                variant="secondary"
                className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)]"
              >
                {sorted.length} 章
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">尚无章节</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs text-center">
              在驾驶舱中生成章节后，时间线将自动填充
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* 时间线中轴 */}
            <div
              className="absolute left-6 top-0 bottom-0 w-px bg-[var(--border-faint)]"
              style={{ marginLeft: "11px" }}
            />

            <div className="space-y-6">
              {sorted.map((ch) => {
                const isExpanded = expandedId === ch.id;
                return (
                  <div key={ch.id} className="relative pl-14">
                    {/* 节点 */}
                    <div
                      className="absolute left-6 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      style={{
                        marginLeft: "-3px",
                        borderColor: ch.isConfirmed ? "var(--accent)" : "var(--border)",
                        background: ch.isConfirmed ? "var(--accent)" : "var(--surface)",
                      }}
                    >
                      {ch.isConfirmed ? (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
                      )}
                    </div>

                    {/* 内容卡片 */}
                    <div
                      className="bg-white border border-[var(--border)] rounded-lg shadow-sm overflow-hidden cursor-pointer hover:border-[var(--accent)] transition-colors"
                      onClick={() => toggleExpand(ch.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                              第{ch.chapterNumber}章
                            </span>
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {ch.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {ch.qualityScore != null && (
                              <span
                                className="text-xs font-mono font-semibold"
                                style={{ color: scoreColor(ch.qualityScore) }}
                              >
                                {Math.round(ch.qualityScore)}
                              </span>
                            )}
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: auditColor(ch.auditStatus) }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span>
                            {CHAPTER_FUNCTION_LABELS[ch.chapterFunction as ChapterFunction] ||
                              ch.chapterFunction}
                          </span>
                          <span>·</span>
                          <span>{(ch.wordCount || 0).toLocaleString()} 字</span>
                          {ch.summary && (
                            <>
                              <span>·</span>
                              <span className="line-clamp-1 max-w-md">{ch.summary}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 展开详情 */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
                          {ch.stateDiff ? (
                            <div className="pt-4">
                              <StateDiffPanel stateDiff={ch.stateDiff} compact />
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)] py-4">
                              暂无状态差异数据
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
