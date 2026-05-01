import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const rules = await prisma.worldRule.findMany({
    where: { projectId },
    orderBy: { category: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json();
  const rule = await prisma.worldRule.create({
    data: {
      projectId,
      category: body.category || "world",
      content: body.content,
      sourceChapter: body.sourceChapter,
      status: body.status || "DRAFT",
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
