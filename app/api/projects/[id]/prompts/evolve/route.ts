import { NextRequest, NextResponse } from "next/server";
import { selfEvolution } from "@/lib/orchestrator/self-evolution";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { promptVersionId } = body;

    if (!promptVersionId) {
      return NextResponse.json({ error: "缺少 promptVersionId" }, { status: 400 });
    }

    const evolved = await selfEvolution.evolvePrompt(promptVersionId);

    if (!evolved) {
      return NextResponse.json({ message: "当前版本无需进化", evolved: null });
    }

    return NextResponse.json({ evolved, message: "提示词已进化到新版本" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
