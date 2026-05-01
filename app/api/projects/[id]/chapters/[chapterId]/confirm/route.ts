import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@/lib/orchestrator/pipeline";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;

    if (!id || !chapterId) {
      return NextResponse.json(
        { error: "项目ID和章节ID是必需的" },
        { status: 400 }
      );
    }

    await pipeline.confirmAndApplyState(id, chapterId);

    return NextResponse.json({
      success: true,
      message: "章节已确认并应用状态变更",
    });
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("不存在")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    console.error("[CONFIRM_CHAPTER_ERROR]", error);
    return NextResponse.json(
      { error: "章节确认失败，请稍后重试" },
      { status: 500 }
    );
  }
}
