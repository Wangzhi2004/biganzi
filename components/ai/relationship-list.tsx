"use client";

import { cn } from "@/lib/utils";

interface RelationshipItem {
  id: string;
  characterAName: string;
  characterBName: string;
  relationType: string;
  description?: string | null;
  status?: string;
}

interface RelationshipListProps {
  relationships: RelationshipItem[];
  className?: string;
}

const RELATION_COLORS: Record<string, string> = {
  ally: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  enemy: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  friend: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  family: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  mentor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  rival: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  lover: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

export function RelationshipList({ relationships, className }: RelationshipListProps) {
  if (!relationships || relationships.length === 0) {
    return (
      <div className={cn("text-center py-4 text-zinc-600 text-sm", className)}>
        暂无关系记录
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {relationships.map((rel) => (
        <div
          key={rel.id}
          className="rounded-md border border-zinc-800/40 bg-zinc-900/20 px-3 py-2"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-300">{rel.characterAName}</span>
            <span className="text-zinc-600">—</span>
            <span className="text-xs text-zinc-300">{rel.characterBName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border",
                RELATION_COLORS[rel.relationType] ||
                  "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
              )}
            >
              {rel.relationType}
            </span>
            {rel.description && (
              <span className="text-[11px] text-zinc-500 truncate">
                {rel.description}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
