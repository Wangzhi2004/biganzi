"use client";

import { useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIReasoningBadgeProps {
  reasoning?: string;
  operationLabel?: string;
  className?: string;
  onDismiss?: () => void;
}

export function AIReasoningBadge({
  reasoning,
  operationLabel,
  className,
  onDismiss,
}: AIReasoningBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!reasoning) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-xs text-amber-300/90">
          {operationLabel ? `${operationLabel} · ` : ""}AI 思考过程
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-auto"
        >
          {expanded ? "收起" : "展开"}
        </button>
        {onDismiss && (
          <button onClick={onDismiss} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-3 pb-3">
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
