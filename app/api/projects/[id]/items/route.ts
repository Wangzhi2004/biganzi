import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const items = await prisma.item.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json();
  const item = await prisma.item.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      abilities: body.abilities,
      firstSeenChapter: body.firstSeenChapter,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
