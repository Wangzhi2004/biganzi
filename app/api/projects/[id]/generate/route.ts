import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@/lib/orchestrator/pipeline";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { forceRewrite } = body;

    const result = await pipeline.generateNextChapter(id, {
      forceRewrite,
      projectId: id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("不存在")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    if (errorMessage.includes("缺少")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    console.error("[GENERATE_API_ERROR]", error);
    return NextResponse.json(
      { error: "章节生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
