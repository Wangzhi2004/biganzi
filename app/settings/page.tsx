"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Settings,
  Sparkles,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Server,
  Sliders,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [wordsPerChapter, setWordsPerChapter] = useState("3000");
  const [rewriteThreshold, setRewriteThreshold] = useState("60");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.AI_BASE_URL) setApiEndpoint(data.AI_BASE_URL);
        if (data.AI_API_KEY) setApiKey(data.AI_API_KEY);
        if (data.AI_MODEL) setModelName(data.AI_MODEL);
        if (data.WORDS_PER_CHAPTER) setWordsPerChapter(data.WORDS_PER_CHAPTER);
        if (data.REWRITE_THRESHOLD) setRewriteThreshold(data.REWRITE_THRESHOLD);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AI_BASE_URL: apiEndpoint,
          AI_API_KEY: apiKey,
          AI_MODEL: modelName,
          WORDS_PER_CHAPTER: wordsPerChapter,
          REWRITE_THRESHOLD: rewriteThreshold,
        }),
      });

      if (!res.ok) throw new Error("保存失败");

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      const res = await fetch("/api/settings/presets");
      if (res.ok) {
        setTestResult("success");
        setTestMessage("连接成功，API 响应正常");
      } else {
        setTestResult("error");
        setTestMessage("API 返回异常状态");
      }
    } catch {
      setTestResult("error");
      setTestMessage("无法连接到 API 服务");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <header style={{ borderBottom: "1px solid var(--border-faint)", padding: "0 var(--space-16)", background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px", maxWidth: "720px", margin: "0 auto" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <button className="btn-ghost"><ChevronLeft width={14} height={14} /> 返回</button>
            </Link>
            <span className="type-display" style={{ fontSize: "0.9375rem" }}>设置</span>
            <span style={{ width: "40px" }} />
          </div>
        </header>
        <main style={{ maxWidth: "720px", margin: "0 auto", padding: "var(--space-12) var(--space-16)", display: "flex", justifyContent: "center" }}>
          <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Header - consistent with new-project page */}
      <header style={{ borderBottom: "1px solid var(--border-faint)", padding: "0 var(--space-16)", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px", maxWidth: "720px", margin: "0 auto" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <button className="btn-ghost"><ChevronLeft width={14} height={14} /> 返回</button>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Settings className="w-4 h-4 text-[var(--accent)]" />
            <span className="type-display" style={{ fontSize: "0.9375rem" }}>设置</span>
          </div>
          <span style={{ width: "40px" }} />
        </div>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "var(--space-12) var(--space-16)" }}>
        {/* Page Title */}
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h2 className="type-display" style={{ fontSize: "1.5rem", color: "var(--text)", marginBottom: "var(--space-3)", letterSpacing: "-0.02em" }}>
            系统设置
          </h2>
          <p className="type-body" style={{ maxWidth: "480px" }}>
            配置 AI 模型连接参数和生成行为偏好
          </p>
        </div>

        {/* AI Model Config Section */}
        <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)", marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "var(--radius)",
              background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Server className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="type-body" style={{ fontWeight: 500 }}>AI 模型配置</h3>
              <p className="type-caption">配置 AI 模型的连接参数</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div>
              <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
                API Endpoint
              </label>
              <input
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="input-field"
              />
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>
                OpenAI 兼容的 API 地址
              </p>
            </div>

            <div>
              <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="input-field"
              />
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>
                密钥仅保存在服务器运行时内存中
              </p>
            </div>

            <div>
              <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
                模型名称
              </label>
              <input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="gpt-4o"
                className="input-field"
              />
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>
                推荐使用 gpt-4o 或同等级模型
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", paddingTop: "var(--space-2)" }}>
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="btn-ghost"
                style={{ fontSize: "0.8125rem" }}
              >
                {isTesting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                )}
                测试连接
              </button>

              {testResult && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    testResult === "success"
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  {testResult === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span className="type-caption">{testMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generation Params Section */}
        <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)", marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "var(--radius)",
              background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sliders className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="type-body" style={{ fontWeight: 500 }}>生成参数</h3>
              <p className="type-caption">调整 AI 生成行为的默认参数</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
            <div>
              <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
                每章默认字数
              </label>
              <input
                type="number"
                value={wordsPerChapter}
                onChange={(e) => setWordsPerChapter(e.target.value)}
                className="input-field"
              />
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>
                AI 生成时每章的目标字数
              </p>
            </div>

            <div>
              <label className="type-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
                自动改写阈值
              </label>
              <input
                type="number"
                value={rewriteThreshold}
                onChange={(e) => setRewriteThreshold(e.target.value)}
                className="input-field"
              />
              <p className="type-caption" style={{ marginTop: "var(--space-1)" }}>
                质量评分低于此值时自动触发改写（0-100）
              </p>
            </div>
          </div>
        </div>

        {/* Self-Evolution Section */}
        <div style={{ border: "1px solid var(--border-faint)", borderRadius: "var(--radius)", padding: "var(--space-6)", background: "var(--surface)", marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "var(--radius)",
              background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wand2 className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="type-body" style={{ fontWeight: 500 }}>自进化系统</h3>
              <p className="type-caption">配置系统自我学习和优化行为</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ padding: "var(--space-4)", background: "var(--bg)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p className="type-body" style={{ fontWeight: 500, fontSize: "0.8125rem" }}>自动进化提示词</p>
                  <p className="type-caption">根据执行效果自动优化提示词</p>
                </div>
                <div style={{
                  width: "36px", height: "20px", borderRadius: "10px",
                  background: "var(--accent)", position: "relative", cursor: "pointer",
                }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: "white", position: "absolute", top: "2px", right: "2px",
                  }} />
                </div>
              </div>
            </div>

            <div style={{ padding: "var(--space-4)", background: "var(--bg)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p className="type-body" style={{ fontWeight: 500, fontSize: "0.8125rem" }}>元学习策略选择</p>
                  <p className="type-caption">基于历史数据选择最优生成策略</p>
                </div>
                <div style={{
                  width: "36px", height: "20px", borderRadius: "10px",
                  background: "var(--accent)", position: "relative", cursor: "pointer",
                }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: "white", position: "absolute", top: "2px", right: "2px",
                  }} />
                </div>
              </div>
            </div>

            <div style={{ padding: "var(--space-4)", background: "var(--bg)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p className="type-body" style={{ fontWeight: 500, fontSize: "0.8125rem" }}>向量记忆召回</p>
                  <p className="type-caption">生成时自动检索相关上下文</p>
                </div>
                <div style={{
                  width: "36px", height: "20px", borderRadius: "10px",
                  background: "var(--accent)", position: "relative", cursor: "pointer",
                }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: "white", position: "absolute", top: "2px", right: "2px",
                  }} />
                </div>
              </div>
            </div>

            <div style={{ padding: "var(--space-4)", background: "var(--bg)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p className="type-body" style={{ fontWeight: 500, fontSize: "0.8125rem" }}>风格漂移检测</p>
                  <p className="type-caption">生成后自动检测并修正风格偏离</p>
                </div>
                <div style={{
                  width: "36px", height: "20px", borderRadius: "10px",
                  background: "var(--accent)", position: "relative", cursor: "pointer",
                }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: "white", position: "absolute", top: "2px", right: "2px",
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="rule" style={{ margin: "var(--space-8) 0 var(--space-5)" }} />

        {/* Save Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-solid"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {saved ? "已保存" : "保存设置"}
          </button>
        </div>
      </main>
    </div>
  );
}
