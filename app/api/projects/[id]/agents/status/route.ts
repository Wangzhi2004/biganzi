import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const performances = await prisma.agentPerformance.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json(performances);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
