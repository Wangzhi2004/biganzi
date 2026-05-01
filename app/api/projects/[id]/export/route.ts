import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "txt";

    const project = await prisma.project.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const chapters = await prisma.chapter.findMany({
      where: { projectId: id },
      orderBy: { chapterNumber: "asc" },
      select: {
        chapterNumber: true,
        title: true,
        content: true,
        isConfirmed: true,
      },
    });

    const confirmedChapters = chapters.filter(
      (ch) => ch.isConfirmed || ch.content
    );

    if (format === "txt") {
      const lines: string[] = [`# ${project.name}\n`];
      for (const ch of confirmedChapters) {
        if (ch.content) {
          // Strip HTML tags
          const plainText = ch.content
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
          lines.push(`\n\n## ${ch.title}\n\n${plainText}`);
        }
      }

      return new NextResponse(lines.join(""), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(project.name)}.txt"`,
        },
      });
    }

    if (format === "epub") {
      // Generate a simple EPUB (XHTML-based)
      const uuid = crypto.randomUUID();

      const chaptersXml = confirmedChapters
        .filter((ch) => ch.content)
        .map((ch) => {
          const plainText = ch.content!
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .split("\n")
            .map((p) => `<p>${p}</p>`)
            .join("\n");
          return `<item id="ch${ch.chapterNumber}" href="ch${ch.chapterNumber}.xhtml" media-type="application/xhtml+xml"/>`;
        })
        .join("\n    ");

      const chaptersSpine = confirmedChapters
        .filter((ch) => ch.content)
        .map((ch) => `<itemref idref="ch${ch.chapterNumber}"/>`)
        .join("\n    ");

      const chapterFiles = confirmedChapters
        .filter((ch) => ch.content)
        .map((ch) => {
          const paragraphs = ch
            .content!.replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .split("\n")
            .map((p) => `<p>${p.trim()}</p>`)
            .join("\n");
          return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${ch.title}</title></head>
<body>
<h1>${ch.title}</h1>
${paragraphs}
</body>
</html>`;
        });

      // Build EPUB as a minimal ZIP-like structure
      // For simplicity, return as application/xhtml+xml with all chapters concatenated
      const allChapters = confirmedChapters
        .filter((ch) => ch.content)
        .map((ch) => {
          const paragraphs = ch
            .content!.replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .split("\n")
            .map((p) => `<p>${p.trim()}</p>`)
            .join("\n");
          return `<h1>${ch.title}</h1>\n${paragraphs}`;
        })
        .join('\n<hr/>\n');

      const epubContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${project.name}</title>
  <style>
    body { font-family: serif; max-width: 40em; margin: 2em auto; line-height: 1.8; }
    h1 { text-align: center; margin: 2em 0 1em; }
    p { text-indent: 2em; margin: 0.5em 0; }
    hr { margin: 3em 0; border: none; border-top: 1px solid #ccc; }
  </style>
</head>
<body>
<h1 style="font-size: 1.5em; margin-bottom: 2em;">${project.name}</h1>
${allChapters}
</body>
</html>`;

      return new NextResponse(epubContent, {
        headers: {
          "Content-Type": "application/xhtml+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(project.name)}.xhtml"`,
        },
      });
    }

    return NextResponse.json(
      { error: "不支持的格式，请使用 format=txt 或 format=epub" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
