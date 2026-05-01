"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CallDetail } from "./call-detail";

const STEP_LABELS: Record<string, string> = {
  dna_generation: "DNA 生成",
  protagonist: "主角构建",
  worldview: "世界观构建",
  outline: "大纲规划",
  scene_cards: "场景卡设计",
  chapter_function: "章节功能推断",
  chapter_goal: "章节目标设定",
  scene_cards_gen: "场景卡生成",
  chapter_body: "章节正文生成",
  style_drift_check: "风格漂移检测",
  style_align: "风格修正",
  audit: "质量审计",
  rewrite: "自动改写",
  state_diff: "状态差异提取",
  unknown: "未知步骤",
};

interface AICallLog {
  id: string;
  jobId: string | null;
  projectId: string;
  stepName: string;
  stepOrder: number;
  model: string;
  messages: string;
  response: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface CallChainProps {
  logs: AICallLog[];
  className?: string;
}

export function CallChain({ logs, className }: CallChainProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Cpu className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-sm text-zinc-600">暂无 AI 调用记录</p>
      </div>
    );
  }

  const sorted = [...logs].sort((a, b) => a.stepOrder - b.stepOrder);
  const totalTokens = logs.reduce(
    (sum, l) => sum + l.promptTokens + l.completionTokens,
    0
  );
  const totalDuration = logs.reduce((sum, l) => sum + l.durationMs, 0);
  const successCount = logs.filter((l) => l.status === "SUCCESS").length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3 text-xs text-zinc-500 px-1">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {logs.length} 次调用
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {totalTokens.toLocaleString()} tokens
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {(totalDuration / 1000).toFixed(1)}s
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              successCount === logs.length
                ? "bg-emerald-500"
                : "bg-amber-500"
            )}
          />
          {successCount}/{logs.length} 成功
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-zinc-800/50" />

        <div className="space-y-1">
          {sorted.map((log, index) => {
            const isExpanded = expandedId === log.id;
            const isSuccess = log.status === "SUCCESS";
            const label =
              STEP_LABELS[log.stepName] ?? log.stepName;

            return (
              <div key={log.id} className="relative">
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : log.id)
                  }
                  className={cn(
                    "relative w-full flex items-start gap-3 py-2.5 px-3 rounded-lg text-left transition-all duration-200 group",
                    isExpanded
                      ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border border-indigo-500/20"
                      : "hover:bg-zinc-900/50 border border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
                      isSuccess
                        ? "bg-emerald-500/20 ring-1 ring-emerald-500/30"
                        : "bg-red-500/20 ring-1 ring-red-500/30"
                    )}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-300">
                        {label}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-zinc-700 bg-zinc-800/50 text-zinc-500"
                      >
                        {log.model}
                      </Badge>
                      <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">
                        {(log.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-zinc-600">
                        {log.promptTokens + log.completionTokens} tokens
                      </span>
                      {!isSuccess && log.errorMessage && (
                        <span className="text-[11px] text-red-400/80 truncate">
                          {log.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-1 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="ml-10 mr-1 mb-1">
                    <CallDetail log={log} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
