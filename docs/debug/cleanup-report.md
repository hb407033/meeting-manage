# 诊断文件清理报告

**清理时间**: 2025年11月17日 星期一 22时44分04秒 CST
**删除文件数量**: 0
**释放空间**: 0MB

## 清理配置

- 保留天数: 30 天
- 最大文件大小: 10 MB
- 最大目录大小: 100 MB

## 清理结果

- 清理前大小: `MB` (如果可用)
- 清理后大小: `0MB`
- 节省空间: `0MB`

## 当前目录状态

```
docs/debug/
├── screenshots/            0 files
├── performance/            0 files
├── network/                0 files
├── console/                0 files
└── general/               39 files
总大小: 0MB
```

## 下次清理建议

建议每周运行一次清理脚本以保持项目整洁。

---

**自动化建议**: 可以设置 cron 任务定期运行此脚本
```bash
# 每周日凌晨 2 点自动清理
0 2 * * 0 /path/to/scripts/cleanup-debug-files.sh
```
