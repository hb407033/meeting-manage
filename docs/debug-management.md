# Chrome DevTools 诊断文件管理

## 概述

为了解决项目中 Chrome DevTools 生成的诊断文件散落在项目根目录的问题，我们建立了一套完整的诊断文件管理体系。

## 问题背景

之前项目中存在大量诊断文件散落在根目录：
- 38个 `*snapshot*.md` 文件
- 文件命名不统一
- 影响项目结构整洁
- 缺乏管理规范

## 解决方案

### 1. 目录结构

建立了统一的诊断文件存储结构：

```
docs/debug/
├── README.md           # 管理规范
├── screenshots/        # 页面截图
├── performance/        # 性能分析
├── network/           # 网络请求
├── console/           # 控制台日志
└── general/           # 一般诊断文件（包含所有整理的snapshot文件）
```

### 2. 管理规范

制定了完整的 [诊断文件管理规范](./debug/README.md)，包括：
- 文件分类规则
- 命名规范
- 保留策略
- 自动化脚本

### 3. 自动化脚本

创建了两个关键脚本：

#### 整理脚本 (`scripts/organize-debug-files-simple.sh`)
- 自动将根目录的诊断文件整理到对应分类目录
- 按文件修改时间添加时间戳前缀
- 生成整理报告

#### 清理脚本 (`scripts/cleanup-debug-files.sh`)
- 清理超过30天的诊断文件
- 删除超大文件（>10MB）
- 控制目录总大小（<100MB）
- 生成清理报告

### 4. Git 配置

更新了 `.gitignore` 配置：
- 忽略 `docs/debug/*/` 下的所有文件
- 保留目录结构和文档文件
- 避免大文件污染版本控制

## 实施结果

### 文件整理
- ✅ 成功整理了38个诊断文件
- ✅ 所有文件按时间戳重命名
- ✅ 分类存储到对应目录
- ✅ 项目根目录变得整洁

### 目录统计
```
docs/debug/
├── screenshots/     0 files
├── performance/     0 files
├── network/         0 files
├── console/         0 files
└── general/         38 files (所有整理的snapshot文件)
```

## 使用指南

### 日常使用
1. **生成诊断文件时**：直接保存到 `docs/debug/` 对应分类目录
2. **整理根目录文件**：运行 `./scripts/organize-debug-files-simple.sh`
3. **定期清理**：运行 `./scripts/cleanup-debug-files.sh`

### 命名规范
```bash
# 格式：YYYY-MM-DD_HH-mm-ss_[页面名称]_[类型].扩展名
2025-11-17_14-30-25_dashboard_snapshot.md
2025-11-17_14-30-25_rooms_list_performance.json
```

### 自动化建议
可以设置 cron 任务定期执行：
```bash
# 每周日凌晨 2 点自动清理
0 2 * * 0 /path/to/scripts/cleanup-debug-files.sh
```

## 后续优化

1. **Chrome DevTools MCP 配置**：配置默认输出路径
2. **IDE 集成**：添加快捷键运行整理脚本
3. **CI/CD 集成**：在构建流程中检查诊断文件管理
4. **监控告警**：当诊断文件数量异常时发送通知

## 相关文档

- [诊断文件管理规范](./debug/README.md)
- [整理脚本](../scripts/organize-debug-files-simple.sh)
- [清理脚本](../scripts/cleanup-debug-files.sh)

## 更新记录

- **2025-11-17**: 初始实施，整理38个诊断文件
- **版本**: 1.0.0