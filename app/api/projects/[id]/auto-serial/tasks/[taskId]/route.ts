import { NextRequest, NextResponse } from "next/server";
import { autoSerialService } from "@/lib/services/auto-serial.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: "任务ID是必需的" },
        { status: 400 }
      );
    }

    const task = await autoSerialService.getTasksByStatus(taskId, "");

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("[GET_SERIAL_TASK_ERROR]", error);
    return NextResponse.json(
      { error: "获取任务失败" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const action = body.action;

    if (!taskId || !action) {
      return NextResponse.json(
        { error: "任务ID和操作类型是必需的" },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case "approve":
        result = await autoSerialService.approveTask(taskId);
        break;
      case "reject":
        result = await autoSerialService.rejectTask(taskId);
        break;
      case "publish":
        result = await autoSerialService.publishTask(taskId);
        break;
      default:
        return NextResponse.json(
          { error: "无效的操作类型" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[PUT_SERIAL_TASK_ERROR]", error);
    return NextResponse.json(
      { error: "操作任务失败" },
      { status: 500 }
    );
  }
}
