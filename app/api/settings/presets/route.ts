import { NextResponse } from "next/server";
import { styleService } from "@/lib/services/style.service";

export async function GET() {
  try {
    const presets = await styleService.getPresets();
    return NextResponse.json(presets);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
