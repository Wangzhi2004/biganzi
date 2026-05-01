import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createSession,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body as { password?: string };

    if (!password) {
      return NextResponse.json({ error: "请输入密码" }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    const session = createSession();
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, session, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
