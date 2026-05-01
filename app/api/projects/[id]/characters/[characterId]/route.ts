import { NextRequest, NextResponse } from "next/server";
import { characterService } from "@/lib/services/character.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const character = await characterService.getById(characterId);
    return NextResponse.json(character);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const body = await request.json();
    const character = await characterService.update(characterId, body);
    return NextResponse.json(character);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;
    await characterService.delete(characterId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
