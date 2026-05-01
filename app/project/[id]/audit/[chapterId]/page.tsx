"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Shield,
  Target,
  Swords,
  BookOpen,
  Palette,
  Compass,
  Sparkles,
  Flame,
  Zap,
  FileText,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuditRawPanel } from "@/components/ai/audit-raw-panel";

interface AuditReport {
  id: string;
  chapterId: string;
  overallStatus: string;
  qualityScore: number;
  mainPlotScore: number;
  characterChangeScore: number;
  conflictScore: number;
  hookScore: number;
  styleConsistencyScore: number;
  settingConsistencyScore: number;
  infoIncrementScore: number;
  emotionTensionScore: number;
  freshnessScore: number;
  readabilityScore: number;
  risks: Array<{
    level: string;
    category: string;
    description: string;
    suggestion: string;
  }>;
  rewriteActions: Array<{
    action: string;
    target: string;
    reason: string;
    priority: number;
  }>;
  conflictPoints?: Array<{
    location: string;
    conflictType: string;
    description: string;
    relatedChapter: string;
  }>;
  enhancementSuggestions?: Array<{
    location: string;
    type: string;
    suggestion: string;
    expectedImpact: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const SCORE_DIMENSIONS = [
  { key: "mainPlotScore", label: "主线推进", weight: 0.15, icon: Target },
  { key: "characterChangeScore", label: "人物变化", weight: 0.15, icon: Shield },
  { key: "conflictScore", label: "冲突强度", weight: 0.12, icon: Swords },
  { key: "hookScore", label: "章末钩子", weight: 0.12, icon: Zap },
  { key: "styleConsistencyScore", label: "风格一致性", weight: 0.10, icon: Palette },
  { key: "settingConsistencyScore", label: "设定一致性", weight: 0.10, icon: Compass },
  { key: "infoIncrementScore", label: "信息增量", weight: 0.08, icon: BookOpen },
  { key: "emotionTensionScore", label: "情绪张力", weight: 0.08, icon: Flame },
  { key: "freshnessScore", label: "新鲜度", weight: 0.05, icon: Sparkles },
  { key: "readabilityScore", label: "可读性", weight: 0.05, icon: FileText },
] as const;

function getScoreColor(score: number): string {
  if (score >= 80) return "text-[var(--success)]";
  if (score >= 60) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-[var(--success)]";
  if (score >= 60) return "bg-[var(--warning)]";
  return "bg-[var(--danger)]";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "GREEN":
      return {
        label: "绿色可发布",
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    case "YELLOW":
      return {
        label: "黄色建议修改",
        color: "text-yellow-700",
        bg: "bg-yellow-50 border-yellow-200",
        icon: <AlertCircle className="w-4 h-4" />,
      };
    case "RED":
      return {
        label: "红色必须重写",
        color: "text-red-700",
        bg: "bg-red-50 border-red-200",
        icon: <XCircle className="w-4 h-4" />,
      };
    default:
      return {
        label: "待审核",
        color: "text-gray-600",
        bg: "bg-gray-100 border-gray-300",
        icon: <AlertCircle className="w-4 h-4" />,
      };
  }
}

function getSeverityBadge(level: string) {
  switch (level) {
    case "高":
    case "high":
      return {
        label: "高",
        color: "text-red-700",
        bg: "bg-red-50 border-red-200",
      };
    case "中":
    case "medium":
      return {
        label: "中",
        color: "text-yellow-700",
        bg: "bg-yellow-50 border-yellow-200",
      };
    case "低":
    case "low":
      return {
        label: "低",
        color: "text-blue-700",
        bg: "bg-blue-50 border-blue-200",
      };
    default:
      return {
        label: level,
        color: "text-gray-600",
        bg: "bg-gray-100 border-gray-300",
      };
  }
}

function getPriorityBadge(priority: number) {
  if (priority <= 2)
    return {
      label: `P${priority}`,
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    };
  if (priority <= 4)
    return {
      label: `P${priority}`,
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
    };
  return {
    label: `P${priority}`,
    color: "text-gray-600",
    bg: "bg-gray-100 border-gray-300",
  };
}

function ScoreBar({
  label,
  score,
  weight,
  icon: Icon,
}: {
  label: string;
  score: number;
  weight: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color = getScoreBgColor(score);

  return (
    <div className="flex items-center gap-4 group">
      <div className="flex items-center gap-2 w-32 shrink-0">
        <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
        <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
          {label}
        </span>
      </div>
      <div className="flex-1 h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-2 w-24 shrink-0 justify-end">
        <span className={`text-sm font-mono font-semibold ${getScoreColor(score)}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          x{weight}
        </span>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const params = useParams();
  const projectId = params.id as string;
  const chapterId = params.chapterId as string;

  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/projects/${projectId}/chapters/${chapterId}/audit`
      );
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        const err = await res.json();
        setError(err.error || "获取审核报告失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [projectId, chapterId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleRewrite = async () => {
    try {
      setRewriting(true);
      const res = await fetch(
        `/api/projects/${projectId}/chapters/${chapterId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rewrite" }),
        }
      );
      if (res.ok) {
        fetchReport();
      }
    } catch {
    } finally {
      setRewriting(false);
    }
  };

  const sortedRisks = report?.risks
    ? [...report.risks].sort((a, b) => {
        const order: Record<string, number> = { 高: 0, high: 0, 中: 1, medium: 1, 低: 2, low: 2 };
        return (order[a.level] ?? 3) - (order[b.level] ?? 3);
      })
    : [];

  const sortedActions = report?.rewriteActions
    ? [...report.rewriteActions].sort((a, b) => a.priority - b.priority)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm text-[var(--text-muted)]">正在加载审核报告...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-[var(--warning)]" />
          <p className="text-[var(--text-secondary)]">{error}</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchReport}
              className="paper-btn-ghost"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
            <Link href={`/project/${projectId}`}>
              <Button variant="ghost" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                返回项目
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const statusBadge = getStatusBadge(report.overallStatus);

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
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                <PenTool className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">审稿报告</h1>
              <Badge
                variant="outline"
                className={`${statusBadge.bg} ${statusBadge.color} border flex items-center gap-1.5`}
              >
                {statusBadge.icon}
                {statusBadge.label}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center mb-10">
          <div
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-md ${
              report.qualityScore >= 80
                ? "bg-emerald-50 border-2 border-emerald-200"
                : report.qualityScore >= 60
                  ? "bg-yellow-50 border-2 border-yellow-200"
                  : "bg-red-50 border-2 border-red-200"
            }`}
          >
            <span
              className={`text-5xl font-bold tabular-nums ${getScoreColor(report.qualityScore)}`}
            >
              {report.qualityScore.toFixed(0)}
            </span>
            <span className="text-xs text-[var(--text-muted)] mt-1">综合评分</span>
          </div>
        </div>

        <div className="paper-card mb-8">
          <div className="p-6">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">
              评分细分
            </h2>
            <div className="space-y-4">
              {SCORE_DIMENSIONS.map((dim) => (
                <ScoreBar
                  key={dim.key}
                  label={dim.label}
                  score={report[dim.key as keyof AuditReport] as number}
                  weight={dim.weight}
                  icon={dim.icon}
                />
              ))}
            </div>
          </div>
        </div>

        {sortedRisks.length > 0 && (
          <div className="paper-card mb-8">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
                <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  风险列表
                </h2>
                <Badge
                  variant="secondary"
                  className="bg-yellow-50 text-yellow-700 border-yellow-200 ml-2"
                >
                  {sortedRisks.length} 项
                </Badge>
              </div>
              <div className="space-y-3">
                {sortedRisks.map((risk, i) => {
                  const severity = getSeverityBadge(risk.level);
                  return (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-[var(--border)] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Badge
                          variant="outline"
                          className={`${severity.bg} ${severity.color} border text-xs shrink-0 mt-0.5`}
                        >
                          {severity.label}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-[var(--text-muted)] bg-[var(--border-subtle)] px-2 py-0.5 rounded">
                              {risk.category}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-primary)] mb-2">
                            {risk.description}
                          </p>
                          <div className="flex items-start gap-2 p-2.5 rounded bg-[var(--accent-subtle)] border border-[var(--border)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                            <p className="text-xs text-[var(--text-secondary)]">
                              {risk.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {sortedActions.length > 0 && (
          <div className="paper-card mb-8">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <RefreshCw className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  修改建议
                </h2>
                <Badge
                  variant="secondary"
                  className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)] ml-2"
                >
                  {sortedActions.length} 项
                </Badge>
              </div>
              <div className="space-y-3">
                {sortedActions.map((action, i) => {
                  const priority = getPriorityBadge(action.priority);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-[var(--border)] transition-colors"
                    >
                      <Badge
                        variant="outline"
                        className={`${priority.bg} ${priority.color} border text-xs shrink-0 font-mono`}
                      >
                        {priority.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                          {action.action}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mb-1">
                          目标：{action.target}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          原因：{action.reason}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={async () => {
                          try {
                            setRewriting(true);
                            const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                aiOperation: "rewrite",
                                content: "",
                                selectedText: action.target,
                              }),
                            });
                            if (res.ok) fetchReport();
                          } catch {} finally { setRewriting(false); }
                        }}
                        disabled={rewriting}
                      >
                        {rewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        应用
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {report.conflictPoints && report.conflictPoints.length > 0 && (
          <div className="paper-card mb-8">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 text-[var(--danger)]" />
                <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  与前文冲突点
                </h2>
                <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200 ml-2">
                  {report.conflictPoints.length} 处
                </Badge>
              </div>
              <div className="space-y-3">
                {report.conflictPoints.map((cp: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg bg-red-50/50 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                        {cp.conflictType}
                      </Badge>
                      {cp.relatedChapter && <span className="text-xs text-[var(--text-muted)]">关联 Ch.{cp.relatedChapter}</span>}
                    </div>
                    <p className="text-sm text-[var(--text-primary)] mb-1">「{cp.location}」</p>
                    <p className="text-xs text-[var(--text-muted)]">{cp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {report.enhancementSuggestions && report.enhancementSuggestions.length > 0 && (
          <div className="paper-card mb-8">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  可增强点
                </h2>
                <Badge variant="secondary" className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)] ml-2">
                  {report.enhancementSuggestions.length} 处
                </Badge>
              </div>
              <div className="space-y-3">
                {report.enhancementSuggestions.map((es: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                        {es.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] mb-1">「{es.location}」</p>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{es.suggestion}</p>
                    <p className="text-xs text-[var(--accent)]">预期效果：{es.expectedImpact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleRewrite}
            disabled={rewriting}
            className="paper-btn-ghost"
          >
            {rewriting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            自动重写
          </Button>
          <Link href={`/project/${projectId}`}>
            <Button variant="ghost" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回编辑器
            </Button>
          </Link>
        </div>

        <div className="paper-card mb-8">
          <div className="p-6">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">
              AI 原始响应
            </h2>
            <AuditRawPanel chapterId={chapterId} projectId={projectId} />
          </div>
        </div>
      </main>
    </div>
  );
}
