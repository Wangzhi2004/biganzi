import OpenAI from "openai";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";

const AI_TIMEOUT_MS = 90_000; // 90 秒超时

interface ModelConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

interface CompletionOptions {
  model?: string;
  taskType?: "planning" | "writing" | "audit" | "extract" | "embed";
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}

interface CompletionResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  durationMs: number;
  model: string;
}

export interface LogContext {
  jobId?: string;
  projectId?: string;
  chapterId?: string;
  stepName?: string;
  stepOrder?: number;
  taskType?: string;
}

let client: OpenAI | null = null;

export function resetClient(): void {
  client = null;
}

export function getModelConfig(): ModelConfig {
  const apiKey = getConfig("AI_API_KEY") ?? "";
  const baseURL = getConfig("AI_BASE_URL") ?? "";
  const model = getConfig("AI_MODEL") ?? "gpt-4o";

  if (!apiKey) {
    throw new Error("AI_API_KEY 环境变量未设置");
  }

  if (!baseURL) {
    throw new Error("AI_BASE_URL 环境变量未设置");
  }

  return { apiKey, baseURL, model };
}

function resolveModel(taskType?: string): string {
  const config = getModelConfig();
  if (taskType === "writing" || taskType === "rewrite") {
    return process.env.AI_STRONG_MODEL || config.model;
  }
  if (taskType === "embed") {
    return process.env.AI_EMBEDDING_MODEL || config.model;
  }
  return process.env.AI_FAST_MODEL || config.model;
}

export function getClient(): OpenAI {
  if (!client) {
    const config = getModelConfig();
    client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }
  return client;
}

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function chatCompletion(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: CompletionOptions,
  logContext?: LogContext
): Promise<CompletionResult> {
  const config = getModelConfig();
  const model = options?.model || resolveModel(options?.taskType);
  const client = getClient();

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const response = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          response_format: options?.responseFormat,
        },
        { signal: createTimeoutSignal(AI_TIMEOUT_MS) }
      );

      const durationMs = Date.now() - startTime;
      const usage = response.usage;
      const content = response.choices[0]?.message?.content || "";

      console.log(
        `[AI] model=${model} duration=${durationMs}ms tokens=${usage?.prompt_tokens || 0}/${usage?.completion_tokens || 0}`
      );

      if (logContext?.projectId) {
        try {
          await prisma.aICallLog.create({
            data: {
              jobId: logContext.jobId,
              projectId: logContext.projectId,
              chapterId: logContext.chapterId,
              stepName: logContext.stepName ?? "unknown",
              stepOrder: logContext.stepOrder ?? 0,
              model: config.model,
              messages: JSON.stringify(messages),
              response: content,
              promptTokens: usage?.prompt_tokens ?? 0,
              completionTokens: usage?.completion_tokens ?? 0,
              durationMs: durationMs,
              status: "SUCCESS",
            },
          });
        } catch (logError) {
          console.error("保存 AI 调用日志失败:", logError);
        }
      }

      return {
        content,
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
        },
        durationMs,
        model,
      };
    } catch (error) {
      lastError = error as Error;
      const isTimeout = lastError.message?.includes("abort") || lastError.message?.includes("timeout") || lastError.name === "AbortError";
      if (isTimeout) {
        lastError = new Error(`AI 请求超时（超过 ${AI_TIMEOUT_MS / 1000} 秒），请检查网络连接或 AI 服务状态`);
      }
      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[AI] 第 ${attempt + 1} 次调用失败，${delay}ms 后重试: ${lastError.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (logContext?.projectId) {
    try {
      await prisma.aICallLog.create({
        data: {
          jobId: logContext.jobId,
          projectId: logContext.projectId,
          chapterId: logContext.chapterId,
          stepName: logContext.stepName ?? "unknown",
          stepOrder: logContext.stepOrder ?? 0,
          model: getModelConfig().model,
          messages: JSON.stringify(messages),
          response: "",
          promptTokens: 0,
          completionTokens: 0,
          durationMs: 0,
          status: "FAILED",
          errorMessage: lastError instanceof Error ? lastError.message : "Unknown error",
        },
      });
    } catch (logError) {
      console.error("保存 AI 调用日志失败:", logError);
    }
  }

  throw new Error(`AI调用失败: ${lastError?.message || "未知错误"}`);
}

export interface StreamCallbacks {
  onToken?: (token: string, accumulated: string) => void;
  onStepStart?: (stepName: string) => void;
  onStepEnd?: (stepName: string, fullText: string) => void;
}

export async function streamChatCompletion(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: CompletionOptions,
  logContext?: LogContext,
  callbacks?: StreamCallbacks
): Promise<CompletionResult> {
  const config = getModelConfig();
  const model = options?.model || resolveModel(options?.taskType);
  const client = getClient();
  const startTime = Date.now();

  try {
    const stream = await client.chat.completions.create(
      {
        model,
        messages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        response_format: options?.responseFormat,
        stream: true,
      },
      { signal: createTimeoutSignal(AI_TIMEOUT_MS) }
    );

    let accumulated = "";
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        accumulated += delta;
        callbacks?.onToken?.(delta, accumulated);
      }
      // Some providers send usage in the last chunk
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
      }
    }

    const durationMs = Date.now() - startTime;

    // If no usage from stream, estimate
    if (!promptTokens && !completionTokens) {
      completionTokens = Math.ceil(accumulated.length / 3);
    }

    console.log(
      `[AI-STREAM] model=${model} duration=${durationMs}ms tokens=${promptTokens}/${completionTokens}`
    );

    if (logContext?.projectId) {
      try {
        await prisma.aICallLog.create({
          data: {
            jobId: logContext.jobId,
            projectId: logContext.projectId,
            chapterId: logContext.chapterId,
            stepName: logContext.stepName ?? "unknown",
            stepOrder: logContext.stepOrder ?? 0,
            model: config.model,
            messages: JSON.stringify(messages),
            response: accumulated,
            promptTokens,
            completionTokens,
            durationMs,
            status: "SUCCESS",
          },
        });
      } catch (logError) {
        console.error("保存 AI 调用日志失败:", logError);
      }
    }

    return {
      content: accumulated,
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
      durationMs,
      model,
    };
  } catch (error) {
    const lastError = error as Error;
    const durationMs = Date.now() - startTime;

    if (logContext?.projectId) {
      try {
        await prisma.aICallLog.create({
          data: {
            jobId: logContext.jobId,
            projectId: logContext.projectId,
            chapterId: logContext.chapterId,
            stepName: logContext.stepName ?? "unknown",
            stepOrder: logContext.stepOrder ?? 0,
            model: getModelConfig().model,
            messages: JSON.stringify(messages),
            response: "",
            promptTokens: 0,
            completionTokens: 0,
            durationMs,
            status: "FAILED",
            errorMessage: lastError.message,
          },
        });
      } catch (logError) {
        console.error("保存 AI 调用日志失败:", logError);
      }
    }
    throw new Error(`AI流式调用失败: ${lastError.message}`);
  }
}

