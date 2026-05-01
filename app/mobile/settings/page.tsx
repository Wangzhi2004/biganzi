"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft, Loader2, Settings, Shield, Activity, RefreshCw,
  CheckCircle2, XCircle, Wifi, WifiOff,
} from "lucide-react";

interface HealthData {
  status: string;
  timestamp: string;
  db: { connected: boolean; latencyMs: number };
  stats: { projectCount: number; totalChapters: number; totalCharacters: number; activeJobs: number };
  last24h: { generationErrors: number; aiCalls: number; aiCallErrors: number; aiCallSuccessRate: string };
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mobile/health");
      if (res.ok) setHealth(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/mobile/auth", { method: "DELETE" });
    window.location.href = "/mobile/login";
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
        <a href="/mobile" style={{ color: "var(--text-muted)" }}><ChevronLeft style={{ width: 20, height: 20 }} /></a>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>设置</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {/* 系统健康 */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>系统状态</p>
            <button onClick={fetchHealth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)" }}>
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <Loader2 style={{ width: 20, height: 20, color: "var(--accent)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : health ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* 状态指示 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: health.status === "ok" ? "var(--forest-pale)" : "var(--rose-pale)", borderRadius: 6 }}>
                {health.status === "ok"
                  ? <CheckCircle2 style={{ width: 16, height: 16, color: "var(--forest)" }} />
                  : <XCircle style={{ width: 16, height: 16, color: "var(--rose)" }} />}
                <span style={{ fontSize: 13, color: health.status === "ok" ? "var(--forest)" : "var(--rose)", fontWeight: 600 }}>
                  {health.status === "ok" ? "系统正常" : "系统异常"}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                  DB {health.db.latencyMs}ms
                </span>
              </div>

              {/* 统计 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {[
                  { label: "项目", value: health.stats.projectCount },
                  { label: "章节", value: health.stats.totalChapters },
                  { label: "角色", value: health.stats.totalCharacters },
                  { label: "活跃任务", value: health.stats.activeJobs },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--cream)", borderRadius: 6, padding: "6px 10px" }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* 24h 统计 */}
              <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0" }}>
                <p style={{ margin: "0 0 4px" }}>过去 24 小时：</p>
                <div style={{ display: "flex", gap: 12 }}>
                  <span>AI 调用: {health.last24h.aiCalls}</span>
                  <span>成功率: {health.last24h.aiCallSuccessRate}</span>
                  <span style={{ color: health.last24h.generationErrors > 0 ? "var(--rose)" : "var(--text-muted)" }}>
                    错误: {health.last24h.generationErrors}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--rose)", textAlign: "center" }}>健康检查失败</p>
          )}
        </div>

        {/* 连接信息 */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 10px" }}>连接信息</p>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ margin: 0 }}>访问地址：{typeof window !== "undefined" ? window.location.origin : ""}</p>
            <p style={{ margin: 0 }}>协议：{typeof window !== "undefined" && window.location.protocol === "https:" ? "HTTPS (安全)" : "HTTP"}</p>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              通过 Cloudflare Tunnel 连接到本地服务
            </p>
          </div>
        </div>

        {/* 账号 */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 10px" }}>账号</p>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              width: "100%", padding: "10px 0", background: "none",
              border: "1px solid var(--rose)", borderRadius: 6,
              color: "var(--rose)", fontSize: 14, fontWeight: 600,
              cursor: loggingOut ? "default" : "pointer", opacity: loggingOut ? 0.5 : 1,
            }}
          >
            {loggingOut ? "退出中..." : "退出登录"}
          </button>
        </div>

        {/* 版本信息 */}
        <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
          笔杆子 · 连载引擎 · 移动端 v1.0
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
