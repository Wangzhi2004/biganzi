import { NextRequest, NextResponse } from "next/server";
import { getAllConfig, setConfig } from "@/lib/config";
import { resetClient } from "@/lib/ai/gateway";

export async function GET() {
  try {
    const config = getAllConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keys = [
      "AI_BASE_URL",
      "AI_API_KEY",
      "AI_MODEL",
      "WORDS_PER_CHAPTER",
      "REWRITE_THRESHOLD",
    ] as const;

    for (const key of keys) {
      if (body[key] !== undefined) {
        setConfig(key, String(body[key]));
      }
    }

    resetClient();

    return NextResponse.json({ success: true, config: getAllConfig() });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
