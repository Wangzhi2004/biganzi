"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  ListOrdered,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CHAPTER_FUNCTION_LABELS, type ChapterFunction } from "@/types";

interface QueueItem {
  id: string;
  chapterNumber: number;
  title: string;
  chapterFunction: string;
  goal?: string;
  status: "planned" | "generating" | "review" | "confirmed";
  qualityScore?: number;
  wordCount?: number;
}

export default function QueuePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [chapters, setChapters] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchChapters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/chapters`);
      if (res.ok) {
        const data = await res.json();
        // 映射为队列状态
        const mapped = (data || []).map((ch: any) => ({
          id: ch.id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          chapterFunction: ch.chapterFunction,
          goal: ch.goal,
          status: ch.isConfirmed
            ? "confirmed"
            : ch.content
              ? "review"
              : "planned",
          qualityScore: ch.qualityScore,
          wordCount: ch.wordCount,
        }));
        setChapters(mapped);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  function statusConfig(status: string) {
    switch (status) {
      case "confirmed":
        return { label: "已确认", color: "var(--forest)", bg: "rgba(34,197,94,0.1)", icon: CheckCircle2 };
      case "review":
        return { label: "待审", color: "var(--ochre)", bg: "rgba(245,158,11,0.1)", icon: AlertCircle };
      case "generating":
        return { label: "生成中", color: "var(--accent)", bg: "rgba(160,82,45,0.1)", icon: Sparkles };
      default:
        return { label: "计划中", color: "var(--text-muted)", bg: "var(--cream)", icon: Clock };
    }
  }

  const planned = chapters.filter(c => c.status === "planned");
  const review = chapters.filter(c => c.status === "review");
  const confirmed = chapters.filter(c => c.status === "confirmed");

  const handleBatchGenerate = async (count: number) => {
    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: count });
    try {
      for (let i = 0; i < count; i++) {
        setBatchProgress({ current: i + 1, total: count });
        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const err = await res.json();
          console.error(`Batch generate failed at chapter ${i + 1}:`, err.error);
          break;
        }
        // Refresh chapters after each generation
        await fetchChapters();
      }
    } catch (err) {
      console.error("Batch generate error:", err);
    } finally {
      setBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

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
              <ListOrdered className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">章节队列</h1>
              <Badge
                variant="secondary"
                className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)]"
              >
                {chapters.length} 章
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {batchGenerating && batchProgress && (
              <span className="text-xs text-[var(--text-muted)]">
                生成中 {batchProgress.current}/{batchProgress.total}
              </span>
            )}
            <button
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--accent)] disabled:opacity-50"
              disabled={batchGenerating}
              onClick={() => handleBatchGenerate(3)}
            >
              {batchGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              批量生成 3 章
            </button>
            <button
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--accent)] disabled:opacity-50"
              disabled={batchGenerating}
              onClick={() => handleBatchGenerate(5)}
            >
              {batchGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              批量生成 5 章
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[var(--border)] rounded-lg p-4 shadow-sm">
            <p className="text-xs text-[var(--text-muted)] mb-1">已确认</p>
            <p className="text-2xl font-bold" style={{ color: "var(--forest)" }}>
              {confirmed.length}
            </p>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-lg p-4 shadow-sm">
            <p className="text-xs text-[var(--text-muted)] mb-1">待审</p>
            <p className="text-2xl font-bold" style={{ color: "var(--ochre)" }}>
              {review.length}
            </p>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-lg p-4 shadow-sm">
            <p className="text-xs text-[var(--text-muted)] mb-1">计划中</p>
            <p className="text-2xl font-bold" style={{ color: "var(--text-muted)" }}>
              {planned.length}
            </p>
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mb-6">
              <ListOrdered className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">尚无章节</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs text-center">
              在驾驶舱中生成章节后，队列将自动填充
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-16">
                    序号
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    标题
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-24">
                    功能
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-24">
                    状态
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-20">
                    质量
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-20">
                    字数
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-24">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...chapters]
                  .sort((a, b) => a.chapterNumber - b.chapterNumber)
                  .map((ch, index) => {
                    const status = statusConfig(ch.status);
                    const Icon = status.icon;
                    return (
                      <tr
                        key={ch.id}
                        className={`border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${
                          index % 2 === 0 ? "bg-[var(--bg)]" : "bg-white"
                        } hover:bg-[var(--accent-subtle)]`}
                        onClick={() => router.push(`/project/${projectId}/editor/${ch.id}`)}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-mono text-[var(--text-muted)]">
                            {ch.chapterNumber}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-[var(--text-primary)]">
                            {ch.title}
                          </span>
                          {ch.goal && (
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                              {ch.goal}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-[var(--text-secondary)]">
                            {CHAPTER_FUNCTION_LABELS[ch.chapterFunction as ChapterFunction] ||
                              ch.chapterFunction}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border"
                            style={{
                              color: status.color,
                              background: status.bg,
                              borderColor: status.color,
                            }}
                          >
                            <Icon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="text-sm font-mono"
                            style={{
                              color: ch.qualityScore
                                ? ch.qualityScore >= 80
                                  ? "var(--forest)"
                                  : ch.qualityScore >= 60
                                    ? "var(--ochre)"
                                    : "var(--rose)"
                                : "var(--text-muted)",
                            }}
                          >
                            {ch.qualityScore ? Math.round(ch.qualityScore) : "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {(ch.wordCount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            className="text-xs text-[var(--accent)] hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/project/${projectId}/editor/${ch.id}`);
                            }}
                          >
                            编辑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
