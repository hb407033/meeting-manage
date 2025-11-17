#!/bin/bash

# Chrome DevTools 诊断文件清理脚本
# 清理过期的诊断文件，保持 debug 目录整洁

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEBUG_DIR="$PROJECT_ROOT/docs/debug"

# 配置参数
DAYS_TO_KEEP=30                    # 保留天数
MAX_DIR_SIZE_MB=100               # 最大目录大小 (MB)
MAX_FILE_SIZE_MB=10               # 单个文件最大大小 (MB)

echo "🧹 开始清理 Chrome DevTools 诊断文件..."
echo "项目根目录: $PROJECT_ROOT"
echo "Debug 目录: $DEBUG_DIR"
echo "保留天数: $DAYS_TO_KEEP 天"
echo "最大目录大小: $MAX_DIR_SIZE_MB MB"
echo "最大文件大小: $MAX_FILE_SIZE_MB MB"

# 确保目录存在
if [[ ! -d "$DEBUG_DIR" ]]; then
    echo "❌ Debug 目录不存在: $DEBUG_DIR"
    exit 1
fi

# 统计变量
TOTAL_FILES_DELETED=0
TOTAL_SIZE_FREED_MB=0

# 函数：格式化文件大小
format_size() {
    local bytes=$1
    local mb=$(echo "scale=2; $bytes / 1024 / 1024" | bc -l 2>/dev/null || echo "0")
    echo "${mb}MB"
}

# 函数：删除过期文件
delete_old_files() {
    local dir="$1"
    local dir_name=$(basename "$dir")

    echo ""
    echo "📁 检查目录: $dir_name"

    if [[ ! -d "$dir" ]]; then
        echo "  ⚠️ 目录不存在"
        return
    fi

    local files_in_dir=0
    local size_freed=0

    # 查找并删除超过保留期的文件
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)

            rm "$file"
            echo "  🗑️ 删除过期文件: $(basename "$file") ($(format_size $file_size))"

            ((TOTAL_FILES_DELETED++))
            ((size_freed += file_size))
            ((files_in_dir++))
        fi
    done < <(find "$dir" -type f -mtime +$DAYS_TO_KEEP -print0 2>/dev/null)

    if [[ $files_in_dir -gt 0 ]]; then
        ((TOTAL_SIZE_FREED_MB += size_freed / 1024 / 1024))
        echo "  📊 删除了 $files_in_dir 个文件，释放 $(format_size $size_freed)"
    else
        echo "  ✅ 没有过期文件需要删除"
    fi
}

# 函数：删除超大文件
delete_large_files() {
    local dir="$1"
    local dir_name=$(basename "$dir")

    echo ""
    echo "📏 检查超大文件: $dir_name"

    local large_files=0
    local size_freed=0

    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
            local file_size_mb=$((file_size / 1024 / 1024))

            if [[ $file_size_mb -gt $MAX_FILE_SIZE_MB ]]; then
                rm "$file"
                echo "  🗑️ 删除超大文件: $(basename "$file") ($(format_size $file_size))"

                ((TOTAL_FILES_DELETED++))
                ((size_freed += file_size))
                ((large_files++))
            fi
        fi
    done < <(find "$dir" -type f -size +${MAX_FILE_SIZE_MB}M -print0 2>/dev/null)

    if [[ $large_files -gt 0 ]]; then
        ((TOTAL_SIZE_FREED_MB += size_freed / 1024 / 1024))
        echo "  📊 删除了 $large_files 个超大文件，释放 $(format_size $size_freed)"
    else
        echo "  ✅ 没有超大文件需要删除"
    fi
}

# 函数：检查目录总大小并清理
check_dir_size() {
    local dir_size_bytes=$(du -sb "$DEBUG_DIR" 2>/dev/null | cut -f1 || echo 0)
    local dir_size_mb=$((dir_size_bytes / 1024 / 1024))

    echo ""
    echo "📦 Debug 目录当前大小: ${dir_size_mb}MB"

    if [[ $dir_size_mb -gt $MAX_DIR_SIZE_MB ]]; then
        echo "⚠️ 目录大小超过限制 ($MAX_DIR_SIZE_MB MB)"

        # 删除最旧的文件直到大小符合要求
        local excess_mb=$((dir_size_mb - MAX_DIR_SIZE_MB + 5)) # 多清理5MB作为缓冲

        echo "🔄 需要额外清理约 ${excess_mb}MB 的空间..."

        # 按修改时间排序，删除最旧的文件
        find "$DEBUG_DIR" -type f -printf "%T@ %p\n" 2>/dev/null | \
        sort -n | \
        while read -r timestamp file; do
            if [[ -f "$file" && $excess_mb -gt 0 ]]; then
                local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
                local file_size_mb=$((file_size / 1024 / 1024))

                rm "$file"
                echo "  🗑️ 删除旧文件: $(basename "$file") ($(format_size $file_size))"

                ((TOTAL_FILES_DELETED++))
                ((TOTAL_SIZE_FREED_MB += file_size_mb))
                ((excess_mb -= file_size_mb))

                if [[ $excess_mb -le 0 ]]; then
                    break
                fi
            fi
        done
    else
        echo "✅ 目录大小在限制范围内"
    fi
}

