"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";
import { useChapterStore } from "@/stores/chapter.store";

const statusMap: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "已确认", cls: "badge-active" },
  draft: { label: "草稿", cls: "badge-draft" },
  pending: { label: "待生成", cls: "badge-warning" },
};

interface ChapterTreeProps { projectId: string; }

export function ChapterTree({ projectId }: ChapterTreeProps) {
  const router = useRouter();
  const params = useParams();
  const currentId = params.chapterId as string;
  const chapterTree = useChapterStore(s => s.chapterTree);
  const isLoading = useChapterStore(s => s.treeLoading);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    useChapterStore.getState().fetchChapterTree(projectId);
  }, [projectId]);

  useEffect(() => {
    if (chapterTree.length > 0 && expanded.size === 0) setExpanded(new Set([(chapterTree[0] as any)?.id || "default"]));
  }, [chapterTree]);

  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); return n.has(id) ? (n.delete(id), n) : (n.add(id), n); });
  };

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "120px" }}>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
    </div>
  );

  const volumes = chapterTree as any[];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "var(--space-5) var(--space-6)", borderBottom: "1px solid var(--border-faint)" }}>
        <p className="type-label">章节列表</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-2) var(--space-3)" }}>
        {volumes.length === 0 ? (
          <p className="type-caption" style={{ textAlign: "center", padding: "var(--space-12) 0" }}>暂无章节</p>
        ) : volumes.map((vol: any) => (
          <div key={vol.id} style={{ marginBottom: "var(--space-1)" }}>
            <button
              onClick={() => toggle(vol.id)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                width: "100%", padding: "var(--space-2) var(--space-3)",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)",
              }}
            >
              <ChevronRight width={14} height={14}
                style={{
                  color: "var(--text-muted)",
                  transform: expanded.has(vol.id) ? "rotate(90deg)" : "rotate(0)",
                  transition: "transform 0.15s ease",
                }}
              />
              <span style={{ color: "var(--text)" }}>{vol.name}</span>
              <span className="type-caption type-mono" style={{ marginLeft: "auto" }}>{vol.chapters?.length || 0}</span>
            </button>

            {expanded.has(vol.id) && (
              <div style={{ marginLeft: "var(--space-6)" }}>
                {(vol.chapters || []).map((ch: any) => {
                  const st = ch.isConfirmed ? "confirmed" : ch.auditStatus === "pending" ? "pending" : "draft";
                  const cfg = statusMap[st];
                  const active = currentId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => router.push(`/project/${projectId}/editor/${ch.id}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-3)",
                        width: "100%", padding: "var(--space-2) var(--space-3)",
                        background: active ? "var(--rust-pale)" : "transparent",
                        border: "none", cursor: "pointer",
                        borderRadius: "var(--radius)", transition: "background-color 0.1s ease",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--cream)"; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      {active && <span style={{ width: "2px", height: "16px", background: "var(--accent)", borderRadius: "1px", flexShrink: 0 }} />}
                      <FileText width={14} height={14} style={{ color: active ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />
                      <span className="type-body" style={{
                        fontSize: "0.8125rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        fontWeight: active ? 500 : 400,
                      }}>
                        {ch.chapterNumber}. {ch.title || "未命名"}
                      </span>
                      <span className={`badge ${cfg.cls}`} style={{ marginLeft: "auto", flexShrink: 0 }}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
