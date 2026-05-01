import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; abilityId: string }> }
) {
  const { abilityId } = await params;
  const body = await req.json();
  const ability = await prisma.ability.update({
    where: { id: abilityId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.limitations !== undefined && { limitations: body.limitations }),
    },
  });
  return NextResponse.json(ability);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; abilityId: string }> }
) {
  const { abilityId } = await params;
  await prisma.ability.delete({ where: { id: abilityId } });
  return NextResponse.json({ success: true });
}