# 执行清理
echo ""
echo "🔍 第一阶段：删除过期文件 ($DAYS_TO_KEEP 天前)"
delete_old_files "$DEBUG_DIR/screenshots"
delete_old_files "$DEBUG_DIR/performance"
delete_old_files "$DEBUG_DIR/network"
delete_old_files "$DEBUG_DIR/console"
delete_old_files "$DEBUG_DIR/general"

echo ""
echo "🔍 第二阶段：删除超大文件 (> $MAX_FILE_SIZE_MB MB)"
delete_large_files "$DEBUG_DIR/screenshots"
delete_large_files "$DEBUG_DIR/performance"
delete_large_files "$DEBUG_DIR/network"
delete_large_files "$DEBUG_DIR/console"
delete_large_files "$DEBUG_DIR/general"

echo ""
echo "🔍 第三阶段：检查目录总大小"
check_dir_size

# 生成清理报告
REPORT_FILE="$DEBUG_DIR/cleanup-report.md"
NEW_DIR_SIZE_BYTES=$(du -sb "$DEBUG_DIR" 2>/dev/null | cut -f1 || echo 0)
NEW_DIR_SIZE_MB=$((NEW_DIR_SIZE_BYTES / 1024 / 1024))

cat > "$REPORT_FILE" << EOF
# 诊断文件清理报告

**清理时间**: $(date)
**删除文件数量**: $TOTAL_FILES_DELETED
**释放空间**: ${TOTAL_SIZE_FREED_MB}MB

## 清理配置

- 保留天数: $DAYS_TO_KEEP 天
- 最大文件大小: $MAX_FILE_SIZE_MB MB
- 最大目录大小: $MAX_DIR_SIZE_MB MB

## 清理结果

- 清理前大小: \`${dir_size_mb}MB\` (如果可用)
- 清理后大小: \`${NEW_DIR_SIZE_MB}MB\`
- 节省空间: \`${TOTAL_SIZE_FREED_MB}MB\`

## 当前目录状态

\`\`\`
docs/debug/
├── screenshots/     $(ls -1 "$DEBUG_DIR/screenshots" 2>/dev/null | wc -l) files
├── performance/     $(ls -1 "$DEBUG_DIR/performance" 2>/dev/null | wc -l) files
├── network/         $(ls -1 "$DEBUG_DIR/network" 2>/dev/null | wc -l) files
├── console/         $(ls -1 "$DEBUG_DIR/console" 2>/dev/null | wc -l) files
└── general/         $(ls -1 "$DEBUG_DIR/general" 2>/dev/null | wc -l) files
总大小: ${NEW_DIR_SIZE_MB}MB
\`\`\`

## 下次清理建议

建议每周运行一次清理脚本以保持项目整洁。

---

**自动化建议**: 可以设置 cron 任务定期运行此脚本
\`\`\`bash
# 每周日凌晨 2 点自动清理
0 2 * * 0 /path/to/scripts/cleanup-debug-files.sh
\`\`\`
EOF

echo ""
echo "✅ 清理完成！"
echo "📊 清理统计:"
echo "  - 删除文件数: $TOTAL_FILES_DELETED"
echo "  - 释放空间: ${TOTAL_SIZE_FREED_MB}MB"
echo "  - 当前目录大小: ${NEW_DIR_SIZE_MB}MB"
echo ""
echo "📄 清理报告已生成: $REPORT_FILE"
echo ""
echo "💡 提示:"
echo "  - 查看清理报告: $REPORT_FILE"
echo "  - 定期运行整理脚本: scripts/organize-debug-files.sh"
echo "  - 考虑设置自动化任务定期清理"