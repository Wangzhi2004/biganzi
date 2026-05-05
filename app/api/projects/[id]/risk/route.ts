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

    const result = await planningService.checkProjectRisks(id);

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

    console.error("[CHECK_PROJECT_RISKS_ERROR]", error);
    return NextResponse.json(
      { error: "检查项目风险失败，请稍后重试" },
      { status: 500 }
    );
  }
}
