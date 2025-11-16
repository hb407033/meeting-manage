#!/bin/bash

# 数据库备份脚本
set -e

# 配置
BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/meeting_manage_backup_$DATE.sql"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 读取密码
MYSQL_ROOT_PASSWORD=$(cat /run/secrets/mysql_root_password)

# 备份数据库
echo "开始备份数据库..."
mysqldump -h mysql -u root -p"$MYSQL_ROOT_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --all-databases \
    > "$BACKUP_FILE"

# 压缩备份文件
echo "压缩备份文件..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# 清理旧备份
echo "清理超过 $RETENTION_DAYS 天的旧备份..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

# 记录备份日志
echo "备份完成: $BACKUP_FILE" >> "$BACKUP_DIR/backup.log"

echo "备份成功: $BACKUP_FILE"