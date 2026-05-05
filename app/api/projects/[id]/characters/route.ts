import { NextRequest, NextResponse } from "next/server";
import { characterService } from "@/lib/services/character.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characters = await characterService.listByProject(id);
    return NextResponse.json(characters);
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
      name,
      aliases,
      roleType,
      desire,
      fear,
      wound,
      secret,
      moralBoundary,
      temptation,
      infoBoundary,
      decisionPreference,
      growthStage,
      speechPattern,
      currentGoal,
      currentLocation,
      currentStatus,
      powerLevel,
    } = body;

    if (!name || !roleType) {
      return NextResponse.json(
        { error: "缺少必填字段: name, roleType" },
        { status: 400 }
      );
    }

    const character = await characterService.create({
      projectId: id,
      name,
      aliases,
      roleType,
      desire,
      fear,
      wound,
      secret,
      moralBoundary,
      temptation,
      infoBoundary,
      decisionPreference,
      growthStage,
      speechPattern,
      currentGoal,
      currentLocation,
      currentStatus,
      powerLevel,
    });

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
