import { NextRequest, NextResponse } from "next/server";
import { autoSerialService } from "@/lib/services/auto-serial.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const status = request.nextUrl.searchParams.get("status");

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    let tasks;
    if (status) {
      tasks = await autoSerialService.getTasksByStatus(id, status);
    } else {
      tasks = await autoSerialService.getPendingTasks(id);
    }

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("[GET_SERIAL_TASKS_ERROR]", error);
    return NextResponse.json(
      { error: "获取任务列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const count = body.count || 1;

    if (!id) {
      return NextResponse.json(
        { error: "项目ID是必需的" },
        { status: 400 }
      );
    }

    const tasks = await autoSerialService.createTasks(id, count);

    for (const task of tasks) {
      await autoSerialService.executeTask(task.id);
    }

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("[POST_SERIAL_TASKS_ERROR]", error);
    return NextResponse.json(
      { error: "创建任务失败" },
      { status: 500 }
    );
  }
}
