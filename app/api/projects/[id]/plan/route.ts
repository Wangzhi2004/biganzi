import { NextRequest, NextResponse } from "next/server";
import { planningService } from "@/lib/services/planning.service";

export async function GET(
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

    const result = await planningService.getPacingState(id);

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

    console.error("[GET_PACING_STATE_ERROR]", error);
    return NextResponse.json(
      { error: "获取节奏状态失败，请稍后重试" },
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

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    const result = await planningService.recommendNextFunction(id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("不存在") || errorMessage.includes("缺少")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    console.error("[PLAN_FUNCTION_ERROR]", error);
    return NextResponse.json(
      { error: "获取推荐功能失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function GET(
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

    const result = await planningService.getPacingState(id);

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

    console.error("[GET_PACING_STATE_ERROR]", error);
    return NextResponse.json(
      { error: "获取节奏状态失败，请稍后重试" },
      { status: 500 }
    );
  }
}
