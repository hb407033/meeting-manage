#!/bin/bash

# Chrome DevTools 诊断文件整理脚本
# 将根目录下的诊断文件整理到 docs/debug 目录

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEBUG_DIR="$PROJECT_ROOT/docs/debug"

echo "🔧 开始整理 Chrome DevTools 诊断文件..."
echo "项目根目录: $PROJECT_ROOT"
echo "目标目录: $DEBUG_DIR"

# 确保目录存在
mkdir -p "$DEBUG_DIR"/{screenshots,performance,network,console,general}

# 统计初始状态
TOTAL_FILES_MOVED=0

# 函数：移动文件并记录日志
move_file() {
    local src_file="$1"
    local dest_dir="$2"
    local filename=$(basename "$src_file")

    if [[ -f "$src_file" ]]; then
        # 生成带时间戳的新文件名
        local timestamp=$(date -r "$src_file" "+%Y-%m-%d_%H-%M-%S")
        local new_filename="${timestamp}_${filename}"
        local dest_path="$dest_dir/$new_filename"

        mv "$src_file" "$dest_path"
        echo "  ✅ 移动: $filename → $dest_dir/$new_filename"
        ((TOTAL_FILES_MOVED++))
    fi
}

# 函数：根据文件名分类
classify_and_move() {
    local file="$1"
    local filename=$(basename "$file")

    case "$filename" in
        *screenshot*|*snapshot*)
            move_file "$file" "$DEBUG_DIR/general"
            ;;
        *performance*|*lighthouse*)
            move_file "$file" "$DEBUG_DIR/performance"
            ;;
        *network*|*.har)
            move_file "$file" "$DEBUG_DIR/network"
            ;;
        *console*|*error*)
            move_file "$file" "$DEBUG_DIR/console"
            ;;
        *)
            # 默认移动到 general 目录
            move_file "$file" "$DEBUG_DIR/general"
            ;;
    esac
}

echo ""
echo "📁 查找根目录下的诊断文件..."

# 查找并移动所有诊断文件
find "$PROJECT_ROOT" -maxdepth 1 -type f \( \
    -name "*snapshot*" -o \
    -name "*debug*" -o \
    -name "*diagnostic*" -o \
    -name "*screenshot*" -o \
    -name "*performance*" -o \
    -name "*.har" -o \
    -name "*console*" -o \
    -name "*error*" \
\) ! -path "$DEBUG_DIR/*" | while read -r file; do
    classify_and_move "$file"
done

echo ""
echo "📊 整理完成！"
echo "总共移动文件数: $TOTAL_FILES_MOVED"

# 生成整理报告
REPORT_FILE="$DEBUG_DIR/organization-report.md"
cat > "$REPORT_FILE" << EOF
# 诊断文件整理报告

**整理时间**: $(date)
**移动文件数量**: $TOTAL_FILES_MOVED

## 目录结构

\`\`\`
docs/debug/
├── screenshots/     $(ls -1 "$DEBUG_DIR/screenshots" 2>/dev/null | wc -l) files
├── performance/     $(ls -1 "$DEBUG_DIR/performance" 2>/dev/null | wc -l) files
├── network/         $(ls -1 "$DEBUG_DIR/network" 2>/dev/null | wc -l) files
├── console/         $(ls -1 "$DEBUG_DIR/console" 2>/dev/null | wc -l) files
└── general/         $(ls -1 "$DEBUG_DIR/general" 2>/dev/null | wc -l) files
\`\`\`

## 文件列表

### General $(ls -1 "$DEBUG_DIR/general" 2>/dev/null | wc -l) files
$(ls -la "$DEBUG_DIR/general" 2>/dev/null || echo "无文件")

### Performance $(ls -1 "$DEBUG_DIR/performance" 2>/dev/null | wc -l) files
$(ls -la "$DEBUG_DIR/performance" 2>/dev/null || echo "无文件")

### Network $(ls -1 "$DEBUG_DIR/network" 2>/dev/null | wc -l) files
$(ls -la "$DEBUG_DIR/network" 2>/dev/null || echo "无文件")

### Console $(ls -1 "$DEBUG_DIR/console" 2>/dev/null | wc -l) files
$(ls -la "$DEBUG_DIR/console" 2>/dev/null || echo "无文件")

---

**下次整理建议**: 每周运行一次此脚本保持项目整洁
EOF

echo "📄 整理报告已生成: $REPORT_FILE"
echo ""
echo "💡 提示:"
echo "  - 查看整理报告: $REPORT_FILE"
echo "  - 定期运行清理脚本: scripts/cleanup-debug-files.sh"
echo "  - 遵循命名规范生成新的诊断文件"