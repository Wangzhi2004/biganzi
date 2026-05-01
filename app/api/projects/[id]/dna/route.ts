import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dna = await prisma.bookDNA.findUnique({
      where: { projectId: id },
    });
    return NextResponse.json(dna);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const dna = await prisma.bookDNA.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        genre: body.genre ?? "",
        subGenre: body.subGenre ?? "",
        targetPlatform: body.targetPlatform ?? "",
        targetWords: body.targetWords ?? 0,
        updateRhythm: body.updateRhythm ?? "",
        coreHook: body.coreHook ?? "",
        protagonistTheme: body.protagonistTheme ?? "",
        finalEmotion: body.finalEmotion ?? "",
        mainlineQuestion: body.mainlineQuestion ?? "",
        worldKeywords: body.worldKeywords ?? "",
        pleasureMechanism: body.pleasureMechanism ?? "",
        emotionMechanism: body.emotionMechanism ?? "",
        forbiddenRules: body.forbiddenRules ?? [],
        styleDirection: body.styleDirection ?? "",
        targetReaderProfile: body.targetReaderProfile ?? "",
        readerPromises: body.readerPromises ?? [],
      },
      update: {
        ...(body.genre !== undefined && { genre: body.genre }),
        ...(body.subGenre !== undefined && { subGenre: body.subGenre }),
        ...(body.targetPlatform !== undefined && {
          targetPlatform: body.targetPlatform,
        }),
        ...(body.targetWords !== undefined && { targetWords: body.targetWords }),
        ...(body.updateRhythm !== undefined && {
          updateRhythm: body.updateRhythm,
        }),
        ...(body.coreHook !== undefined && { coreHook: body.coreHook }),
        ...(body.protagonistTheme !== undefined && {
          protagonistTheme: body.protagonistTheme,
        }),
        ...(body.finalEmotion !== undefined && {
          finalEmotion: body.finalEmotion,
        }),
        ...(body.mainlineQuestion !== undefined && {
          mainlineQuestion: body.mainlineQuestion,
        }),
        ...(body.worldKeywords !== undefined && {
          worldKeywords: body.worldKeywords,
        }),
        ...(body.pleasureMechanism !== undefined && {
          pleasureMechanism: body.pleasureMechanism,
        }),
        ...(body.emotionMechanism !== undefined && {
          emotionMechanism: body.emotionMechanism,
        }),
        ...(body.forbiddenRules !== undefined && {
          forbiddenRules: body.forbiddenRules,
        }),
        ...(body.styleDirection !== undefined && {
          styleDirection: body.styleDirection,
        }),
        ...(body.targetReaderProfile !== undefined && {
          targetReaderProfile: body.targetReaderProfile,
        }),
        ...(body.readerPromises !== undefined && {
          readerPromises: body.readerPromises,
        }),
      },
    });

    return NextResponse.json(dna);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
