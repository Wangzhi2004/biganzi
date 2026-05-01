#!/bin/bash
# 笔杆子一键部署脚本
# 用法: cd /opt/biganzi && bash scripts/deploy.sh

set -e
cd /opt/biganzi

echo "=== 停止服务 ==="
systemctl stop nginx 2>/dev/null || true
docker compose down

echo "=== 拉取代码 ==="
git reset --hard origin/main

echo "=== 构建启动 ==="
docker compose up -d --build

echo "=== 等待启动 ==="
sleep 25

echo "=== 数据库迁移 ==="
docker compose exec app npx prisma migrate deploy 2>/dev/null || echo "迁移已是最新"

echo "=== 启动 Nginx ==="
systemctl start nginx 2>/dev/null || true

echo "=== 验证 ==="
curl -s http://127.0.0.1:3000 | head -3
echo ""
echo "=== 完成 ==="
docker compose ps
