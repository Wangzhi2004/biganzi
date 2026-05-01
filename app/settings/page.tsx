"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">设置</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="paper-card">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                <Server className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI 模型配置</h3>
                <p className="text-xs text-[var(--text-muted)]">配置 AI 模型的连接参数</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">
                  API Endpoint
                </label>
                <Input
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="paper-input"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  OpenAI 兼容的 API 地址
                </p>
              </div>

              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">
                  API Key
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="paper-input"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  密钥仅保存在服务器运行时内存中
                </p>
              </div>

              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">
                  模型名称
                </label>
                <Input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="gpt-4o"
                  className="paper-input"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  推荐使用 gpt-4o 或同等级模型
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="paper-btn-ghost"
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  测试连接
                </Button>

                {testResult && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      testResult === "success"
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    )}
                  >
                    {testResult === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {testMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="paper-card">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                <Sliders className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">生成参数</h3>
                <p className="text-xs text-[var(--text-muted)]">调整 AI 生成行为的默认参数</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">
                  每章默认字数
                </label>
                <Input
                  type="number"
                  value={wordsPerChapter}
                  onChange={(e) => setWordsPerChapter(e.target.value)}
                  className="paper-input"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  AI 生成时每章的目标字数
                </p>
              </div>

              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">
                  自动改写阈值
                </label>
                <Input
                  type="number"
                  value={rewriteThreshold}
                  onChange={(e) => setRewriteThreshold(e.target.value)}
                  className="paper-input"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  质量评分低于此值时自动触发改写（0-100）
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator className="divider" />

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="paper-btn-primary"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {saved ? "已保存" : "保存设置"}
          </Button>
        </div>
      </main>
    </div>
  );
}
