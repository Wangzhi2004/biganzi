"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  XCircle,
  Copy,
  Zap,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

interface ConsoleStep {
  step: string;
  order: number;
  label: string;
  status: "pending" | "running" | "done" | "error";
  prompt?: any[];
  tokens: string;
  durationMs?: number;
  tokenCount?: number;
  error?: string;
  showPrompt?: boolean;
}

interface AIConsoleProps {
  steps: ConsoleStep[];
  currentTokens: Record<string, string>;
  overallProgress: number;
  connected: boolean;
  model?: string;
  error?: string;
  onComplete?: () => void;
}

const STEP_LABELS: Record<string, string> = {
  DNA_GENERATION: "DNA",
  SCENE_CARDS: "场景卡",
  CHAPTER_GEN: "第一章",
  CHAPTER_FUNCTION: "章节功能",
  CHAPTER_GOAL: "章节目标",
  PLANNER_SCENE_CARDS: "场景规划",
  CHAPTER_BODY: "正文写作",
  STYLE_DRIFT_CHECK: "风格检测",
  STYLE_ALIGN: "风格修正",
  AUDIT: "质量审计",
  REWRITE: "自动改写",
  STATE_DIFF: "状态提取",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function PromptBlock({ messages }: { messages: any[] }) {
  const [copied, setCopied] = useState(false);

  const formatPrompt = () => {
    if (!messages || !Array.isArray(messages)) return "";
    return messages
      .map((m: any) => {
        const role = m.role === "system" ? "系统" : m.role === "user" ? "用户" : "助手";
        const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content, null, 2);
        return `[${role}]\n${content}`;
      })
      .join("\n\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div style={{
      background: "var(--cream)",
      border: "1px solid var(--border-faint)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
      marginTop: "var(--space-3)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-2) var(--space-3)",
        borderBottom: "1px solid var(--border-faint)",
      }}>
        <span className="type-label">Prompt</span>
        <button
          onClick={handleCopy}
          className="btn-ghost"
          style={{ padding: "2px var(--space-2)", fontSize: "0.6875rem" }}
        >
          {copied ? <Check style={{ width: 10, height: 10, color: "var(--forest)" }} /> : <Copy style={{ width: 10, height: 10 }} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre style={{
        padding: "var(--space-3)", margin: 0, maxHeight: "280px", overflow: "auto",
        fontSize: "0.6875rem", lineHeight: 1.6,
        fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
        color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>
        {formatPrompt()}
      </pre>
    </div>
  );
}

function StreamingTokens({ text, isRunning }: { text: string; isRunning: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  if (!text) return null;

  let displayText = text;
  try {
    const parsed = JSON.parse(text);
    displayText = JSON.stringify(parsed, null, 2);
  } catch {}

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border-faint)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
      marginTop: "var(--space-3)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-3)",
        borderBottom: "1px solid var(--border-faint)",
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: isRunning ? "var(--forest)" : "var(--text-muted)",
          animation: isRunning ? "ai-pulse 1.5s ease-in-out infinite" : "none",
        }} />
        <span className="type-label">Response</span>
        <span className="type-caption" style={{ marginLeft: "auto" }}>
          {text.length.toLocaleString()} chars
        </span>
      </div>
      <div
        ref={containerRef}
        className="type-mono"
        style={{
          padding: "var(--space-3)", maxHeight: "360px", overflow: "auto",
          fontSize: "0.75rem", lineHeight: 1.7,
          color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}
      >
        {displayText}
        {isRunning && (
          <span style={{
            display: "inline-block", width: "6px", height: "12px",
            background: "var(--accent)", marginLeft: "1px",
            animation: "ai-blink 1s step-end infinite",
            verticalAlign: "text-bottom",
          }} />
        )}
      </div>
    </div>
  );
}

