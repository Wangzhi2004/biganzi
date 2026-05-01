import { NextRequest, NextResponse } from "next/server";
import { vectorMemoryService } from "@/lib/services/vector-memory.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const chapterGoal = searchParams.get("goal") || "";
    const limit = parseInt(searchParams.get("limit") || "5");

    const context = await vectorMemoryService.recallRelevantContext(
      projectId,
      chapterGoal,
      []
    );

    return NextResponse.json({ context });
  } catch (error) {
    console.error("[VectorContext API] Error:", error);
    return NextResponse.json(
      { error: "Failed to recall context", details: (error as Error).message },
      { status: 500 }
    );
  }
}
