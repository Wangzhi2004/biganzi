import { chatCompletion, type LogContext } from "@/lib/ai";
import {
  buildDialogueEnhancePrompt,
  buildSensoryEnrichPrompt,
  buildSentencePolishPrompt,
  buildHookStrengthenPrompt,
} from "@/lib/ai/prompts";

interface RefineContext {
  text: string;
  activeCharacters: any[];
  styleFingerprint: any;
  chapterGoal: string;
}

interface RefineAuditHints {
  dialogueScore?: number;
  dialogueRatio?: number;
  imageryScore?: number;
  environmentRatio?: number;
  readabilityScore?: number;
  hookScore?: number;
}

export const refinePasses = {
  async execute(
    ctx: RefineContext,
    hints: RefineAuditHints,
    logContext?: LogContext
  ): Promise<{ text: string; passesRun: string[] }> {
    let text = ctx.text;
    const passesRun: string[] = [];

    // Pass 1: Dialogue enhance
    if (
      (hints.dialogueScore !== undefined && hints.dialogueScore < 6) ||
      (hints.dialogueRatio !== undefined && hints.dialogueRatio < 0.15)
    ) {
      const { content } = await chatCompletion(
        buildDialogueEnhancePrompt({
          text,
          activeCharacters: ctx.activeCharacters,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_dialogue", stepOrder: 10 }
          : undefined
      );
      text = content;
      passesRun.push("dialogue_enhance");
    }

    // Pass 2: Sensory enrich
    if (
      (hints.imageryScore !== undefined && hints.imageryScore < 6) ||
      (hints.environmentRatio !== undefined && hints.environmentRatio < 0.1)
    ) {
      const { content } = await chatCompletion(
        buildSensoryEnrichPrompt({
          text,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_sensory", stepOrder: 11 }
          : undefined
      );
      text = content;
      passesRun.push("sensory_enrich");
    }

    // Pass 3: Sentence polish
    if (hints.readabilityScore !== undefined && hints.readabilityScore < 6) {
      const { content } = await chatCompletion(
        buildSentencePolishPrompt({
          text,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_polish", stepOrder: 12 }
          : undefined
      );
      text = content;
      passesRun.push("sentence_polish");
    }

    // Pass 4: Hook strengthen
    if (hints.hookScore !== undefined && hints.hookScore < 7) {
      const { content } = await chatCompletion(
        buildHookStrengthenPrompt({
          text,
          chapterGoal: ctx.chapterGoal,
          styleFingerprint: ctx.styleFingerprint,
        }),
        undefined,
        logContext
          ? { ...logContext, stepName: "refine_hook", stepOrder: 13 }
          : undefined
      );
      text = content;
      passesRun.push("hook_strengthen");
    }

    return { text, passesRun };
  },
};
