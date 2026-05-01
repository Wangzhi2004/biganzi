import { NextRequest, NextResponse } from "next/server";
import { auditService } from "@/lib/services/audit.service";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const report = await auditService.getAuditReport(chapterId);

    const rawLog = await prisma.aICallLog.findFirst({
      where: { chapterId, stepName: "audit" },
      orderBy: { createdAt: "desc" },
      select: { response: true },
    });

    return NextResponse.json({
      ...report,
      rawAiResponse: rawLog?.response || null,
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
