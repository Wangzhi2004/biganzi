import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const abilities = await prisma.ability.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(abilities);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json();
  const ability = await prisma.ability.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      limitations: body.limitations,
      ownerCharacterId: body.ownerCharacterId,
      firstSeenChapter: body.firstSeenChapter,
    },
  });
  return NextResponse.json(ability, { status: 201 });
}
