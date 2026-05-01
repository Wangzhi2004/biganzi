import { NextRequest, NextResponse } from "next/server";
import { foreshadowService } from "@/lib/services/foreshadow.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    const foreshadows = await foreshadowService.listByProject(id, {
      status,
    });
    return NextResponse.json(foreshadows);
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
      plantedChapter,
      clueText,
      surfaceMeaning,
      trueMeaning,
      relatedCharacters,
      expectedPayoffStart,
      expectedPayoffEnd,
    } = body;

    if (!clueText || !surfaceMeaning || !trueMeaning) {
      return NextResponse.json(
        { error: "缺少必填字段: clueText, surfaceMeaning, trueMeaning" },
        { status: 400 }
      );
    }

    const foreshadow = await foreshadowService.create({
      projectId: id,
      plantedChapter: plantedChapter ?? 1,
      clueText,
      surfaceMeaning,
      trueMeaning,
      relatedCharacters,
      expectedPayoffStart,
      expectedPayoffEnd,
    });

    return NextResponse.json(foreshadow, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
