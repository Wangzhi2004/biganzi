import { NextRequest, NextResponse } from "next/server";
import { chapterService } from "@/lib/services/chapter.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const scenes = await chapterService.getScenesByChapter(chapterId);
    return NextResponse.json(scenes);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const body = await request.json();
    const {
      sceneNumber,
      location,
      characters,
      conflict,
      infoChange,
      emotionGoal,
      content,
    } = body;

    if (!sceneNumber || !location || !characters) {
      return NextResponse.json(
        { error: "缺少必填字段: sceneNumber, location, characters" },
        { status: 400 }
      );
    }

    const scene = await chapterService.createScene({
      chapterId,
      sceneNumber,
      location,
      characters,
      conflict,
      infoChange,
      emotionGoal,
      content,
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
