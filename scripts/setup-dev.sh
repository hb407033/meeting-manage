#!/bin/bash

# 开发环境快速设置脚本
# 用于初始化MySQL和Redis服务

set -e

echo "🚀 智能会议室管理系统 - 开发环境设置"
echo "=================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

echo "✅ Docker已运行"

# 启动MySQL和Redis服务
echo "🔧 启动数据库和缓存服务..."
docker-compose up -d mysql redis

echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 等待MySQL启动完成
echo "⏳ 等待MySQL启动完成..."
until docker-compose exec mysql mysqladmin ping -h"localhost" --silent; do
    echo "   MySQL正在启动..."
    sleep 2
done

echo "✅ MySQL已启动"

# 等待Redis启动完成
until docker-compose exec redis redis-cli ping > /dev/null 2>&1; do
    echo "   Redis正在启动..."
    sleep 1
done

echo "✅ Redis已启动"

# 生成Prisma客户端
echo "🔧 生成Prisma客户端..."
DATABASE_URL="mysql://meeting_user:meeting_pass@localhost:3307/meeting_manage" npm run db:generate

# 创建数据库（如果不存在）
echo "🔧 创建数据库..."
docker-compose exec mysql mysql -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS meeting_manage;"

# 生成数据库迁移
echo "🔧 生成数据库迁移..."
DATABASE_URL="mysql://meeting_user:meeting_pass@localhost:3307/meeting_manage" npm run db:migrate || echo "⚠️ 迁移可能已存在或需要手动创建"

# 运行种子数据
echo "🔧 运行种子数据..."
DATABASE_URL="mysql://meeting_user:meeting_pass@localhost:3307/meeting_manage" npm run db:seed

echo ""
echo "🎉 开发环境设置完成！"
echo ""
echo "📋 服务信息:"
echo "   MySQL:     localhost:3307"
echo "   Redis:     localhost:6379"
echo "   PHPMyAdmin: http://localhost:8080"
echo ""
echo "📋 默认登录信息:"
echo "   系统管理员: admin@meeting.local / admin123456"
echo "   部门经理:   manager@meeting.local / manager123456"
echo "   普通用户:   user@meeting.local / user123456"
echo ""
echo "🚀 现在可以启动开发服务器:"
echo "   npm run dev"
echo ""
echo "🔧 停止服务:"
echo "   docker-compose down"