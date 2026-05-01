"use client";

import { useState } from "react";
import {
  FileText,
  User,
  Link2,
  Globe,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StateDiffResult } from "@/types";

interface StateDiffPanelProps {
  stateDiff: StateDiffResult | null | undefined;
  className?: string;
  compact?: boolean;
}

function Section({
  icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="rounded-md border border-zinc-800/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/20 transition-colors"
      >
        <span className="text-zinc-500">{icon}</span>
        <span className="text-xs text-zinc-300">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] text-zinc-500 ml-1">({count})</span>
        )}
        {open ? (
          <ChevronDown className="w-3 h-3 text-zinc-500 ml-auto" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-600 ml-auto" />
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function StateDiffPanel({ stateDiff, className, compact }: StateDiffPanelProps) {
  if (!stateDiff) {
    return (
      <div className={cn("text-center py-6 text-zinc-600 text-sm", className)}>
        暂无状态差异记录
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* 章节摘要 */}
      {stateDiff.chapterSummary && (
        <div className="rounded-md border border-zinc-800/40 bg-zinc-900/20 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">章节摘要</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{stateDiff.chapterSummary}</p>
        </div>
      )}

      {/* 新增事实 */}
      {stateDiff.newFacts && stateDiff.newFacts.length > 0 && (
        <Section
          icon={<BookOpen className="w-3 h-3" />}
          title="新增事实"
          count={stateDiff.newFacts.length}
          defaultOpen={!compact}
        >
          <ul className="space-y-1">
            {stateDiff.newFacts.map((fact, i) => (
              <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                <span className="text-indigo-400/50 mt-0.5">+</span>
                {typeof fact === "string" ? fact : JSON.stringify(fact)}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 角色变化 */}
      {stateDiff.characterChanges && stateDiff.characterChanges.length > 0 && (
        <Section
          icon={<User className="w-3 h-3" />}
          title="角色变化"
          count={stateDiff.characterChanges.length}
          defaultOpen={!compact}
        >
          <div className="space-y-1.5">
            {stateDiff.characterChanges.map((change, i) => (
              <div key={i} className="text-xs">
                <span className="text-zinc-300 font-medium">{change.characterName}</span>
                <span className="text-zinc-500"> · {change.field}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-zinc-500 line-through">{change.oldValue || "—"}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-emerald-400/80">{change.newValue}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 关系变化 */}
      {stateDiff.relationshipChanges && stateDiff.relationshipChanges.length > 0 && (
        <Section
          icon={<Link2 className="w-3 h-3" />}
          title="关系变化"
          count={stateDiff.relationshipChanges.length}
          defaultOpen={!compact}
        >
          <div className="space-y-1.5">
            {stateDiff.relationshipChanges.map((change, i) => (
              <div key={i} className="text-xs text-zinc-300">
                <span className="text-amber-400/70">{change.changeType}</span>
                <span className="text-zinc-500"> · {change.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 新增世界规则 */}
      {stateDiff.newWorldRules && stateDiff.newWorldRules.length > 0 && (
        <Section
          icon={<Globe className="w-3 h-3" />}
          title="新增世界规则"
          count={stateDiff.newWorldRules.length}
          defaultOpen={!compact}
        >
          <div className="space-y-1.5">
            {stateDiff.newWorldRules.map((rule, i) => (
              <div key={i} className="text-xs">
                <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/40">
                  {rule.category}
                </span>
                <p className="text-zinc-300 mt-1">{rule.content}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 新增伏笔 */}
      {stateDiff.newForeshadows && stateDiff.newForeshadows.length > 0 && (
        <Section
          icon={<Eye className="w-3 h-3" />}
          title="新增伏笔"
          count={stateDiff.newForeshadows.length}
          defaultOpen={!compact}
        >
          <div className="space-y-1.5">
            {stateDiff.newForeshadows.map((f, i) => (
              <div key={i} className="text-xs text-zinc-300">
                <p>{f.clueText}</p>
                {f.expectedPayoffStart && f.expectedPayoffEnd && (
                  <p className="text-zinc-500 mt-0.5">
                    预计回收：第 {f.expectedPayoffStart} — {f.expectedPayoffEnd} 章
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 回收伏笔 */}
      {stateDiff.paidOffForeshadows && stateDiff.paidOffForeshadows.length > 0 && (
        <Section
          icon={<CheckCircle2 className="w-3 h-3" />}
          title="回收伏笔"
          count={stateDiff.paidOffForeshadows.length}
          defaultOpen={!compact}
        >
          <div className="space-y-1">
            {stateDiff.paidOffForeshadows.map((f, i) => (
              <div key={i} className="text-xs text-zinc-300">
                <span className="text-emerald-400/70">{f.payoffType === "partial" ? "部分回收" : "完整回收"}</span>
                <span className="text-zinc-500"> · {f.foreshadowId}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 风险标记 */}
      {stateDiff.riskFlags && stateDiff.riskFlags.length > 0 && (
        <Section
          icon={<AlertTriangle className="w-3 h-3" />}
          title="风险标记"
          count={stateDiff.riskFlags.length}
          defaultOpen={!compact}
        >
          <div className="space-y-1.5">
            {stateDiff.riskFlags.map((risk, i) => (
              <div
                key={i}
                className={cn(
                  "text-xs px-2 py-1.5 rounded border",
                  risk.severity === "high"
                    ? "bg-rose-500/5 border-rose-500/20 text-rose-300/80"
                    : risk.severity === "medium"
                    ? "bg-amber-500/5 border-amber-500/20 text-amber-300/80"
                    : "bg-blue-500/5 border-blue-500/20 text-blue-300/80"
                )}
              >
                <span className="font-medium">{risk.type}</span>
                <span className="opacity-80"> · {risk.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 下一章建议 */}
      {stateDiff.nextChapterSuggestion && (
        <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] text-indigo-400/70 uppercase tracking-wider">下一章建议</span>
          </div>
          <p className="text-xs text-zinc-300 font-medium">
            {stateDiff.nextChapterSuggestion.suggestedGoal}
          </p>
          {stateDiff.nextChapterSuggestion.reasoning && (
            <p className="text-[11px] text-zinc-500 mt-1 italic">
              {stateDiff.nextChapterSuggestion.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
