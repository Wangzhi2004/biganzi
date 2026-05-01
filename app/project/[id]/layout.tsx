"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useProjectStore } from "@/stores/project.store";
import { ChapterTree } from "@/components/novel/chapter-tree";
import {
  LayoutDashboard, PenTool, BookOpen, Users, Eye, Calendar,
  ChevronLeft, PanelRightClose, PanelRightOpen, Loader2,
  Clock, Network, ListOrdered, Shuffle, Anchor, Brain,
} from "lucide-react";

const tabs = [
  { label: "驾驶舱", href: "", icon: LayoutDashboard },
  { label: "编辑器", href: "/editor", icon: PenTool },
  { label: "Bible", href: "/bible", icon: BookOpen },
  { label: "人物", href: "/characters", icon: Users },
  { label: "关系", href: "/relationships", icon: Network },
  { label: "伏笔", href: "/foreshadows", icon: Eye },
  { label: "时间线", href: "/timeline", icon: Clock },
  { label: "队列", href: "/queue", icon: ListOrdered },
  { label: "套路", href: "/tropes", icon: Shuffle },
  { label: "钩子", href: "/hooks", icon: Anchor },
  { label: "模拟", href: "/simulator", icon: Brain },
  { label: "规划", href: "/planner", icon: Calendar },
  { label: "进化", href: "/evolution", icon: Brain },
];

function ProjectContextPanel({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats(d))
      .catch(() => {});
  }, [projectId]);

  if (!stats) return (
    <div style={{ padding: "var(--space-5)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 width={16} height={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );

  return (
    <div style={{ padding: "var(--space-5)", height: "100%", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <p className="type-label" style={{ marginBottom: "var(--space-4)" }}>作品概览</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div style={{ padding: "var(--space-3)", background: "var(--cream)", borderRadius: "var(--radius)" }}>
          <p className="type-caption">当前章节</p>
          <p className="type-body" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{stats.currentChapter || 0}</p>
        </div>
        <div style={{ padding: "var(--space-3)", background: "var(--cream)", borderRadius: "var(--radius)" }}>
          <p className="type-caption">总字数</p>
          <p className="type-body" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{((stats.totalWords || 0) / 10000).toFixed(1)}万</p>
        </div>
        <div style={{ padding: "var(--space-3)", background: "var(--cream)", borderRadius: "var(--radius)" }}>
          <p className="type-caption">类型</p>
          <p className="type-body" style={{ fontSize: "0.8125rem" }}>{stats.genre || "未设置"}</p>
        </div>
      </div>
      <hr className="rule" style={{ margin: "var(--space-4) 0" }} />
      <p className="type-label" style={{ marginBottom: "var(--space-3)" }}>快捷操作</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Link href={`/project/${projectId}/editor`} style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }}>
            <PenTool width={14} height={14} /> 编辑器
          </button>
        </Link>
        <Link href={`/project/${projectId}/planner`} style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }}>
            <Calendar width={14} height={14} /> 规划器
          </button>
        </Link>
        <Link href={`/project/${projectId}/foreshadows`} style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }}>
            <Eye width={14} height={14} /> 伏笔账本
          </button>
        </Link>
        <Link href={`/project/${projectId}/characters`} style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }}>
            <Users width={14} height={14} /> 人物库
          </button>
        </Link>
        <Link href={`/project/${projectId}/history`} style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }}>
            <Clock width={14} height={14} /> 版本历史
          </button>
        </Link>
        <Link href={`/project/${projectId}/export`} style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }}>
            <ListOrdered width={14} height={14} /> 导出
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;
  const [panelOpen, setPanelOpen] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    useProjectStore.getState().fetchProject(projectId);
  }, [projectId]);

  // Subscribe only to currentProject - derive loading from its absence
  const currentProject = useProjectStore(s => s.currentProject);

  if (!currentProject) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <Loader2 width={20} height={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const basePath = `/project/${projectId}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 0, height: "44px",
        borderBottom: "1px solid var(--border-faint)", padding: "0 var(--space-6)",
        flexShrink: 0, background: "var(--surface)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ fontSize: "0.75rem" }}>
            <ChevronLeft width={14} height={14} /> 返回
          </button>
        </Link>
        <span style={{ width: "1px", height: "16px", background: "var(--border-faint)", margin: "0 var(--space-4)" }} />
        <span className="type-display" style={{ fontSize: "0.875rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
          {currentProject.name}
        </span>
        <nav style={{ display: "flex", alignItems: "center", gap: 0, marginLeft: "var(--space-8)" }}>
          {tabs.map((tab) => {
            const href = `${basePath}${tab.href}`;
            const isActive = pathname === href || (tab.href !== "" && pathname.startsWith(href));
            return (
              <Link key={tab.href} href={href} style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                  padding: "0 var(--space-4)", height: "44px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.75rem", fontWeight: isActive ? 600 : 400, letterSpacing: "0.02em",
                  color: isActive ? "var(--text)" : "var(--text-muted)",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-secondary)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  {tab.label}
                </button>
              </Link>
            );
          })}
        </nav>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn-ghost" onClick={() => setPanelOpen(!panelOpen)} style={{ padding: "var(--space-1) var(--space-2)", fontSize: "0.7rem" }}>
            {panelOpen ? <PanelRightClose width={14} height={14} /> : <PanelRightOpen width={14} height={14} />}
          </button>
        </div>
      </header>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{
          width: "260px", borderRight: "1px solid var(--border-faint)",
          flexShrink: 0, overflow: "hidden", background: "var(--surface)",
        }}>
          <ChapterTree projectId={projectId} />
        </aside>
        <main style={{ flex: 1, overflow: "hidden" }}>{children}</main>
        {panelOpen && (
          <aside style={{
            width: "280px", borderLeft: "1px solid var(--border-faint)",
            flexShrink: 0, overflow: "hidden", background: "var(--surface)",
          }}>
            <ProjectContextPanel projectId={projectId} />
          </aside>
        )}
      </div>
    </div>
  );
}
