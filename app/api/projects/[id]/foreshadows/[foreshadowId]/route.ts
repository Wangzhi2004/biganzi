import { NextRequest, NextResponse } from "next/server";
import { foreshadowService } from "@/lib/services/foreshadow.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; foreshadowId: string }> }
) {
  try {
    const { foreshadowId } = await params;
    const foreshadow = await foreshadowService.getById(foreshadowId);
    return NextResponse.json(foreshadow);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; foreshadowId: string }> }
) {
  try {
    const { foreshadowId } = await params;
    const body = await request.json();
    const foreshadow = await foreshadowService.update(foreshadowId, body);
    return NextResponse.json(foreshadow);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; foreshadowId: string }> }
) {
  try {
    const { foreshadowId } = await params;
    await foreshadowService.delete(foreshadowId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
