"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  FileText,
  BookOpen,
} from "lucide-react";

export default function ExportPage() {
  const params = useParams();
  const projectId = params.id as string;

  const handleExport = (format: string) => {
    const url = `/api/projects/${projectId}/export?format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 bg-white">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href={`/project/${projectId}`}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">导出作品</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-sm text-[var(--text-muted)] mb-6">
          选择导出格式，将已确认的章节导出为文件。仅导出已确认写入正史的章节。
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleExport("txt")}
            className="bg-white border border-[var(--border)] rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded bg-[var(--cream)] flex items-center justify-center group-hover:bg-[var(--accent-subtle)] transition-colors">
                <FileText className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">TXT 纯文本</p>
                <p className="text-xs text-[var(--text-muted)]">Markdown 格式</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              导出为纯文本文件，章节标题用 Markdown 标记。适合在任何文本编辑器中阅读或进一步编辑。
            </p>
          </button>

          <button
            onClick={() => handleExport("epub")}
            className="bg-white border border-[var(--border)] rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded bg-[var(--cream)] flex items-center justify-center group-hover:bg-[var(--accent-subtle)] transition-colors">
                <BookOpen className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">XHTML 电子书</p>
                <p className="text-xs text-[var(--text-muted)]">带排版样式</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              导出为带样式的 XHTML 文件，可在浏览器中直接阅读，也可转换为 EPUB/MOBI 等电子书格式。
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
