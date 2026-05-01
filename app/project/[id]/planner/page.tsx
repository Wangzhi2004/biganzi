"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Sparkles,
  BookOpen,
  Target,
  TrendingUp,
  AlertTriangle,
  Info,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  FileEdit,
  Lightbulb,
  ArrowRight,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CHAPTER_FUNCTION_LABELS } from "@/types";
import type { ChapterFunction } from "@/types";

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  content?: string | null;
  summary: string | null;
  chapterFunction: string;
  qualityScore: number | null;
  auditStatus: string;
  isConfirmed: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PacingState {
  totalChapters: number;
  recentFunctions: string[];
  functionDistribution: Record<string, number>;
  averageTension: number;
  tensionCurve: Array<{ chapterNumber: number; tension: number }>;
  pleasureCount: number;
  crisisCount: number;
  worldExpandCount: number;
  chaptersSinceLastPleasure: number;
  chaptersSinceLastCrisis: number;
  chaptersSinceLastWorldExpand: number;
  suggestions: Array<{ type: string; message: string }>;
}

interface Recommendation {
  suggestedFunction: string;
  reasoning: string;
}

const CHAPTER_FUNCTION_COLORS: Record<string, string> = {
  main_plot: "bg-blue-500",
  character_turn: "bg-purple-500",
  foreshadow_plant: "bg-cyan-500",
  foreshadow_payoff: "bg-amber-500",
  pleasure_burst: "bg-pink-500",
  crisis_upgrade: "bg-red-500",
  world_expansion: "bg-emerald-500",
  relationship_advance: "bg-rose-500",
  villain_pressure: "bg-orange-500",
  emotional_settle: "bg-indigo-500",
  phase_close: "bg-teal-500",
  new_arc_open: "bg-violet-500",
};

const CHAPTER_FUNCTION_BG_COLORS: Record<string, string> = {
  main_plot: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  character_turn: "bg-purple-500/15 border-purple-500/30 text-purple-400",
  foreshadow_plant: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
  foreshadow_payoff: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  pleasure_burst: "bg-pink-500/15 border-pink-500/30 text-pink-400",
  crisis_upgrade: "bg-red-500/15 border-red-500/30 text-red-400",
  world_expansion: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  relationship_advance: "bg-rose-500/15 border-rose-500/30 text-rose-400",
  villain_pressure: "bg-orange-500/15 border-orange-500/30 text-orange-400",
  emotional_settle: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
  phase_close: "bg-teal-500/15 border-teal-500/30 text-teal-400",
  new_arc_open: "bg-violet-500/15 border-violet-500/30 text-violet-400",
};

function getFunctionLabel(func: string): string {
  const key = func.toLowerCase() as ChapterFunction;
  return CHAPTER_FUNCTION_LABELS[key] || func;
}

function getFunctionColor(func: string): string {
  return CHAPTER_FUNCTION_COLORS[func.toLowerCase()] || "bg-zinc-500";
}

function getFunctionBgColor(func: string): string {
  return (
    CHAPTER_FUNCTION_BG_COLORS[func.toLowerCase()] ||
    "bg-zinc-500/15 border-zinc-500/30 text-zinc-400"
  );
}

function getAuditStatusBadge(status: string) {
  switch (status) {
    case "GREEN":
      return {
        label: "通过",
        color: "text-emerald-400",
        bg: "bg-emerald-500/15 border-emerald-500/30",
      };
    case "YELLOW":
      return {
        label: "需修改",
        color: "text-yellow-400",
        bg: "bg-yellow-500/15 border-yellow-500/30",
      };
    case "RED":
      return {
        label: "问题",
        color: "text-red-400",
        bg: "bg-red-500/15 border-red-500/30",
      };
    default:
      return {
        label: "待审",
        color: "text-zinc-400",
        bg: "bg-zinc-500/15 border-zinc-500/30",
      };
  }
}

function getChapterStatus(chapter: Chapter): {
  label: string;
  color: string;
  bg: string;
} {
  if (chapter.isConfirmed)
    return {
      label: "已确认",
      color: "text-emerald-400",
      bg: "bg-emerald-500/15 border-emerald-500/30",
    };
  if (chapter.content && chapter.content.length > 0)
    return {
      label: "草稿",
      color: "text-blue-400",
      bg: "bg-blue-500/15 border-blue-500/30",
    };
  if (chapter.title && chapter.title !== `第${chapter.chapterNumber}章`)
    return {
      label: "已规划",
      color: "text-purple-400",
      bg: "bg-purple-500/15 border-purple-500/30",
    };
  return {
    label: "待生成",
    color: "text-zinc-400",
    bg: "bg-zinc-500/15 border-zinc-500/30",
  };
}

