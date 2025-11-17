#!/bin/bash

echo "🔍 Nuxt项目诊断脚本"
echo "================================="

# 检查项目结构
echo "📁 检查项目结构..."
echo "✅ 项目根目录: $(pwd)"
echo "✅ nuxt.config.ts 存在: $([ -f nuxt.config.ts ] && echo "是" || echo "否")"
echo "✅ app目录存在: $([ -d app ] && echo "是" || echo "否")"
echo "✅ app/pages目录存在: $([ -d app/pages ] && echo "是" || echo "否")"
echo "✅ app/layouts目录存在: $([ -d app/layouts ] && echo "是" || echo "否")"

# 检查页面文件
echo ""
echo "📄 检查页面文件..."
if [ -d app/pages ]; then
    find app/pages -name "*.vue" | head -10 | while read file; do
        echo "✅ $file"
    done

    page_count=$(find app/pages -name "*.vue" | wc -l)
    echo "📊 总页面文件数: $page_count"
else
    echo "❌ app/pages目录不存在"
fi

# 检查layouts文件
echo ""
echo "🎨 检查布局文件..."
if [ -d app/layouts ]; then
    find app/layouts -name "*.vue" | while read file; do
        echo "✅ $file"
    done
else
    echo "❌ app/layouts目录不存在"
fi

# 检查package.json
echo ""
echo "📦 检查package.json..."
if [ -f package.json ]; then
    nuxt_version=$(grep -o '"nuxt": "[^"]*"' package.json | cut -d'"' -f4)
    echo "✅ Nuxt版本: $nuxt_version"

    vue_version=$(grep -o '"vue": "[^"]*"' package.json | cut -d'"' -f4)
    echo "✅ Vue版本: $vue_version"
else
    echo "❌ package.json不存在"
fi

# 检查node_modules
echo ""
echo "📦 检查node_modules..."
if [ -d node_modules ]; then
    echo "✅ node_modules目录存在"
    if [ -d node_modules/nuxt ]; then
        echo "✅ Nuxt模块已安装"
    else
        echo "❌ Nuxt模块未安装"
    fi
else
    echo "❌ node_modules目录不存在"
fi

# 检查环境变量
echo ""
echo "🌍 检查环境变量..."
if [ -f .env ]; then
    echo "✅ .env文件存在"
else
    echo "⚠️ .env文件不存在"
fi

if [ -f .env.local ]; then
    echo "✅ .env.local文件存在"
else
    echo "⚠️ .env.local文件不存在"
fi

# 检查Git状态
echo ""
echo "📋 检查Git状态..."
if [ -d .git ]; then
    git_status=$(git status --porcelain 2>/dev/null | wc -l)
    echo "✅ Git仓库存在"
    echo "📊 未提交的文件数: $git_status"
else
    echo "⚠️ 不是Git仓库"
fi

# 检查端口占用
echo ""
echo "🔌 检查端口占用..."
if command -v lsof >/dev/null 2>&1; then
    port_3000=$(lsof -ti:3000 2>/dev/null)
    port_3001=$(lsof -ti:3001 2>/dev/null)

    if [ -n "$port_3000" ]; then
        echo "⚠️ 端口3000被占用: $port_3000"
    else
        echo "✅ 端口3000可用"
    fi

    if [ -n "$port_3001" ]; then
        echo "⚠️ 端口3001被占用: $port_3001"
    else
        echo "✅ 端口3001可用"
    fi
else
    echo "⚠️ lsof命令不可用，无法检查端口"
fi

echo ""
echo "🔍 诊断完成！"
echo ""
echo "💡 如果发现问题，请参考以下解决方案："
echo "   1. 运行 ./clear-cache.sh 清理缓存"
echo "   2. 检查文件权限: chmod -R 644 app/pages/"
echo "   3. 重新安装依赖: rm -rf node_modules && npm install"
echo "   4. 检查语法错误: npm run lint"