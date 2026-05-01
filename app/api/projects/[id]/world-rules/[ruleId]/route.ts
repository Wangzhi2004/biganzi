import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { ruleId } = await params;
  const body = await req.json();
  const rule = await prisma.worldRule.update({
    where: { id: ruleId },
    data: {
      ...(body.category !== undefined && { category: body.category }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.sourceChapter !== undefined && { sourceChapter: body.sourceChapter }),
    },
  });
  return NextResponse.json(rule);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { ruleId } = await params;
  await prisma.worldRule.delete({ where: { id: ruleId } });
  return NextResponse.json({ success: true });
}
