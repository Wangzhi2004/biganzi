"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Character {
  id: string;
  name: string;
  roleType: string;
}

interface Relationship {
  id: string;
  characterAId: string;
  characterBId: string;
  characterA: Character;
  characterB: Character;
  relationType: string;
  description?: string | null;
  status: string;
}

const ROLE_COLORS: Record<string, string> = {
  主角: "#3b82f6",
  女主: "#ec4899",
  导师: "#10b981",
  反派: "#ef4444",
  盟友: "#f97316",
  工具人: "#6b7280",
};

const REL_COLORS: Record<string, string> = {
  师徒: "#3b82f6",
  恋人: "#ec4899",
  敌对: "#ef4444",
  盟友: "#10b981",
  兄弟: "#f59e0b",
  姐妹: "#f59e0b",
  父子: "#8b5cf6",
  母女: "#8b5cf6",
};

export default function RelationshipsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cRes, rRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/characters`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/projects/${projectId}/relationships`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setCharacters(cRes || []);
      setRelationships(rRes || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 简单的圆形布局
  const nodePositions = useMemo(() => {
    const count = characters.length;
    if (count === 0) return {} as Record<string, { x: number; y: number }>;
    const radius = Math.min(300, count * 35);
    const centerX = 400;
    const centerY = 300;
    const positions: Record<string, { x: number; y: number }> = {};
    characters.forEach((char, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions[char.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    return positions;
  }, [characters]);

  const filteredRelationships = selectedChar
    ? relationships.filter(
        r => r.characterAId === selectedChar || r.characterBId === selectedChar
      )
    : relationships;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

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
              <Users className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">人物关系图</h1>
              <Badge
                variant="secondary"
                className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)]"
              >
                {characters.length} 人 · {relationships.length} 关系
              </Badge>
            </div>
          </div>
          {selectedChar && (
            <button
              className="text-xs text-[var(--accent)] hover:underline"
              onClick={() => setSelectedChar(null)}
            >
              显示全部
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">还没有人物</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs text-center">
              在人物库中添加角色后，关系图将自动显示
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 关系图 */}
            <div className="lg:col-span-2 bg-white border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">关系网络</p>
                <p className="text-xs text-[var(--text-muted)]">点击人物可筛选其关系</p>
              </div>
              <div className="relative" style={{ height: "600px" }}>
                <svg width="100%" height="100%" viewBox="0 0 800 600">
                  {/* 连线 */}
                  {filteredRelationships.map((rel) => {
                    const a = nodePositions[rel.characterAId];
                    const b = nodePositions[rel.characterBId];
                    if (!a || !b) return null;
                    const color = REL_COLORS[rel.relationType] || "var(--border)";
                    return (
                      <g key={rel.id}>
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke={color}
                          strokeWidth={selectedChar ? 2.5 : 1.5}
                          strokeOpacity={selectedChar ? 0.8 : 0.4}
                        />
                        {/* 关系标签 */}
                        <g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}>
                          <rect
                            x={-rel.relationType.length * 4 - 4}
                            y={-9}
                            width={rel.relationType.length * 8 + 8}
                            height={18}
                            rx={4}
                            fill="white"
                            stroke={color}
                            strokeWidth={0.5}
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={10}
                            fill={color}
                          >
                            {rel.relationType}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* 节点 */}
                  {characters.map((char) => {
                    const pos = nodePositions[char.id];
                    if (!pos) return null;
                    const isSelected = selectedChar === char.id;
                    const isConnected = selectedChar
                      ? filteredRelationships.some(
                          r => r.characterAId === char.id || r.characterBId === char.id
                        )
                      : true;
                    const color = ROLE_COLORS[char.roleType] || "#6b7280";
                    return (
                      <g
                        key={char.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        style={{ cursor: "pointer", opacity: isConnected ? 1 : 0.25 }}
                        onClick={() => setSelectedChar(isSelected ? null : char.id)}
                      >
                        <circle
                          r={isSelected ? 28 : 22}
                          fill={color}
                          fillOpacity={isSelected ? 0.15 : 0.1}
                          stroke={color}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={isSelected ? 13 : 11}
                          fontWeight={isSelected ? 600 : 500}
                          fill={color}
                        >
                          {char.name.length > 3 ? char.name.slice(0, 2) + "…" : char.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* 关系列表 */}
            <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">关系列表</p>
              </div>
              <div className="divide-y divide-[var(--border-subtle)] max-h-[600px] overflow-y-auto">
                {filteredRelationships.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-8">
                    暂无关系数据
                  </p>
                ) : (
                  filteredRelationships.map((rel) => (
                    <div key={rel.id} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-[var(--text-primary)]">
                          {rel.characterA.name}
                        </span>
                        <ArrowRightLeft className="w-3 h-3 text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-primary)]">
                          {rel.characterB.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: REL_COLORS[rel.relationType] || "var(--border)",
                            color: REL_COLORS[rel.relationType] || "var(--text-muted)",
                          }}
                        >
                          {rel.relationType}
                        </Badge>
                        {rel.description && (
                          <span className="text-xs text-[var(--text-muted)] line-clamp-1">
                            {rel.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
