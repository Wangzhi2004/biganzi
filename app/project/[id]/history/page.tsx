"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  History,
  FileText,
  User,
  BookOpen,
  Layers,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VersionLog {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  oldValue: any;
  newValue: any;
  description: string | null;
  createdAt: string;
}

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chapter: FileText,
  character: User,
  world_rule: BookOpen,
  foreshadow: Layers,
};

const CHANGE_COLORS: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  status_change: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const ENTITY_LABELS: Record<string, string> = {
  chapter: "章节",
  character: "角色",
  world_rule: "世界规则",
  foreshadow: "伏笔",
};

const CHANGE_LABELS: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  status_change: "状态变更",
};

export default function HistoryPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [logs, setLogs] = useState<VersionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter === "all"
        ? `/api/projects/${projectId}/version-logs`
        : `/api/projects/${projectId}/version-logs?entityType=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
              <History className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">版本历史</h1>
              <Badge
                variant="secondary"
                className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)]"
              >
                {logs.length} 条记录
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {["all", "chapter", "character", "world_rule", "foreshadow"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  filter === f
                    ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {f === "all" ? "全部" : ENTITY_LABELS[f] || f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <History className="w-12 h-12 text-[var(--text-muted)] mb-4" />
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">暂无变更记录</p>
            <p className="text-sm text-[var(--text-muted)]">当内容发生变化时，变更记录将自动出现在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const Icon = ENTITY_ICONS[log.entityType] || FileText;
              return (
                <div
                  key={log.id}
                  className="bg-white border border-[var(--border)] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--cream)] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`${CHANGE_COLORS[log.changeType] || "bg-gray-50 text-gray-700 border-gray-200"} border text-[10px]`}
                        >
                          {CHANGE_LABELS[log.changeType] || log.changeType}
                        </Badge>
                        <span className="text-xs text-[var(--text-muted)]">
                          {ENTITY_LABELS[log.entityType] || log.entityType}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      </div>
                      {log.description && (
                        <p className="text-sm text-[var(--text-primary)] mb-1">{log.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleString("zh-CN")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
