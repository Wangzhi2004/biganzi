"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChapterStore } from "@/stores/chapter.store";
import { Loader2, PenLine } from "lucide-react";

export default function EditorIndexPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { chapters, isLoading, fetchChapters } = useChapterStore();

  useEffect(() => {
    fetchChapters(projectId);
  }, [projectId, fetchChapters]);

  useEffect(() => {
    if (!isLoading && chapters.length > 0) {
      const sorted = [...chapters].sort(
        (a, b) => b.chapterNumber - a.chapterNumber
      );
      router.replace(`/project/${projectId}/editor/${sorted[0].id}`);
    }
  }, [chapters, isLoading, projectId, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <PenLine className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              尚无章节
            </h2>
            <p className="text-muted-foreground">
              请先在驾驶舱中创建作品，或触发首次生成
            </p>
          </div>
          <button
            onClick={() => router.push(`/project/${projectId}`)}
            className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            返回驾驶舱
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