export function AIConsole({
  steps,
  currentTokens,
  overallProgress,
  connected,
  model,
  error,
}: AIConsoleProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const consoleRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showPrompts, setShowPrompts] = useState(true);

  useEffect(() => {
    const running = steps.filter(s => s.status === "running").map(s => s.step);
    if (running.length > 0) {
      setExpandedSteps(prev => {
        const next = new Set(prev);
        running.forEach(s => next.add(s));
        return next;
      });
    }
  }, [steps]);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [currentTokens, steps, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!consoleRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  }, []);

  const toggleStep = (step: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const doneCount = steps.filter(s => s.status === "done").length;
  const totalTokens = steps.reduce((sum, s) => sum + (s.tokenCount || 0), 0);
  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs || 0), 0);

  return (
    <>
      <style>{`
        @keyframes ai-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes ai-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div className="surface-card" style={{ overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--border-faint)",
          background: "var(--cream)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span className="type-label" style={{ letterSpacing: "0.12em" }}>
              AI 生成过程
            </span>
            {model && (
              <span className="badge badge-draft">{model}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button
              onClick={() => setShowPrompts(!showPrompts)}
              className="btn-ghost"
              style={{ padding: "2px var(--space-2)", fontSize: "0.6875rem", gap: "var(--space-1)" }}
            >
              {showPrompts ? <Eye style={{ width: 10, height: 10 }} /> : <EyeOff style={{ width: 10, height: 10 }} />}
              Prompt
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: connected ? "var(--forest)" : error ? "var(--rose)" : "var(--ochre)",
              }} />
              <span className="type-caption">
                {connected ? "已连接" : error ? "错误" : "连接中..."}
              </span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--space-4)",
          padding: "var(--space-2) var(--space-4)",
          borderBottom: "1px solid var(--border-faint)",
        }}>
          <span className="type-caption" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            {doneCount}/{steps.length} 步骤
          </span>
          {totalTokens > 0 && (
            <span className="type-caption" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <Zap style={{ width: 10, height: 10 }} />
              {totalTokens.toLocaleString()} tokens
            </span>
          )}
          {totalDuration > 0 && (
            <span className="type-caption" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <Clock style={{ width: 10, height: 10 }} />
              {formatDuration(totalDuration)}
            </span>
          )}
          <div style={{ flex: 1, height: "2px", background: "var(--cream)", borderRadius: "1px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${overallProgress}%`,
              background: "var(--accent)", borderRadius: "1px", transition: "width 0.3s ease",
            }} />
          </div>
          <span className="type-caption">{Math.round(overallProgress)}%</span>
        </div>

        {/* Steps */}
        <div
          ref={consoleRef}
          onScroll={handleScroll}
          style={{ maxHeight: "480px", overflow: "auto", padding: "var(--space-2) var(--space-3)" }}
        >
          {steps.map((step) => {
            const isExpanded = expandedSteps.has(step.step);
            const subLabel = STEP_LABELS[step.step] || step.label;

            return (
              <div key={step.step} style={{ marginBottom: "var(--space-1)" }}>
                {/* Step header */}
                <button
                  onClick={() => toggleStep(step.step)}
                  className="row-item"
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    borderRadius: "var(--radius)",
                    padding: "var(--space-2) var(--space-3)",
                    background: step.status === "running" ? "var(--cream)" : "transparent",
                    border: step.status === "running" ? "1px solid var(--border)" : "1px solid transparent",
                  }}
                >
                  {/* Status indicator */}
                  <div style={{ flexShrink: 0, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {step.status === "done" ? (
                      <Check style={{ width: 12, height: 12, color: "var(--forest)" }} />
                    ) : step.status === "running" ? (
                      <Loader2 style={{ width: 12, height: 12, color: "var(--accent)" }} className="animate-spin" />
                    ) : step.status === "error" ? (
                      <XCircle style={{ width: 12, height: 12, color: "var(--rose)" }} />
                    ) : (
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        border: "1px solid var(--border)", display: "block",
                      }} />
                    )}
                  </div>

                  {/* Step info */}
                  <span className="type-body" style={{
                    fontWeight: step.status === "running" ? 500 : 400,
                    color: step.status === "running" ? "var(--text)"
                      : step.status === "error" ? "var(--rose)"
                      : step.status === "done" ? "var(--text-secondary)"
                      : "var(--text-muted)",
                    marginLeft: "var(--space-2)",
                  }}>
                    {step.label}
                  </span>

                  {/* Stats */}
                  {step.status === "done" && step.durationMs && (
                    <span className="type-caption" style={{ marginLeft: "auto" }}>
                      {formatDuration(step.durationMs)}
                      {step.tokenCount ? ` · ${step.tokenCount} tok` : ""}
                    </span>
                  )}
                  {step.status === "running" && (
                    <span className="type-caption" style={{
                      marginLeft: "auto", color: "var(--accent)",
                      animation: "ai-pulse 1.5s ease-in-out infinite",
                    }}>
                      处理中...
                    </span>
                  )}

                  {/* Expand icon */}
                  <span style={{ flexShrink: 0, color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>
                    {isExpanded
                      ? <ChevronDown style={{ width: 12, height: 12 }} />
                      : <ChevronRight style={{ width: 12, height: 12 }} />}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: "0 0 var(--space-3) var(--space-8)" }}>
                    {showPrompts && step.prompt && step.prompt.length > 0 && (
                      <PromptBlock messages={step.prompt} />
                    )}

                    {(step.status === "running" || step.status === "done") && currentTokens[step.step] && (
                      <StreamingTokens
                        text={currentTokens[step.step]}
                        isRunning={step.status === "running"}
                      />
                    )}

                    {step.status === "error" && step.error && (
                      <div style={{
                        marginTop: "var(--space-3)", padding: "var(--space-3)",
                        background: "var(--rose-pale)",
                        border: "1px solid rgba(168, 90, 90, 0.15)",
                        borderRadius: "var(--radius)",
                      }}>
                        <p className="type-caption" style={{ color: "var(--rose)" }}>{step.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Global error */}
          {error && (
            <div style={{
              marginTop: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
              background: "var(--rose-pale)",
              border: "1px solid rgba(168, 90, 90, 0.15)",
              borderRadius: "var(--radius)",
              display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
            }}>
              <XCircle style={{ width: 14, height: 14, color: "var(--rose)", flexShrink: 0, marginTop: 2 }} />
              <span className="type-body" style={{ color: "var(--rose)" }}>{error}</span>
            </div>
          )}

          {/* Auto-scroll indicator */}
          {!autoScroll && steps.some(s => s.status === "running") && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
              }}
              className="btn-ghost"
              style={{
                position: "sticky", bottom: 0, left: "50%",
                transform: "translateX(-50%)",
                margin: "var(--space-3) auto 0",
                background: "var(--cream)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "var(--space-1) var(--space-3)",
                fontSize: "0.6875rem",
              }}
            >
              ↓ 新内容
            </button>
          )}
        </div>
      </div>
    </>
  );
}