export async function streamJsonCompletion<T = any>(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: CompletionOptions,
  logContext?: LogContext,
  callbacks?: StreamCallbacks
): Promise<{ data: T; meta: CompletionResult }> {
  const result = await streamChatCompletion(
    messages,
    { ...options, responseFormat: { type: "json_object" } },
    logContext,
    callbacks
  );

  try {
    const data = JSON.parse(result.content);
    return { data, meta: result };
  } catch (error) {
    throw new Error(`JSON解析失败: ${(error as Error).message}`);
  }
}

export async function jsonCompletion<T = any>(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: CompletionOptions,
  logContext?: LogContext
): Promise<{ data: T; meta: CompletionResult }> {
  let result: CompletionResult;
  try {
    result = await chatCompletion(messages, {
      ...options,
      responseFormat: { type: "json_object" },
    });
  } catch (error) {
    if (logContext?.projectId) {
      try {
        await prisma.aICallLog.create({
          data: {
            jobId: logContext.jobId,
            projectId: logContext.projectId,
            stepName: logContext.stepName ?? "unknown",
            stepOrder: logContext.stepOrder ?? 0,
            model: getModelConfig().model,
            messages: JSON.stringify(messages),
            response: "",
            promptTokens: 0,
            completionTokens: 0,
            durationMs: 0,
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch (logError) {
        console.error("保存 AI 调用日志失败:", logError);
      }
    }
    throw error;
  }

  try {
    const data = JSON.parse(result.content);

    if (logContext?.projectId) {
      try {
        await prisma.aICallLog.create({
          data: {
            jobId: logContext.jobId,
            projectId: logContext.projectId,
            chapterId: logContext.chapterId,
            stepName: logContext.stepName ?? "unknown",
            stepOrder: logContext.stepOrder ?? 0,
            model: result.model,
            messages: JSON.stringify(messages),
            response: result.content,
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            durationMs: result.durationMs,
            status: "SUCCESS",
          },
        });
      } catch (logError) {
        console.error("保存 AI 调用日志失败:", logError);
      }
    }

    return { data, meta: result };
  } catch (error) {
    if (logContext?.projectId) {
      try {
        await prisma.aICallLog.create({
          data: {
            jobId: logContext.jobId,
            projectId: logContext.projectId,
            chapterId: logContext.chapterId,
            stepName: logContext.stepName ?? "unknown",
            stepOrder: logContext.stepOrder ?? 0,
            model: result.model,
            messages: JSON.stringify(messages),
            response: result.content,
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            durationMs: result.durationMs,
            status: "FAILED",
            errorMessage: `JSON解析失败: ${(error as Error).message}`,
          },
        });
      } catch (logError) {
        console.error("保存 AI 调用日志失败:", logError);
      }
    }
    throw new Error(`JSON解析失败: ${(error as Error).message}`);
  }
}
