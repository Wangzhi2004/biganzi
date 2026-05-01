const runtimeConfig: Record<string, string> = {};

export function getConfig(key: string): string | undefined {
  return runtimeConfig[key] ?? process.env[key];
}

export function setConfig(key: string, value: string): void {
  runtimeConfig[key] = value;
}

export function getAllConfig(): Record<string, string> {
  return {
    AI_BASE_URL: getConfig("AI_BASE_URL") ?? "",
    AI_API_KEY: getConfig("AI_API_KEY") ?? "",
    AI_MODEL: getConfig("AI_MODEL") ?? "",
    WORDS_PER_CHAPTER: getConfig("WORDS_PER_CHAPTER") ?? "3000",
    REWRITE_THRESHOLD: getConfig("REWRITE_THRESHOLD") ?? "60",
  };
}
