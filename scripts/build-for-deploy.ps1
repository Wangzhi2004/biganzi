# 笔杆子 - Windows本地构建脚本
# 用法: 在项目根目录运行: .\scripts\build-for-deploy.ps1
#
# 这个脚本会在本地构建项目，生成 .next/standalone 产物
# 然后你可以把整个项目目录上传到服务器，运行 deploy.sh 即可

$ErrorActionPreference = "Stop"

# 获取项目根目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $projectRoot

Write-Host "========================================"
Write-Host "  笔杆子 - 本地构建脚本"
Write-Host "========================================"
Write-Host ""

# 检查 Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "错误: 未找到 Node.js，请先安装 Node.js 20+"
    exit 1
}
Write-Host "Node.js版本: $nodeVersion"

# 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "安装依赖..."
    npm ci
}

# 生成 Prisma 客户端
Write-Host ""
Write-Host "=== 生成 Prisma 客户端 ==="
npx prisma generate

# 清理旧构建
Write-Host ""
Write-Host "=== 清理旧构建 ==="
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}

# 本地构建
Write-Host ""
Write-Host "=== 开始构建 ==="
Write-Host "这可能需要几分钟，请耐心等待..."

$env:NEXT_TELEMETRY_DISABLED = "1"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "构建失败! 请检查错误信息。"
    exit 1
}

# 验证构建产物
Write-Host ""
Write-Host "=== 验证构建产物 ==="
if (Test-Path ".next/standalone/server.js") {
    Write-Host "构建产物验证成功"
} else {
    Write-Host "构建产物不完整，缺少 server.js"
    exit 1
}

# 复制静态资源到 standalone
Write-Host ""
Write-Host "=== 准备部署文件 ==="
$staticDir = ".next/standalone/.next/static"
if (-not (Test-Path $staticDir)) {
    New-Item -ItemType Directory -Path $staticDir -Force | Out-Null
}
if (Test-Path ".next/static") {
    Copy-Item -Recurse -Force ".next/static/*" "$staticDir/" -ErrorAction SilentlyContinue
}

# 显示构建信息
$buildSize = (Get-ChildItem -Recurse ".next/standalone" -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ""
Write-Host "构建完成!"
Write-Host "产物大小: $([math]::Round($buildSize, 2)) MB"
Write-Host ""
Write-Host "========================================"
Write-Host "  部署步骤"
Write-Host "========================================"
Write-Host "1. 确保 .next/standalone 目录已上传到服务器"
Write-Host "2. 在服务器运行: cd /opt/biganzi && bash scripts/deploy.sh"
Write-Host ""
Write-Host "提示: 使用 rsync 或 scp 上传时，保留 .next/standalone 目录"
Write-Host ""
