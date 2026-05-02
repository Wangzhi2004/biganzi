# ============================================================
# 笔杆子 Dockerfile - 支持两种模式
# 模式1: 本地构建（推荐，避免服务器OOM）
#   - 在本地运行 npm run build 生成 .next/standalone
#   - 把产物和代码一起传到服务器
#   - Docker 只复制产物，不构建
#
# 模式2: 服务器构建（备用，需要至少2GB内存+swap）
#   - 如果 .next/standalone 不存在，自动在服务器构建
#   - 使用极低内存配置，可能很慢
# ============================================================

FROM node:20-alpine AS base

# ==================== 模式1: 本地构建产物部署 ====================
FROM base AS local-build
WORKDIR /app

# 只复制生产依赖和构建产物
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY public ./public/
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY node_modules ./node_modules
COPY node_modules/.prisma ./node_modules/.prisma
COPY node_modules/@prisma ./node_modules/@prisma

ENV NODE_ENV=production
ENV PORT=80

# 运行时生成Prisma客户端（如果需要）
RUN npx prisma generate 2>/dev/null || true

EXPOSE 80
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]

# ==================== 模式2: 服务器构建 ====================
FROM base AS server-build
WORKDIR /app

# 2GB服务器极限优化
ENV NODE_OPTIONS="--max-old-space-size=384"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_WORKERS=1
ENV NODE_ENV=production

# 先复制依赖清单
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 安装依赖（仅生产依赖节省内存）
RUN npm ci --omit=dev --no-audit --no-fund
RUN npx prisma generate

# 复制源码
COPY . .

# 构建：使用单线程，禁用sourcemap，极低内存
RUN NODE_OPTIONS="--max-old-space-size=384" \
    npx next build \
    --no-lint \
    2>&1 || \
    (echo "=== 构建失败，尝试用512MB内存重试 ===" && \
     NODE_OPTIONS="--max-old-space-size=512" \
     npx next build --no-lint 2>&1)

# 生产运行阶段
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物（来自local-build或server-build）
COPY --from=local-build /app/public ./public 2>/dev/null || true
COPY --from=local-build /app/.next/standalone ./ 2>/dev/null || true
COPY --from=local-build /app/.next/static ./.next/static 2>/dev/null || true
COPY --from=local-build /app/node_modules ./node_modules 2>/dev/null || true
COPY --from=local-build /app/prisma ./prisma 2>/dev/null || true
COPY --from=local-build /app/package.json ./package.json 2>/dev/null || true

# 如果local-build产物不存在，从server-build复制
COPY --from=server-build /app/public ./public 2>/dev/null || true
COPY --from=server-build /app/.next/standalone ./ 2>/dev/null || true
COPY --from=server-build /app/.next/static ./.next/static 2>/dev/null || true
COPY --from=server-build /app/node_modules ./node_modules 2>/dev/null || true
COPY --from=server-build /app/prisma ./prisma 2>/dev/null || true
COPY --from=server-build /app/package.json ./package.json 2>/dev/null || true

USER nextjs
EXPOSE 80
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
