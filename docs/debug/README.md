# Chrome DevTools 诊断文件管理规范

## 概述

本文档定义了项目中 Chrome DevTools 生成的诊断文件的管理规范，确保诊断文件有序存储，便于后续分析和问题排查。

## 目录结构

```
docs/debug/
├── README.md                    # 本说明文档
├── screenshots/                 # 页面截图和快照
├── performance/                 # 性能分析文件
├── network/                     # 网络请求分析
├── console/                     # 控制台日志和错误
└── general/                     # 一般诊断文件
```

## 文件分类规则

### 1. Screenshots (`screenshots/`)
- **适用文件**: 页面截图、视觉快照
- **命名规则**: `YYYY-MM-DD_HH-mm-ss_[page-name]_screenshot.ext`
- **示例**: `2025-11-17_14-30-25_dashboard_screenshot.png`

### 2. Performance (`performance/`)
- **适用文件**: 性能分析报告、Lighthouse 结果
- **命名规则**: `YYYY-MM-DD_HH-mm-ss_[page-name]_performance.json`
- **示例**: `2025-11-17_14-30-25_rooms_list_performance.json`

### 3. Network (`network/`)
- **适用文件**: 网络请求日志、HAR 文件
- **命名规则**: `YYYY-MM-DD_HH-mm-ss_[page-name]_network.har`
- **示例**: `2025-11-17_14-30-25_login_network.har`

### 4. Console (`console/`)
- **适用文件**: 控制台日志、错误信息
- **命名规则**: `YYYY-MM-DD_HH-mm-ss_[page-name]_console.log`
- **示例**: `2025-11-17_14-30-25_dashboard_console.log`

### 5. General (`general/`)
- **适用文件**: 页面快照、诊断摘要等综合文件
- **命名规则**: `YYYY-MM-DD_HH-mm-ss_[page-name]_snapshot.md`
- **示例**: `2025-11-17_14-30-25_dashboard_snapshot.md`

## 自动化规则

### MCP Chrome DevTools 配置

确保所有 Chrome DevTools MCP 服务生成的文件都保存到对应分类目录：

```typescript
// 在相关配置中设置默认路径
const debugPaths = {
  screenshots: 'docs/debug/screenshots/',
  performance: 'docs/debug/performance/',
  network: 'docs/debug/network/',
  console: 'docs/debug/console/',
  general: 'docs/debug/general/'
}
```

### 文件清理规则

1. **保留策略**: 保留最近 30 天的诊断文件
2. **文件大小限制**: 单个文件不超过 10MB
3. **总容量限制**: debug 目录总容量不超过 100MB
4. **自动清理**: 每周自动清理过期文件

## 使用指南

### 生成诊断文件时

1. 使用标准化的命名规则
2. 将文件保存到对应的分类目录
3. 在文件名中包含页面名称和日期时间

### 分析诊断文件时

1. 按日期查找最新问题
2. 按页面分类分析问题
3. 定期清理过期文件

### 团队协作

1. 不要将 debug 目录的大型二进制文件提交到版本控制
2. 将 `.gitignore` 配置为忽略 debug 目录下的二进制文件
3. 保留重要的分析结果作为文档

## 维护脚本

### 1. 文件整理脚本
```bash
# scripts/organize-debug-files.sh
# 自动将根目录下的诊断文件整理到 debug 目录
```

### 2. 清理脚本
```bash
# scripts/cleanup-debug-files.sh
# 清理过期的诊断文件
```

## 更新记录

- **2025-11-17**: 创建初始规范
- **版本**: 1.0.0

## 相关文档

- [Nuxt缓存清理指南](../operations/CACHE_CLEANUP_GUIDE.md) - 系统缓存问题解决方案
- [权限中间件修复报告](../troubleshooting/PERMISSION_MIDDLEWARE_FIX.md) - Nuxt 4中间件问题排查
- [项目调试指南](../debugging.md)
- [性能优化指南](../performance.md)