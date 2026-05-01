import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const locations = await prisma.location.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json();
  const location = await prisma.location.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      firstSeenChapter: body.firstSeenChapter,
    },
  });
  return NextResponse.json(location, { status: 201 });
}
