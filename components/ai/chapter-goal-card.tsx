"use client";

import { Target, XCircle, CheckCircle2, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChapterGoalCardProps {
  goal?: string;
  mustHappen?: string[];
  mustNotHappen?: string[];
  endingHook?: string;
  className?: string;
}

export function ChapterGoalCard({
  goal,
  mustHappen,
  mustNotHappen,
  endingHook,
  className,
}: ChapterGoalCardProps) {
  const hasContent = goal || (mustHappen && mustHappen.length > 0) || (mustNotHappen && mustNotHappen.length > 0) || endingHook;

  if (!hasContent) {
    return (
      <div className={cn("text-center py-4 text-zinc-600 text-sm", className)}>
        暂无章节目标
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/40">
        <Target className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-medium text-zinc-300">章节目标</span>
      </div>
      <div className="p-3 space-y-3">
        {goal && (
          <p className="text-sm text-zinc-300 leading-relaxed">{goal}</p>
        )}

        {mustHappen && mustHappen.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400/70" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">必须发生</span>
            </div>
            <ul className="space-y-1">
              {mustHappen.map((item, i) => (
                <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                  <span className="text-emerald-500/50 mt-0.5">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mustNotHappen && mustNotHappen.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <XCircle className="w-3 h-3 text-rose-400/70" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">必须避免</span>
            </div>
            <ul className="space-y-1">
              {mustNotHappen.map((item, i) => (
                <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                  <span className="text-rose-500/50 mt-0.5">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {endingHook && (
          <div className="pt-2 border-t border-zinc-800/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Anchor className="w-3 h-3 text-amber-400/70" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">结尾钩子</span>
            </div>
            <p className="text-xs text-zinc-300 italic">{endingHook}</p>
          </div>
        )}
      </div>
    </div>
  );
}
