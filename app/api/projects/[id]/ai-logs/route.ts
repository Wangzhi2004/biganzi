import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);

    const jobType = searchParams.get("jobType");
    const chapterId = searchParams.get("chapterId");
    const stepName = searchParams.get("stepName");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: any = { projectId };

    if (chapterId) {
      where.chapterId = chapterId;
    }

    if (stepName) {
      where.stepName = stepName;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (jobType) {
      where.job = { jobType };
    }

    const [logs, total] = await Promise.all([
      prisma.aICallLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: { job: { select: { jobType: true, status: true } } },
      }),
      prisma.aICallLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
