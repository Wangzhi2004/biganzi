"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(
    error === "not_configured" ? "移动端未配置 MOBILE_PASSWORD 环境变量" : ""
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/mobile/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/mobile");
      } else {
        const data = await res.json();
        setErr(data.error || "登录失败");
      }
    } catch {
      setErr("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "16px",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "32px 24px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--rust-pale)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Lock style={{ width: 20, height: 20, color: "var(--accent)" }} />
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            笔杆子 · 移动端
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            输入密码以访问
          </p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="访问密码"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

        {err && (
          <p
            style={{
              fontSize: 13,
              color: "var(--rose)",
              margin: "0 0 12px",
              textAlign: "center",
            }}
          >
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password.trim()}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading || !password.trim() ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
          {loading ? "验证中..." : "进入"}
        </button>
      </form>
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 className="animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
