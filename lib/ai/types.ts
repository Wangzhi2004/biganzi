import OpenAI from "openai";

export type Message = OpenAI.ChatCompletionMessageParam;

export interface PromptBuilder {
  (context: Record<string, any>): Message[];
}

export interface AIResponse<T = string> {
  data: T;
  meta: {
    model: string;
    durationMs: number;
    promptTokens: number;
    completionTokens: number;
  };
}