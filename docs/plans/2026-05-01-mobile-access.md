# 移动端远程访问实施计划

> **目标：** 手机通过 Cloudflare Tunnel 访问本地 Next.js 服务，实现远程监控生成进度、触发任务、查看报告。

**架构：**
```
手机 → m.域名.com (Cloudflare DNS → Tunnel) → localhost:3000
认证：Next.js middleware 校验 cookie 中的密码哈希
实时：SSE 推送 + 轮询兜底
```

**技术栈：** Next.js 16 + Tailwind 4 + SSE + cloudflared

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `middleware.ts` | 认证中间件，保护 /mobile/* 和 /api/mobile/* |
| `lib/mobile-auth.ts` | 密码校验工具函数 |
| `app/api/mobile/auth/route.ts` | 登录/登出 API |
| `app/api/mobile/dashboard/route.ts` | 仪表盘数据聚合 |
| `app/api/mobile/tasks/route.ts` | 任务列表 + 创建 |
| `app/api/mobile/tasks/[id]/stream/route.ts` | SSE 实时进度流 |
| `app/mobile/layout.tsx` | 移动端布局（无 sidebar） |
| `app/mobile/page.tsx` | 仪表盘 + 任务列表（单页） |
| `app/mobile/login/page.tsx` | 登录页 |
| `cloudflared/config.yml` | Tunnel 配置模板 |

---

## Phase 1：认证

### Task 1: 密码工具函数

**Files:**
- Create: `lib/mobile-auth.ts`

```typescript
import { cookies } from "next/headers";
import { createHash } from "crypto";

const MOBILE_PASSWORD = process.env.MOBILE_PASSWORD || "";
const COOKIE_NAME = "biganzi_mobile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex").slice(0, 32);
}

export function verifyPassword(password: string): boolean {
  if (!MOBILE_PASSWORD) return false;
  return password === MOBILE_PASSWORD;
}

export function createSession(): string {
  return hashPassword(MOBILE_PASSWORD + Date.now());
}

export async function isAuthenticated(): Promise<boolean> {
  if (!MOBILE_PASSWORD) return false; // 未配置密码 = 未启用
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return false;
  // 简单校验：cookie 存在且格式正确
  return session.length === 32;
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
```

### Task 2: 认证中间件

**Files:**
- Create: `middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

const MOBILE_PASSWORD = process.env.MOBILE_PASSWORD;
const COOKIE_NAME = "biganzi_mobile";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只拦截 mobile 路由
  const isMobileRoute = pathname.startsWith("/mobile");
  const isMobileApi = pathname.startsWith("/api/mobile");
  const isAuthApi = pathname.startsWith("/api/mobile/auth");

  if (!isMobileRoute && !isMobileApi) return NextResponse.next();

  // 登录 API 不需要认证
  if (isAuthApi) return NextResponse.next();

  // 未配置密码 = 未启用 mobile 功能
  if (!MOBILE_PASSWORD) {
    if (isMobileRoute) {
      return NextResponse.redirect(new URL("/mobile/login?error=not_configured", request.url));
    }
    return NextResponse.json({ error: "移动端未配置" }, { status: 503 });
  }

  // 检查 cookie
  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (!session || session.length !== 32) {
    if (isMobileRoute) {
      return NextResponse.redirect(new URL("/mobile/login", request.url));
    }
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/mobile/:path*", "/api/mobile/:path*"],
};
```

### Task 3: 登录/登出 API

**Files:**
- Create: `app/api/mobile/auth/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

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
```

### Task 4: 登录页

**Files:**
- Create: `app/mobile/login/page.tsx`

响应式登录页，输入密码，POST 到 /api/mobile/auth，成功后跳转 /mobile。

---

## Phase 2：移动端 API

### Task 5: 仪表盘聚合 API

**Files:**
- Create: `app/api/mobile/dashboard/route.ts`

聚合项目列表、最新章节、质量均分、Agent 状态、进化周期，一次请求返回所有仪表盘数据。

### Task 6: 任务 API

**Files:**
- Create: `app/api/mobile/tasks/route.ts`

GET: 最近 20 个 GenerationJob（含状态、耗时、质量分）
POST: 触发 pipeline.generateNextChapter，返回 jobId

### Task 7: SSE 进度流

**Files:**
- Create: `app/api/mobile/tasks/[id]/stream/route.ts`

SSE 端点，轮询 GenerationJob 状态并推送进度事件。pipeline.ts 现在是同步执行，SSE 通过轮询 job 状态 + AICallLog 实现近实时推送。

---

## Phase 3：移动端页面

### Task 8: 移动端布局

**Files:**
- Create: `app/mobile/layout.tsx`

无 sidebar，全宽，底部导航栏。

### Task 9: 移动端仪表盘

**Files:**
- Create: `app/mobile/page.tsx`

单页应用：项目选择 → 仪表盘（字数/章数/质量/Agent） → 一键生成 → 任务列表。

---

## Phase 4：Cloudflare Tunnel

### Task 10: Tunnel 配置

**Files:**
- Create: `cloudflared/config.yml`

配置模板 + 设置指南。
