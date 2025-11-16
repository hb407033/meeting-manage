# 会议管理系统部署指南

本文档详细说明如何在不同环境中部署会议管理系统。

## 目录

- [环境要求](#环境要求)
- [配置文件](#配置文件)
- [开发环境](#开发环境)
- [生产环境](#生产环境)
- [监控与维护](#监控与维护)
- [故障排查](#故障排查)

## 环境要求

### 系统要求
- Linux (推荐 Ubuntu 20.04+)
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.25+
- 至少 4GB RAM
- 至少 20GB 可用存储空间

### 网络要求
- 开放端口：80, 443, 3307 (开发), 3000
- SSL 证书（生产环境）
- 域名解析（生产环境）

## 配置文件

### 环境变量
1. 复制环境模板：
```bash
cp .env.production.example .env.production
```

2. 编辑 `.env.production` 文件，设置正确的配置值

### 密钥管理
创建必要的密钥文件：

```bash
# 创建secrets目录
mkdir -p secrets

# 生成密钥
openssl rand -base64 32 > secrets/jwt_secret.txt
openssl rand -base64 32 > secrets/mysql_root_password.txt
openssl rand -base64 32 > secrets/mysql_password.txt
openssl rand -base64 32 > secrets/redis_password.txt
openssl rand -base64 16 > secrets/grafana_password.txt

# 设置权限
chmod 600 secrets/*
```

### 数据库配置
创建生产环境MySQL配置文件 `docker/mysql/prod.cnf`：

```ini
[mysqld]
# 基础配置
datadir = /var/lib/mysql
socket = /var/lib/mysql/mysql.sock
pid-file = /var/run/mysqld/mysqld.pid
user = mysql
bind-address = 0.0.0.0
port = 3306

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 性能优化
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# 连接配置
max_connections = 200
max_connect_errors = 1000
wait_timeout = 300

# 日志配置
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# 二进制日志
log_bin = /var/log/mysql/mysql-bin.log
expire_logs_days = 7
max_binlog_size = 100M
```

## 开发环境

### 快速启动
```bash
# 启动开发环境
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

### 数据库初始化
```bash
# 生成Prisma客户端
npm run db:generate

# 运行迁移
npm run db:migrate

# 填充测试数据
npm run db:seed
```

## 生产环境

### 部署步骤

1. **准备服务器**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **克隆代码**
```bash
git clone https://github.com/your-org/meeting-manage.git
cd meeting-manage
```

3. **配置环境**
```bash
# 配置环境变量
cp .env.production.example .env.production
vim .env.production

# 配置密钥
./scripts/setup-secrets.sh
```

4. **配置SSL证书**
```bash
# 创建SSL目录
mkdir -p docker/nginx/ssl

# 使用Let's Encrypt（推荐）
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# 复制证书
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/key.pem
sudo chmod 600 docker/nginx/ssl/*
```

5. **部署应用**
```bash
# 自动部署
./scripts/deploy.sh production v1.0.0

# 或手动部署
docker-compose -f docker-compose.prod.yml up -d --build
```

### 部署脚本使用

```bash
# 部署到生产环境
./scripts/deploy.sh production

# 部署指定版本
./scripts/deploy.sh production v1.2.0

# 部署到测试环境
./scripts/deploy.sh staging

# 回滚到上一个版本
./scripts/deploy.sh rollback
```

## 监控与维护

### 健康检查
```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看应用健康状态
curl https://your-domain.com/api/health

# 查看Nginx状态
curl https://your-domain.com/nginx-health
```

### 日志管理
```bash
# 查看应用日志
docker-compose -f docker-compose.prod.yml logs -f app

# 查看Nginx日志
docker-compose -f docker-compose.prod.yml logs -f nginx

# 查看数据库日志
docker-compose -f docker-compose.prod.yml logs -f mysql

# 日志轮转配置在docker/nginx/nginx.conf中
```

### 备份与恢复
```bash
# 手动备份
./scripts/backup.sh

# 恢复数据库（如果有备份文件）
docker-compose -f docker-compose.prod.yml exec mysql \
    mysql -uroot -p < backup.sql

# 备份文件位置
ls -la backups/production/
```

### 性能监控
- **Prometheus**: http://your-domain.com:9090
- **Grafana**: http://your-domain.com:3001
- **默认用户名**: admin
- **密码**: 在 secrets/grafana_password.txt 中

### 数据库管理
```bash
# 连接数据库
docker-compose -f docker-compose.prod.yml exec mysql \
    mysql -uroot -p meeting_manage

# 运行迁移
docker-compose -f docker-compose.prod.yml exec app \
    npm run db:migrate:prod

# 查看数据库状态
docker-compose -f docker-compose.prod.yml exec mysql \
    mysqladmin -uroot -p status
```

## 故障排查

### 常见问题

1. **应用无法启动**
```bash
# 检查日志
docker-compose -f docker-compose.prod.yml logs app

# 检查环境变量
docker-compose -f docker-compose.prod.yml exec app env | grep -E "(DATABASE|REDIS|JWT)"

# 检查数据库连接
docker-compose -f docker-compose.prod.yml exec app \
    curl -f http://localhost:3000/api/health
```

2. **数据库连接失败**
```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml ps mysql

# 检查数据库日志
docker-compose -f docker-compose.prod.yml logs mysql

# 测试连接
docker-compose -f docker-compose.prod.yml exec mysql \
    mysqladmin -uroot -p ping
```

3. **Redis连接失败**
```bash
# 检查Redis状态
docker-compose -f docker-compose.prod.yml ps redis

# 测试Redis连接
docker-compose -f docker-compose.prod.yml exec redis \
    redis-cli ping
```

4. **Nginx配置错误**
```bash
# 测试Nginx配置
docker-compose -f docker-compose.prod.yml exec nginx \
    nginx -t

# 重载Nginx配置
docker-compose -f docker-compose.prod.yml exec nginx \
    nginx -s reload
```

5. **SSL证书问题**
```bash
# 检查证书有效期
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout | grep "Not After"

# 测试SSL配置
docker-compose -f docker-compose.prod.yml exec nginx \
    openssl s_client -connect localhost:443
```

### 性能优化

1. **数据库优化**
   - 调整 `innodb_buffer_pool_size` 为可用内存的 70-80%
   - 监控慢查询日志
   - 定期执行 `OPTIMIZE TABLE`

2. **应用优化**
   - 启用Redis缓存
   - 配置适当的连接池
   - 监控内存使用情况

3. **Nginx优化**
   - 启用Gzip压缩
   - 配置适当的缓存策略
   - 使用CDN加速静态资源

### 安全加固

1. **定期更新**
```bash
# 更新Docker镜像
docker-compose -f docker-compose.prod.yml pull

# 更新系统包
sudo apt update && sudo apt upgrade -y
```

2. **安全检查**
```bash
# 扫描漏洞
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image meeting-manage:latest

# 检查开放端口
sudo netstat -tlnp
```

3. **访问控制**
   - 配置防火墙规则
   - 使用fail2ban防止暴力破解
   - 定期轮换密钥和密码

## 联系支持

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排查部分
2. 检查项目GitHub Issues
3. 联系技术支持团队

---

**注意**: 在生产环境中，请确保：
- 使用强密码和安全的密钥
- 定期备份重要数据
- 监控系统性能和安全状态
- 保持系统和依赖项的最新版本