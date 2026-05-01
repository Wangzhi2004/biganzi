"use client";

import { useState, useMemo } from "react";
import { Copy, Check, FileText, MessageSquare, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface AICallLog {
  id: string;
  jobId: string | null;
  projectId: string;
  stepName: string;
  stepOrder: number;
  model: string;
  messages: string;
  response: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface CallDetailProps {
  log: AICallLog;
  className?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignored */
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-6 px-2 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 mr-1 text-emerald-400" />
          已复制
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 mr-1" />
          复制
        </>
      )}
    </Button>
  );
}

function formatMessages(raw: string): string {
  try {
    const messages = JSON.parse(raw);
    if (!Array.isArray(messages)) return raw;
    return messages
      .map((m: any) => {
        const role = m.role === "system" ? "系统" : m.role === "user" ? "用户" : "助手";
        const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content, null, 2);
        return `[${role}]\n${content}`;
      })
      .join("\n\n---\n\n");
  } catch {
    return raw;
  }
}

function truncateText(text: string, maxLen = 8000): { text: string; truncated: boolean } {
  if (text.length <= maxLen) return { text, truncated: false };
  return { text: text.slice(0, maxLen) + "\n\n... (内容过长，已截断)", truncated: true };
}

export function CallDetail({ log, className }: CallDetailProps) {
  const formattedPrompt = useMemo(() => formatMessages(log.messages), [log.messages]);
  const promptDisplay = useMemo(
    () => truncateText(formattedPrompt),
    [formattedPrompt]
  );
  const responseDisplay = useMemo(
    () => truncateText(log.response),
    [log.response]
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800/80 bg-zinc-950/60 overflow-hidden",
        className
      )}
    >
      <Tabs defaultValue="prompt" className="w-full">
        <div className="flex items-center justify-between border-b border-zinc-800/50 px-3">
          <TabsList className="bg-transparent h-8 p-0 gap-0">
            <TabsTrigger
              value="prompt"
              className="text-[11px] px-2.5 h-8 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(99,102,241,0.5)] text-zinc-600"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Prompt
            </TabsTrigger>
            <TabsTrigger
              value="response"
              className="text-[11px] px-2.5 h-8 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-emerald-400 data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(16,185,129,0.5)] text-zinc-600"
            >
              <FileText className="w-3 h-3 mr-1" />
              Response
            </TabsTrigger>
            <TabsTrigger
              value="meta"
              className="text-[11px] px-2.5 h-8 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(245,158,11,0.5)] text-zinc-600"
            >
              <Info className="w-3 h-3 mr-1" />
              元数据
            </TabsTrigger>
          </TabsList>
          <CopyButton
            text={
              `Model: ${log.model}\n` +
              `Status: ${log.status}\n` +
              `Duration: ${log.durationMs}ms\n` +
              `Tokens: ${log.promptTokens}/${log.completionTokens}\n\n` +
              `=== PROMPT ===\n${formattedPrompt}\n\n` +
              `=== RESPONSE ===\n${log.response}` +
              (log.errorMessage ? `\n\n=== ERROR ===\n${log.errorMessage}` : "")
            }
          />
        </div>

        <TabsContent value="prompt" className="m-0">
          <div className="p-3 max-h-80 overflow-auto scrollbar-thin">
            <pre className="text-[12px] text-zinc-400 whitespace-pre-wrap break-words font-mono leading-relaxed">
              {promptDisplay.text}
            </pre>
            {promptDisplay.truncated && (
              <p className="text-[10px] text-zinc-600 mt-2 text-center">
                内容已截断显示
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="response" className="m-0">
          <div className="p-3 max-h-80 overflow-auto scrollbar-thin">
            {log.status === "FAILED" && log.errorMessage ? (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-xs text-red-400 mb-1 font-medium">错误信息</p>
                <p className="text-[12px] text-red-300/80 font-mono">
                  {log.errorMessage}
                </p>
              </div>
            ) : (
              <>
                <pre className="text-[12px] text-zinc-400 whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {responseDisplay.text}
                </pre>
                {responseDisplay.truncated && (
                  <p className="text-[10px] text-zinc-600 mt-2 text-center">
                    内容已截断显示
                  </p>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="meta" className="m-0">
          <div className="p-3 space-y-2.5">
            {[
              { label: "模型", value: log.model },
              { label: "状态", value: log.status === "SUCCESS" ? "成功" : "失败" },
              { label: "耗时", value: `${(log.durationMs / 1000).toFixed(2)}s (${log.durationMs}ms)` },
              { label: "输入 Tokens", value: log.promptTokens.toLocaleString() },
              { label: "输出 Tokens", value: log.completionTokens.toLocaleString() },
              { label: "总 Tokens", value: (log.promptTokens + log.completionTokens).toLocaleString() },
              { label: "步骤顺序", value: `#${log.stepOrder}` },
              { label: "调用 ID", value: log.id },
              { label: "时间", value: new Date(log.createdAt).toLocaleString("zh-CN") },
              ...(log.jobId ? [{ label: "任务 ID", value: log.jobId }] : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-1.5 px-2 rounded-md bg-zinc-900/30"
              >
                <span className="text-[11px] text-zinc-500">{label}</span>
                <span className="text-[11px] text-zinc-300 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
