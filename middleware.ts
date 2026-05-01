import { NextRequest, NextResponse } from "next/server";

const MOBILE_PASSWORD = process.env.MOBILE_PASSWORD;
const COOKIE_NAME = "biganzi_mobile";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isMobileRoute = pathname.startsWith("/mobile");
  const isMobileApi = pathname.startsWith("/api/mobile");
  const isAuthApi = pathname === "/api/mobile/auth";

  if (!isMobileRoute && !isMobileApi) return NextResponse.next();

  // 登录 API 不需要认证
  if (isAuthApi) return NextResponse.next();

  // 未配置密码 = mobile 功能未启用
  if (!MOBILE_PASSWORD) {
    if (isMobileRoute && !pathname.startsWith("/mobile/login")) {
      return NextResponse.redirect(
        new URL("/mobile/login?error=not_configured", request.url)
      );
    }
    if (isMobileApi) {
      return NextResponse.json({ error: "移动端未配置 MOBILE_PASSWORD" }, { status: 503 });
    }
    return NextResponse.next();
  }

  // 检查 session cookie
  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (!session || !/^[a-f0-9]{32}$/.test(session)) {
    if (isMobileRoute && !pathname.startsWith("/mobile/login")) {
      return NextResponse.redirect(new URL("/mobile/login", request.url));
    }
    if (isMobileApi) {
      return NextResponse.json({ error: "未认证" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/mobile/:path*", "/api/mobile/:path*"],
};
