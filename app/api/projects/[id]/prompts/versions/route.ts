import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get("taskType");

    const where: any = {};
    if (taskType) where.taskType = taskType;

    const versions = await prisma.promptVersion.findMany({
      where,
      orderBy: [{ taskType: "asc" }, { version: "desc" }],
      take: 50,
    });

    return NextResponse.json(versions);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
