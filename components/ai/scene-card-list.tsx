"use client";

import { useState } from "react";
import { MapPin, Swords, Info, Heart, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SceneCard } from "@/types";

interface SceneCardListProps {
  scenes: SceneCard[];
  className?: string;
  maxPreview?: number;
}

export function SceneCardList({ scenes, className, maxPreview }: SceneCardListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    maxPreview ? new Set(scenes.slice(0, maxPreview).map((s) => s.sceneNumber)) : new Set(scenes.map((s) => s.sceneNumber))
  );

  if (!scenes || scenes.length === 0) {
    return (
      <div className={cn("text-center py-6 text-zinc-600 text-sm", className)}>
        暂无场景卡
      </div>
    );
  }

  const toggle = (num: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {scenes.map((scene) => {
        const isExpanded = expandedIds.has(scene.sceneNumber);
        return (
          <div
            key={scene.sceneNumber}
            className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden"
          >
            <button
              onClick={() => toggle(scene.sceneNumber)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/30 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              )}
              <span className="text-[11px] text-zinc-500 font-mono">
                场景 {scene.sceneNumber}
              </span>
              <span className="text-xs text-zinc-300 truncate flex-1">
                {scene.location}
              </span>
              {scene.characters && scene.characters.length > 0 && (
                <span className="text-[10px] text-zinc-500 shrink-0">
                  {scene.characters.length} 人
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2.5">
                {scene.characters && scene.characters.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {scene.characters.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/40"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {scene.conflict && (
                  <div className="flex items-start gap-2">
                    <Swords className="w-3 h-3 text-rose-400/70 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">冲突</p>
                      <p className="text-xs text-zinc-300">{scene.conflict}</p>
                    </div>
                  </div>
                )}

                {scene.infoChange && (
                  <div className="flex items-start gap-2">
                    <Info className="w-3 h-3 text-cyan-400/70 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">信息变化</p>
                      <p className="text-xs text-zinc-300">{scene.infoChange}</p>
                    </div>
                  </div>
                )}

                {scene.emotionGoal && (
                  <div className="flex items-start gap-2">
                    <Heart className="w-3 h-3 text-amber-400/70 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">情绪目标</p>
                      <p className="text-xs text-zinc-300">{scene.emotionGoal}</p>
                    </div>
                  </div>
                )}

                {scene.keyAction && (
                  <div className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-emerald-400/70 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">关键行动</p>
                      <p className="text-xs text-zinc-300">{scene.keyAction}</p>
                    </div>
                  </div>
                )}

                {scene.hookEnding && (
                  <div className="pt-1.5 border-t border-zinc-800/40">
                    <p className="text-[10px] text-zinc-500 mb-0.5">场景钩子</p>
                    <p className="text-xs text-zinc-300 italic">{scene.hookEnding}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
