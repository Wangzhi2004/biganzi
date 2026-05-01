import { jsonCompletion, type LogContext } from "@/lib/ai";
import {
  buildConsistencyAuditPrompt,
  buildPacingAuditPrompt,
  buildAuditPrompt,
} from "@/lib/ai/prompts";
import type { AuditReportResult } from "@/types";

interface AuditContext {
  chapterContent: string;
  chapterGoal: string;
  chapterFunction: string;
  bookDna: any;
  activeCharacters: any[];
  activeForeshadows: any[];
  worldRules: any[];
  styleFingerprint: any;
  recentChapters: any[];
  pacingState: any;
}

export interface MultiRoundAuditResult {
  consistencyScore: number;
  pacingScore: number;
  styleScore: number;
  finalScore: number;
  overallStatus: "green" | "yellow" | "red";
  consistencyIssues: any[];
  pacingIssues: any[];
  styleReport: AuditReportResult;
  refineHints: {
    dialogueScore?: number;
    dialogueRatio?: number;
    imageryScore?: number;
    environmentRatio?: number;
    readabilityScore?: number;
    hookScore?: number;
  };
}

export const multiRoundAudit = {
  async execute(
    ctx: AuditContext,
    logContext?: LogContext
  ): Promise<MultiRoundAuditResult> {
    // Round 1: Consistency check
    const { data: consistencyResult } = await jsonCompletion(
      buildConsistencyAuditPrompt({
        chapterContent: ctx.chapterContent,
        chapterGoal: ctx.chapterGoal,
        activeCharacters: ctx.activeCharacters,
        activeForeshadows: ctx.activeForeshadows,
        worldRules: ctx.worldRules,
        recentChapters: ctx.recentChapters,
      }),
      undefined,
      logContext
        ? { ...logContext, stepName: "audit_consistency", stepOrder: 14 }
        : undefined
    );

    // Round 2: Pacing check
    const { data: pacingResult } = await jsonCompletion(
      buildPacingAuditPrompt({
        chapterContent: ctx.chapterContent,
        chapterGoal: ctx.chapterGoal,
        chapterFunction: ctx.chapterFunction,
        pacingState: ctx.pacingState,
        styleFingerprint: ctx.styleFingerprint,
        recentChapters: ctx.recentChapters,
      }),
      undefined,
      logContext
        ? { ...logContext, stepName: "audit_pacing", stepOrder: 15 }
        : undefined
    );

    // Round 3: Style check (reuse existing audit prompt)
    const { data: styleResult } = await jsonCompletion(
      buildAuditPrompt({
        chapterContent: ctx.chapterContent,
        chapterGoal: ctx.chapterGoal,
        bookDna: ctx.bookDna,
        activeCharacters: ctx.activeCharacters,
        activeForeshadows: ctx.activeForeshadows,
        worldRules: ctx.worldRules,
        styleFingerprint: ctx.styleFingerprint,
        recentChapters: ctx.recentChapters,
      }),
      undefined,
      logContext
        ? { ...logContext, stepName: "audit_style", stepOrder: 16 }
        : undefined
    );

    // Calculate weighted final score
    const consistencyScore = consistencyResult.consistencyScore || 5;
    const pacingScore = pacingResult.pacingScore || 5;
    const styleScore = styleResult.qualityScore
      ? styleResult.qualityScore / 10
      : 5;

    const finalScore =
      Math.round(
        (consistencyScore * 0.35 +
          pacingScore * 0.35 +
          styleScore * 0.3) *
          10
      ) / 10;

    // Determine overall status
    const hasRedIssue =
      consistencyResult.issues?.some((i: any) => i.severity === "red") ||
      pacingResult.issues?.some((i: any) => i.severity === "red") ||
      styleResult.risks?.some((r: any) => r.level === "red");

    let overallStatus: "green" | "yellow" | "red";
    if (finalScore >= 8 && !hasRedIssue) {
      overallStatus = "green";
    } else if (finalScore >= 6 && !hasRedIssue) {
      overallStatus = "yellow";
    } else {
      overallStatus = "red";
    }

    return {
      consistencyScore,
      pacingScore,
      styleScore,
      finalScore,
      overallStatus,
      consistencyIssues: consistencyResult.issues || [],
      pacingIssues: pacingResult.issues || [],
      styleReport: styleResult,
      refineHints: {
        dialogueScore: consistencyResult.issues?.some(
          (i: any) => i.type === "character_behavior"
        )
          ? 5
          : 8,
        imageryScore: styleResult.readabilityScore || 7,
        readabilityScore: styleResult.readabilityScore || 7,
        hookScore: pacingResult.hookStrength || 7,
      },
    };
  },
};
