"use client";

import { useEffect, useState } from "react";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error("[ProjectError]", error);
  }, [error]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      reset();
      setIsRetrying(false);
    }, 500);
  };

  const isAITimeout =
    error.message?.includes("超时") ||
    error.message?.includes("timeout") ||
    error.message?.includes("abort");

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">
          {isAITimeout ? "AI 服务响应超时" : "页面出现错误"}
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          {isAITimeout
            ? "AI 服务响应时间过长，请稍后重试。"
            : "遇到了一个意外错误，请尝试重试。"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isRetrying ? "重试中..." : "重试"}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            刷新页面
          </button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-3 max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs text-red-600">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
