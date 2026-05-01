"use client";

import { useState, useEffect } from "react";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditRawPanelProps {
  projectId: string;
  chapterId: string;
  className?: string;
}

export function AuditRawPanel({ projectId, chapterId, className }: AuditRawPanelProps) {
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded || rawResponse !== null) return;
    setLoading(true);
    fetch(`/api/projects/${projectId}/ai-logs?chapterId=${chapterId}&stepName=audit&limit=1`)
      .then((r) => (r.ok ? r.json() : { logs: [] }))
      .then((d) => {
        const log = d.logs?.[0];
        setRawResponse(log?.response || null);
      })
      .catch(() => setRawResponse(null))
      .finally(() => setLoading(false));
  }, [expanded, rawResponse, projectId, chapterId]);

  return (
    <div className={cn("rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden", className)}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-300">AI 原始审核响应</span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-auto" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {loading ? (
            <p className="text-xs text-zinc-500 py-2">加载中...</p>
          ) : rawResponse ? (
            <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-80 overflow-auto">
              {rawResponse}
            </pre>
          ) : (
            <p className="text-xs text-zinc-500 py-2">未找到原始审核响应</p>
          )}
        </div>
      )}
    </div>
  );
}
