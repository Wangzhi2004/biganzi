import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orgId: string }> }
) {
  const { orgId } = await params;
  const body = await req.json();
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.members !== undefined && { members: body.members }),
    },
  });
  return NextResponse.json(org);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orgId: string }> }
) {
  const { orgId } = await params;
  await prisma.organization.delete({ where: { id: orgId } });
  return NextResponse.json({ success: true });
}
