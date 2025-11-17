#!/bin/bash

# 简化版 Chrome DevTools 诊断文件整理脚本

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEBUG_DIR="$PROJECT_ROOT/docs/debug"

echo "🔧 开始整理诊断文件..."

# 确保目录存在
mkdir -p "$DEBUG_DIR"/{screenshots,performance,network,console,general}

# 移动所有 snapshot 文件
for file in "$PROJECT_ROOT"/*snapshot*.md; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        timestamp=$(date -r "$file" "+%Y-%m-%d_%H-%M-%S")
        new_filename="${timestamp}_${filename}"
        mv "$file" "$DEBUG_DIR/general/$new_filename"
        echo "✅ 移动: $filename → general/$new_filename"
    fi
done

echo "🎉 整理完成！"