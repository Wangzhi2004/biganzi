import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const logs = await prisma.aICallLog.findMany({
      where: { jobId },
      orderBy: { stepOrder: "asc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
