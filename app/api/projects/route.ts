import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/lib/services/project.service";
import { prisma } from "@/lib/prisma";

async function getDefaultUserId(): Promise<string> {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "default@biganzi.local",
        passwordHash: "no-auth",
        name: "默认用户",
      },
    });
  }
  return user.id;
}

export async function GET() {
  try {
    const userId = await getDefaultUserId();
    const projects = await projectService.listByUser(userId);
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, genre, subGenre, description } = body;

    if (!name || !genre) {
      return NextResponse.json(
        { error: "缺少必填字段: name, genre" },
        { status: 400 }
      );
    }

    const userId = await getDefaultUserId();
    const project = await projectService.create({
      userId,
      name,
      genre,
      subGenre,
      description,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
