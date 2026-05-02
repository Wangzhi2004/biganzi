#!/bin/bash
# 笔杆子一键部署脚本
# 支持两种模式：
#   1. 本地构建产物部署（推荐）：本地运行 npm run build 后上传
#   2. 服务器构建（备用）：在服务器上构建，需要2GB+swap
#
# 用法: cd /opt/biganzi && bash scripts/deploy.sh

set -e
cd /opt/biganzi

echo "========================================"
echo "  笔杆子部署脚本"
echo "========================================"

# 检测是否有本地构建产物
HAS_LOCAL_BUILD=false
if [ -d ".next/standalone" ] && [ -f ".next/standalone/server.js" ]; then
    HAS_LOCAL_BUILD=true
    echo "✓ 检测到本地构建产物 (.next/standalone)"
else
    echo "✗ 未检测到本地构建产物"
fi

echo ""
echo "=== 停止服务 ==="
systemctl stop nginx 2>/dev/null || true
docker compose down 2>/dev/null || true

echo ""
echo "=== 清理旧容器和缓存 ==="
docker compose rm -f 2>/dev/null || true

# 如果没有本地构建产物，清理更彻底并检查swap
if [ "$HAS_LOCAL_BUILD" = false ]; then
    echo "=== 服务器构建模式：清理Docker缓存 ==="
    docker system prune -a -f 2>/dev/null || true
    docker builder prune -f 2>/dev/null || true
    rm -rf .next 2>/dev/null || true

    # 检查并创建swap（如果内存不足2GB）
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    SWAP_SIZE=$(free -m | awk '/^Swap:/{print $2}')
    echo "内存: ${TOTAL_MEM}MB, Swap: ${SWAP_SIZE}MB"

    if [ "$TOTAL_MEM" -lt 4096 ] && [ "$SWAP_SIZE" -lt 2048 ]; then
        echo "=== 内存不足，创建2GB swap文件 ==="
        if [ ! -f /swapfile ]; then
            fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
            chmod 600 /swapfile
            mkswap /swapfile
            swapon /swapfile
            echo "/swapfile none swap sw 0 0" >> /etc/fstab
            echo "✓ Swap创建成功"
        else
            swapon /swapfile 2>/dev/null || true
            echo "✓ Swap已启用"
        fi
    fi
else
    echo "=== 本地构建模式：保留构建产物 ==="
    # 只清理容器，不清理构建产物
fi

echo ""
echo "=== 拉取最新代码 ==="
git reset --hard origin/main 2>/dev/null || echo "注意: git reset 失败，使用现有代码"
git pull origin main 2>/dev/null || echo "注意: git pull 失败，使用现有代码"

echo ""
if [ "$HAS_LOCAL_BUILD" = true ]; then
    echo "=== 本地构建模式：直接启动（跳过服务器构建）==="
    echo "使用本地构建产物部署，预计30秒内启动..."
    docker compose up -d --no-build
else
    echo "=== 服务器构建模式：开始构建（可能需要10-30分钟）==="
    echo "警告: 2GB内存构建可能很慢或失败，建议本地构建后上传"
    docker compose up -d --build
fi

echo ""
echo "=== 等待服务启动 ==="
for i in {1..30}; do
    if curl -s http://127.0.0.1:80 >/dev/null 2>&1; then
        echo "✓ 服务已启动"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "=== 数据库迁移 ==="
docker compose exec -T app npx prisma migrate deploy 2>/dev/null || echo "迁移已是最新或跳过"

echo ""
echo "=== 启动 Nginx ==="
systemctl start nginx 2>/dev/null || true

echo ""
echo "=== 验证服务 ==="
curl -s http://127.0.0.1:80 | head -3 || echo "服务可能还在启动中..."

echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
docker compose ps

echo ""
if [ "$HAS_LOCAL_BUILD" = true ]; then
    echo "提示: 本次使用本地构建产物部署"
else
    echo "提示: 本次在服务器构建。建议下次在本地运行 'npm run build' 后上传"
fi
