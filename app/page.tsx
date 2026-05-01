"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Clock, Loader2, ArrowRight } from "lucide-react";
import { useProjectStore } from "@/stores/project.store";
import { PROJECT_STATUS_LABELS, ProjectStatus } from "@/types";

function fmtWords(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return `${n}`;
}

function fmtDate(s: string) {
  const d = new Date(s);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default function HomePage() {
  const router = useRouter();
  const { projects, fetchProjects, isLoading } = useProjectStore();

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: "52px", flexShrink: 0,
        borderBottom: "1px solid var(--border-faint)", background: "var(--surface)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{
            fontSize: "17px", fontWeight: 700, fontFamily: '"LXGW WenKai", serif',
            color: "var(--text)", letterSpacing: "-0.02em",
          }}>笔杆子</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>连载引擎</span>
        </div>
        <Link href="/settings" style={{ textDecoration: "none" }}>
          <span style={{
            fontSize: "12px", color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px 10px", borderRadius: "4px",
            transition: "color 0.12s ease, background-color 0.12s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--cream)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
          >设置</span>
        </Link>
      </header>

      <main style={{ flex: 1, padding: "40px 32px", maxWidth: "880px", width: "100%", margin: "0 auto" }}>
        <section style={{ marginBottom: "36px" }}>
          <h1 style={{
            fontSize: "28px", fontWeight: 700,
            fontFamily: '"LXGW WenKai", serif', letterSpacing: "-0.03em",
            color: "var(--text)", marginBottom: "6px", lineHeight: 1.2,
          }}>我的作品</h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            让 AI 像成熟长篇作者一样持续经营一部小说
          </p>
        </section>

        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "280px" }}>
            <Loader2 width={18} height={18} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            border: "1px dashed var(--border)",
            borderRadius: "6px", padding: "56px 40px", textAlign: "center",
            background: "var(--surface)",
          }}>
            <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              还没有作品。开始你的第一部 AI 连载小说。
            </p>
            <Link href="/project/new" style={{ textDecoration: "none" }}>
              <button style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 24px", background: "var(--accent)", color: "#fff",
                border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: 500,
                cursor: "pointer", transition: "background-color 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--accent-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
              >
                <Plus width={16} height={16} /> 创建新作品
              </button>
            </Link>
          </div>
        ) : (
          <div>
            <div style={{
              display: "grid", gridTemplateColumns: projects.length === 1 ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px",
            }}>
              <Link href="/project/new" style={{ textDecoration: "none" }}>
                <div style={{
                  background: "var(--surface)",
                  border: "2px dashed var(--border)",
                  borderRadius: "6px",
                  padding: "36px 28px",
                  cursor: "pointer",
                  transition: "border-color 0.2s ease, background-color 0.2s ease",
                  minHeight: "180px",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--rust-pale)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--surface)";
                }}
                >
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "50%",
                    background: "var(--cream)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--accent)",
                  }}>
                    <Plus width={22} height={22} />
                  </div>
                  <div>
                    <p style={{ fontSize: "17px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                      创建新作品
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.55, maxWidth: "260px" }}>
                      从一句话创意开始，AI 为你构建世界观、角色体系和连载大纲
                    </p>
                  </div>
                </div>
              </Link>

              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/project/${project.id}`)}
                  style={{
                    display: "block", width: "100%",
                    textAlign: "left", background: "var(--surface)",
                    border: "1px solid var(--border-faint)", borderRadius: "6px",
                    padding: "20px 24px", cursor: "pointer",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(160,82,45,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-faint)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "14px" }}>
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "8px",
                      background: "linear-gradient(135deg, var(--rust), var(--rust-dark))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: "15px", fontWeight: 700,
                      fontFamily: '"LXGW WenKai", serif', flexShrink: 0,
                    }}>
                      {(project.name || "?")[0]}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "15px", fontWeight: 600, color: "var(--text)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px",
                          fontFamily: '"LXGW WenKai", serif',
                        }}>
                          {project.name}
                        </span>
                        <span style={{
                          fontSize: "10px", fontWeight: 500, letterSpacing: "0.06em",
                          textTransform: "uppercase", padding: "2px 7px", borderRadius: "3px",
                          background: "var(--cream)", color: "var(--text-muted)",
                        }}>
                          {(PROJECT_STATUS_LABELS[project.status as ProjectStatus] || project.status)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{project.genre}</span>
                        {project.subGenre && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {project.subGenre}</span>}
                      </div>
                    </div>
                    <ArrowRight width={16} height={16} style={{
                      color: "var(--border)", flexShrink: 0, alignSelf: "center",
                      transition: "color 0.15s ease, transform 0.15s ease",
                    }} />
                  </div>

                  <div style={{
                    borderTop: "1px solid var(--border-faint)", paddingTop: "14px",
                    display: "flex", alignItems: "center", gap: "20px", fontSize: "12px", color: "var(--text-muted)",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <FileText width={13} height={13} />
                      {project._count?.chapters || 0} 章
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "2px", height: "2px", borderRadius: "50%", background: "var(--text-muted)" }} />
                      {fmtWords(project.totalWords || 0)} 字
                    </span>
                    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock width={13} height={13} /> {fmtDate(project.updatedAt)}
                    </span>
                  </div>

                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                    background: "linear-gradient(90deg, var(--rust), var(--ochre))",
                    opacity: 0, transition: "opacity 0.2s ease",
                  }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