export default function PlannerPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [pacing, setPacing] = useState<PacingState | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [recommendLoading, setRecommendLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [chaptersRes, pacingRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/chapters`),
        fetch(`/api/projects/${projectId}/plan`),
      ]);

      if (chaptersRes.ok) {
        const data = await chaptersRes.json();
        setChapters(data);
      }
      if (pacingRes.ok) {
        const data = await pacingRes.json();
        setPacing(data.data || data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchRecommendation = useCallback(async () => {
    try {
      setRecommendLoading(true);
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.data || data);
      }
    } catch {
    } finally {
      setRecommendLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  const recentFunctions = pacing?.recentFunctions || [];
  const maxTension = 10;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#27272a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/project/${projectId}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold">章节规划</h1>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20"
              >
                {chapters.length} 章
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch(`/api/projects/${projectId}/plan/reorder`, { method: "POST" });
                if (res.ok) {
                  const data = await res.json();
                  alert(`重排建议：\n${data.suggestions?.map((s: any) => s.description).join("\n") || "无需调整"}`);
                }
              } catch {}
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            自动重排
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              fetchData();
              fetchRecommendation();
            }}
            className="border-[#27272a] hover:bg-[#1a1a1a]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <Card className="bg-[#111111] border-[#27272a] h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    AI 建议
                  </h2>
                </div>

                {recommendLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : recommendation ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-2">
                        推荐下一章功能
                      </p>
                      <Badge
                        variant="outline"
                        className={`${getFunctionBgColor(recommendation.suggestedFunction)} border text-sm`}
                      >
                        {getFunctionLabel(recommendation.suggestedFunction)}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        推荐理由
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {recommendation.reasoning}
                      </p>
                    </div>

                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => {
                        window.location.href = `/project/${projectId}`;
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      采用此建议
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      暂无建议
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchRecommendation}
                      className="mt-2 text-primary"
                    >
                      获取建议
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-[#111111] border-[#27272a] h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    节奏可视化
                  </h2>
                </div>

                {pacing && pacing.tensionCurve.length > 0 ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-3">
                        最近章节功能分布
                      </p>
                      <div className="flex items-end gap-1 h-24">
                        {recentFunctions.map((func, i) => (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <div
                              className={`w-full rounded-t ${getFunctionColor(func)} transition-all duration-300`}
                              style={{
                                height: `${(pacing.tensionCurve[i]?.tension || 5) / maxTension * 100}%`,
                                minHeight: "8px",
                              }}
                            />
                            <span className="text-[10px] text-muted-foreground/60 truncate w-full text-center">
                              {getFunctionLabel(func).slice(0, 2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#27272a]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-muted-foreground">
                            高潮
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-[10px] text-muted-foreground">
                            推进
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-[10px] text-muted-foreground">
                            沉淀
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-[10px] text-muted-foreground">
                            危机
                          </span>
                        </div>
                      </div>
                    </div>

                    {pacing.suggestions.length > 0 && (
                      <div className="space-y-2">
                        {pacing.suggestions.map((s, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 p-3 rounded-lg ${
                              s.type === "warning"
                                ? "bg-yellow-500/5 border border-yellow-500/20"
                                : "bg-blue-500/5 border border-blue-500/20"
                            }`}
                          >
                            {s.type === "warning" ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            )}
                            <span className="text-xs text-foreground/80">
                              {s.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12">
                    <BarChart3 className="w-10 h-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      开始创作后将显示节奏分析
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-[#111111] border-[#27272a]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  章节计划
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">已确认</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-muted-foreground">草稿</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs text-muted-foreground">已规划</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span className="text-xs text-muted-foreground">待生成</span>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-[500px]">
              <div className="space-y-1">
                {chapters.length > 0 ? (
                  chapters.map((chapter) => {
                    const status = getChapterStatus(chapter);
                    return (
                      <Link
                        key={chapter.id}
                        href={`/project/${projectId}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="w-8 h-8 rounded bg-[#1a1a1a] flex items-center justify-center shrink-0">
                          <span className="text-xs font-mono text-muted-foreground">
                            {chapter.chapterNumber}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                              {chapter.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={`${getFunctionBgColor(chapter.chapterFunction)} border text-[10px] shrink-0`}
                            >
                              {getFunctionLabel(chapter.chapterFunction)}
                            </Badge>
                          </div>
                          {chapter.summary && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {chapter.summary}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {chapter.qualityScore !== null && (
                            <span
                              className={`text-xs font-mono ${
                                chapter.qualityScore >= 80
                                  ? "text-emerald-400"
                                  : chapter.qualityScore >= 60
                                    ? "text-yellow-400"
                                    : "text-red-400"
                              }`}
                            >
                              {chapter.qualityScore.toFixed(0)}
                            </span>
                          )}

                          <Badge
                            variant="outline"
                            className={`${status.bg} ${status.color} border text-[10px]`}
                          >
                            {status.label}
                          </Badge>

                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center py-16">
                    <Calendar className="w-12 h-12 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground text-sm mb-1">
                      还没有章节
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      开始创作后章节将自动出现在这里
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
