import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface AutoSerialConfig {
  projectId: string;
  enabled: boolean;
  dailyChapterCount: number;
  chapterWordCount: number;
  styleStrength: number;
  pleasureDensity: number;
  plotSpeed: "slow" | "medium" | "fast";
  innovationLevel: "conservative" | "balanced" | "aggressive";
  dramaLevel: "light" | "moderate" | "hardcore";
  romanceWeight: "low" | "medium" | "high";
  worldExpansionSpeed: "slow" | "medium" | "fast";
  autoRewriteThreshold: number;
  requireHumanApproval: boolean;
  preferredTime: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    let config = await prisma.autoSerialConfig.findUnique({
      where: { projectId: id },
    });

    if (!config) {
      config = await prisma.autoSerialConfig.create({
        data: {
          projectId: id,
          enabled: false,
          dailyChapterCount: 1,
          chapterWordCount: 4000,
          styleStrength: 50,
          pleasureDensity: 50,
          plotSpeed: "medium",
          innovationLevel: "balanced",
          dramaLevel: "moderate",
          romanceWeight: "medium",
          worldExpansionSpeed: "medium",
          autoRewriteThreshold: 70,
          requireHumanApproval: true,
          preferredTime: "09:00",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[GET_AUTO_SERIAL_CONFIG_ERROR]", error);
    return NextResponse.json(
      { error: "获取自动连载配置失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    const config = await prisma.autoSerialConfig.upsert({
      where: { projectId: id },
      update: {
        enabled: body.enabled,
        dailyChapterCount: body.dailyChapterCount,
        chapterWordCount: body.chapterWordCount,
        styleStrength: body.styleStrength,
        pleasureDensity: body.pleasureDensity,
        plotSpeed: body.plotSpeed,
        innovationLevel: body.innovationLevel,
        dramaLevel: body.dramaLevel,
        romanceWeight: body.romanceWeight,
        worldExpansionSpeed: body.worldExpansionSpeed,
        autoRewriteThreshold: body.autoRewriteThreshold,
        requireHumanApproval: body.requireHumanApproval,
        preferredTime: body.preferredTime,
      },
      create: {
        projectId: id,
        enabled: body.enabled,
        dailyChapterCount: body.dailyChapterCount,
        chapterWordCount: body.chapterWordCount,
        styleStrength: body.styleStrength,
        pleasureDensity: body.pleasureDensity,
        plotSpeed: body.plotSpeed,
        innovationLevel: body.innovationLevel,
        dramaLevel: body.dramaLevel,
        romanceWeight: body.romanceWeight,
        worldExpansionSpeed: body.worldExpansionSpeed,
        autoRewriteThreshold: body.autoRewriteThreshold,
        requireHumanApproval: body.requireHumanApproval,
        preferredTime: body.preferredTime,
      },
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[POST_AUTO_SERIAL_CONFIG_ERROR]", error);
    return NextResponse.json(
      { error: "保存自动连载配置失败" },
      { status: 500 }
    );
  }
}
