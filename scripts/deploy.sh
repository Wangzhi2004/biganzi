#!/bin/bash
# 笔杆子部署脚本
# 用法: bash deploy.sh
# 在 ECS 上执行，路径: /opt/biganzi

set -e

echo "=== 笔杆子部署 ==="
cd /opt/biganzi

# 1. 清除本地修改，拉取最新代码
echo "[1/5] 拉取最新代码..."
git checkout -- .
git pull origin main

# 2. 重建容器
echo "[2/5] 重建容器..."
docker compose down
docker compose up -d --build

# 3. 等待启动
echo "[3/5] 等待服务启动..."
sleep 20

# 4. 运行数据库迁移
echo "[4/5] 运行数据库迁移..."
docker compose exec app node_modules/.bin/prisma migrate deploy 2>/dev/null || echo "Migration 已是最新"

# 5. 重启 Nginx（如果已安装）
echo "[5/5] 重启 Nginx..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl restart nginx
    echo "Nginx 已重启"
else
    echo "Nginx 未安装，跳过"
fi

# 检查状态
echo ""
echo "=== 部署完成 ==="
docker compose ps
echo ""
echo "访问地址: http://$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo '你的公网IP')"
