#!/bin/bash

echo "🧹 Nuxt项目缓存清理脚本"
echo "================================="

# 停止所有开发服务器
echo "🛑 停止开发服务器..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "nuxt dev" 2>/dev/null || true

# 等待进程完全停止
sleep 2

# 清理Nuxt缓存目录
echo "🗂️ 清理Nuxt缓存..."
rm -rf .nuxt
rm -rf .output
rm -rf .temp
rm -rf dist

# 清理Vite缓存
echo "⚡ 清理Vite缓存..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache

# 清理其他临时文件
echo "🧹 清理临时文件..."
find . -name "*.log" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

# 重新生成Prisma客户端
echo "🗄️ 重新生成Prisma客户端..."
DATABASE_URL="mysql://root:407033@localhost:3307/meeting_manage" npx prisma generate

# 清理npm缓存（可选）
echo "📦 清理npm缓存..."
npm cache clean --force 2>/dev/null || true

# 重新安装依赖（可选，如果需要深度清理）
read -p "是否重新安装依赖？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 重新安装依赖..."
    rm -rf node_modules
    npm install
fi

echo "✅ 缓存清理完成！"
echo ""
echo "🚀 启动开发服务器："
echo "   npm run dev"
echo ""
echo "💡 提示：如果问题仍然存在，请检查："
echo "   1. pages目录中的文件是否正确"
echo "   2. nuxt.config.ts配置是否正确"
echo "   3. 确保没有语法错误"