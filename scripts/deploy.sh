#!/bin/bash
# 笔杆子一键部署脚本
# 在阿里云 ECS (Ubuntu 22.04) 上执行
# 用法: bash deploy.sh

set -e

echo "=== 笔杆子部署脚本 ==="

# 1. 安装 Docker
echo "[1/6] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker 安装完成"
else
    echo "Docker 已安装，跳过"
fi

# 2. 安装 Docker Compose
echo "[2/6] 安装 Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
    echo "Docker Compose 安装完成"
else
    echo "Docker Compose 已安装，跳过"
fi

# 3. 安装 Git
echo "[3/6] 安装 Git..."
if ! command -v git &> /dev/null; then
    apt update && apt install -y git
fi

# 4. 克隆代码
echo "[4/6] 克隆代码..."
if [ -d "/opt/biganzi/.git" ]; then
    cd /opt/biganzi
    git pull origin main
    echo "代码已更新"
else
    git clone https://github.com/Wangzhi2004/biganzi.git /opt/biganzi
    cd /opt/biganzi
    echo "代码已克隆"
fi

# 5. 配置环境变量
echo "[5/6] 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "请编辑 .env 文件，填入你的配置："
    echo "  nano /opt/biganzi/.env"
    echo ""
    echo "必须配置的项："
    echo "  AI_API_KEY=你的API密钥"
    echo "  AI_BASE_URL=你的API地址"
    echo "  JWT_SECRET=随机字符串"
    echo "  MOBILE_PASSWORD=移动端密码（可选）"
    echo ""
    read -p "按回车继续（已编辑 .env）..."
fi

# 6. 启动服务
echo "[6/6] 启动服务..."
docker compose up -d --build

echo ""
echo "=== 等待服务启动 ==="
sleep 10

# 检查状态
echo ""
echo "=== 容器状态 ==="
docker compose ps

echo ""
echo "=== 初始化数据库 ==="
docker compose exec -T app npx prisma migrate deploy 2>&1 || echo "Migration 可能已执行"

echo ""
echo "=== 部署完成！==="
echo ""
echo "访问地址: http://47.238.102.92:3000"
echo "移动端:   http://47.238.102.92:3000/mobile"
echo ""
echo "常用命令："
echo "  查看日志:   docker compose logs app --tail 50"
echo "  重启服务:   docker compose restart"
echo "  更新代码:   cd /opt/biganzi && git pull && docker compose up -d --build"
echo "  停止服务:   docker compose down"
