import { NextRequest, NextResponse } from "next/server";
import { characterService } from "@/lib/services/character.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const relationships = await characterService.getRelationships(id);
    return NextResponse.json(relationships);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
