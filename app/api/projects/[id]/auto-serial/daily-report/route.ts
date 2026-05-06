import { NextRequest, NextResponse } from "next/server";
import { autoSerialService } from "@/lib/services/auto-serial.service";

export interface DailyReport {
  date: string;
  projectId: string;
  chaptersGenerated: number;
  chaptersApproved: number;
  chaptersRejected: number;
  avgQualityScore: number;
  totalWords: number;
  trends: {
    qualityTrend: "up" | "down" | "stable";
    productivityTrend: "up" | "down" | "stable";
    approvalRateTrend: "up" | "down" | "stable";
  };
  suggestions: {
    type: string;
    message: string;
    priority: "high" | "medium" | "low";
  }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    const todayStats = await autoSerialService.getDailyStats(id, date);
    
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const yesterdayStats = await autoSerialService.getDailyStats(id, yesterdayStr);

    const sevenDaysAgo = new Date(date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyStats: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      const stats = await autoSerialService.getDailyStats(id, d.toISOString().split("T")[0]);
      weeklyStats.push(stats || { avgQualityScore: 0, chaptersGenerated: 0 });
    }

    const avgWeeklyQuality = weeklyStats.reduce((sum, s) => sum + (s.avgQualityScore || 0), 0) / weeklyStats.length;
    const avgWeeklyProductivity = weeklyStats.reduce((sum, s) => sum + (s.chaptersGenerated || 0), 0) / weeklyStats.length;

    const report: DailyReport = {
      date,
      projectId: id,
      chaptersGenerated: todayStats?.chaptersGenerated || 0,
      chaptersApproved: todayStats?.chaptersApproved || 0,
      chaptersRejected: todayStats?.chaptersRejected || 0,
      avgQualityScore: todayStats?.avgQualityScore || 0,
      totalWords: todayStats?.totalWords || 0,
      trends: {
        qualityTrend: calculateTrend(
          todayStats?.avgQualityScore || 0,
          yesterdayStats?.avgQualityScore || 0
        ),
        productivityTrend: calculateTrend(
          todayStats?.chaptersGenerated || 0,
          yesterdayStats?.chaptersGenerated || 0
        ),
        approvalRateTrend: calculateTrend(
          todayStats?.chaptersApproved ? (todayStats.chaptersApproved / (todayStats.chaptersGenerated || 1)) * 100 : 0,
          yesterdayStats?.chaptersApproved ? (yesterdayStats.chaptersApproved / (yesterdayStats.chaptersGenerated || 1)) * 100 : 0
        ),
      },
      suggestions: generateSuggestions(todayStats, avgWeeklyQuality, avgWeeklyProductivity),
    };

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("[GET_DAILY_REPORT_ERROR]", error);
    return NextResponse.json(
      { error: "获取日报失败" },
      { status: 500 }
    );
  }
}

function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (previous === 0) return "stable";
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return "up";
  if (change < -5) return "down";
  return "stable";
}

function generateSuggestions(stats: any, avgWeeklyQuality: number, avgWeeklyProductivity: number) {
  const suggestions: DailyReport["suggestions"] = [];

  if (stats) {
    if (stats.avgQualityScore < 70) {
      suggestions.push({
        type: "质量警告",
        message: `今日平均质量评分仅为 ${stats.avgQualityScore.toFixed(1)} 分，低于70分阈值。建议检查生成参数设置，考虑调整风格强度或创新程度。`,
        priority: "high",
      });
    } else if (stats.avgQualityScore < avgWeeklyQuality - 5) {
      suggestions.push({
        type: "质量下降",
        message: `今日质量评分较本周平均下降超过5分，建议关注最近生成章节的质量问题。`,
        priority: "medium",
      });
    }

    if (stats.chaptersRejected > 0) {
      const rejectionRate = (stats.chaptersRejected / stats.chaptersGenerated) * 100;
      suggestions.push({
        type: "拒绝率偏高",
        message: `今日有 ${stats.chaptersRejected} 章被拒绝（拒绝率 ${rejectionRate.toFixed(1)}%），建议调整自动重写阈值或优化生成参数。`,
        priority: "medium",
      });
    }

    if (stats.chaptersGenerated < avgWeeklyProductivity * 0.5) {
      suggestions.push({
        type: "产量偏低",
        message: `今日生成章节数低于本周平均的50%，建议检查自动连载配置或手动触发生成。`,
        priority: "low",
      });
    }

    if (stats.avgQualityScore >= 85) {
      suggestions.push({
        type: "质量优秀",
        message: `今日平均质量评分达到 ${stats.avgQualityScore.toFixed(1)} 分，表现优秀！继续保持当前配置。`,
        priority: "low",
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: "运行正常",
      message: "今日自动连载运行正常，未检测到需要关注的问题。",
      priority: "low",
    });
  }

  return suggestions;
}
