import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const orgs = await prisma.organization.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(orgs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json();
  const org = await prisma.organization.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      members: body.members,
      firstSeenChapter: body.firstSeenChapter,
    },
  });
  return NextResponse.json(org, { status: 201 });
}
