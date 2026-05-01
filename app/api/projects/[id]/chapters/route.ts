import { NextRequest, NextResponse } from "next/server";
import { chapterService } from "@/lib/services/chapter.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chapters = await chapterService.listByProject(id);
    return NextResponse.json(chapters);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      volumeId,
      arcId,
      chapterNumber,
      title,
      content,
      summary,
      chapterFunction,
      sceneCards,
      qualityScore,
    } = body;

    if (!title || !chapterFunction) {
      return NextResponse.json(
        { error: "缺少必填字段: title, chapterFunction" },
        { status: 400 }
      );
    }

    const nextNumber =
      chapterNumber ?? (await chapterService.getNextChapterNumber(id));

    const chapter = await chapterService.create({
      projectId: id,
      volumeId,
      arcId,
      chapterNumber: nextNumber,
      title,
      content,
      summary,
      chapterFunction,
      sceneCards,
      qualityScore,
    });

    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
