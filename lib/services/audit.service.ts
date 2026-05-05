import { prisma } from "@/lib/prisma";
import type { AuditReportResult } from "@/types";

const AUDIT_STATUS_MAP: Record<string, "PENDING" | "GREEN" | "YELLOW" | "RED"> =
  {
    pending: "PENDING",
    green: "GREEN",
    yellow: "YELLOW",
    red: "RED",
  };

export const auditService = {
  async saveAuditReport(chapterId: string, report: AuditReportResult) {
    try {
      const status = AUDIT_STATUS_MAP[report.overallStatus];
      if (!status) {
        throw new Error(`无效的审核状态: ${report.overallStatus}`);
      }

      await prisma.$transaction(async (tx) => {
        await tx.auditReport.upsert({
          where: { chapterId },
          create: {
            chapterId,
            overallStatus: status,
            qualityScore: report.qualityScore,
            mainPlotScore: report.mainPlotScore,
            characterChangeScore: report.characterChangeScore,
            conflictScore: report.conflictScore,
            hookScore: report.hookScore,
            styleConsistencyScore: report.styleConsistencyScore,
            settingConsistencyScore: report.settingConsistencyScore,
            infoIncrementScore: report.infoIncrementScore,
            emotionTensionScore: report.emotionTensionScore,
            freshnessScore: report.freshnessScore,
            readabilityScore: report.readabilityScore,
            risks: report.risks,
            rewriteActions: report.rewriteActions,
            conflictPoints: report.conflictPoints,
            enhancementSuggestions: report.enhancementSuggestions,
          },
          update: {
            overallStatus: status,
            qualityScore: report.qualityScore,
            mainPlotScore: report.mainPlotScore,
            characterChangeScore: report.characterChangeScore,
            conflictScore: report.conflictScore,
            hookScore: report.hookScore,
            styleConsistencyScore: report.styleConsistencyScore,
            settingConsistencyScore: report.settingConsistencyScore,
            infoIncrementScore: report.infoIncrementScore,
            emotionTensionScore: report.emotionTensionScore,
            freshnessScore: report.freshnessScore,
            readabilityScore: report.readabilityScore,
            risks: report.risks,
            rewriteActions: report.rewriteActions,
            conflictPoints: report.conflictPoints,
            enhancementSuggestions: report.enhancementSuggestions,
          },
        });

        await tx.chapter.update({
          where: { id: chapterId },
          data: {
            auditStatus: status,
            qualityScore: report.qualityScore,
          },
        });
      });
    } catch (error) {
      throw new Error(`保存审核报告失败: ${(error as Error).message}`);
    }
  },

  async getAuditReport(chapterId: string) {
    try {
      const report = await prisma.auditReport.findUnique({
        where: { chapterId },
      });
      if (!report) {
        throw new Error("审核报告不存在");
      }
      return report;
    } catch (error) {
      throw new Error(`获取审核报告失败: ${(error as Error).message}`);
    }
  },

  async deleteAuditReport(chapterId: string) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.auditReport.delete({ where: { chapterId } });
        await tx.chapter.update({
          where: { id: chapterId },
          data: { auditStatus: "PENDING", qualityScore: null },
        });
      });
    } catch (error) {
      throw new Error(`删除审核报告失败: ${(error as Error).message}`);
    }
  },
};
