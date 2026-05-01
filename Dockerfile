FROM node:20-alpine AS base

# 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
# 2GB服务器，Node.js限制1.2GB，留给系统和Docker一些余量
ENV NODE_OPTIONS="--max-old-space-size=1228"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# 使用SWC编译器减少内存占用
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 生产阶段
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000
ENV PORT=3000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
