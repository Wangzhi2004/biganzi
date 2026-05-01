import { NextRequest, NextResponse } from "next/server";
import { vectorMemoryService } from "@/lib/services/vector-memory.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const contentType = searchParams.get("type") || undefined;
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query) {
      return NextResponse.json(
        { error: "Missing search query" },
        { status: 400 }
      );
    }

    const results = await vectorMemoryService.semanticSearch(
      projectId,
      query,
      contentType,
      limit
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: "Search failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
