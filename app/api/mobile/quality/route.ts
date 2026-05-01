import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "缺少 projectId" }, { status: 400 });
    }

    // 最近 20 章的质量数据
    const chapters = await prisma.chapter.findMany({
      where: { projectId, qualityScore: { not: null } },
      orderBy: { chapterNumber: "desc" },
      take: 20,
      select: {
        chapterNumber: true,
        title: true,
        qualityScore: true,
        auditStatus: true,
        wordCount: true,
        updatedAt: true,
      },
    });

    // 审稿报告详情
    const auditReports = await prisma.auditReport.findMany({
      where: { chapter: { projectId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        qualityScore: true,
        mainPlotScore: true,
        characterChangeScore: true,
        conflictScore: true,
        hookScore: true,
        styleConsistencyScore: true,
        settingConsistencyScore: true,
        infoIncrementScore: true,
        emotionTensionScore: true,
        freshnessScore: true,
        readabilityScore: true,
        overallStatus: true,
        risks: true,
        createdAt: true,
        chapter: {
          select: { chapterNumber: true, title: true },
        },
      },
    });

    // 统计
    const scores = chapters.map((c) => c.qualityScore!);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    // 风格偏移趋势（通过 StyleFingerprint 的 consistencyReport）
    const consistencyReports = await prisma.consistencyReport.findMany({
      where: { chapter: { projectId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        voiceDriftScore: true,
        overallScore: true,
        createdAt: true,
        chapter: { select: { chapterNumber: true } },
      },
    });

    // 风险项统计
    const riskCounts = { red: 0, yellow: 0, green: 0 };
    for (const report of auditReports) {
      const status = report.overallStatus.toLowerCase();
      if (status in riskCounts) {
        riskCounts[status as keyof typeof riskCounts]++;
      }
    }

    return NextResponse.json({
      summary: { avgScore, minScore, maxScore, totalChapters: chapters.length },
      chapters: chapters.reverse(), // 按章节号正序
      auditReports: auditReports.map((r) => ({
        ...r,
        risks: Array.isArray(r.risks) ? r.risks.length : 0,
      })),
      consistencyTrend: consistencyReports.reverse(),
      riskCounts,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
