# Docker 配置目录

本目录包含会议室管理系统的所有Docker相关配置文件。

## 目录结构

```
docker/
├── README.md                   # 本文件
├── docker-compose.yml          # 开发环境Docker Compose配置
├── docker-compose.prod.yml     # 生产环境Docker Compose配置
├── Dockerfile.dev              # 开发环境Docker镜像
├── Dockerfile.prod             # 生产环境Docker镜像
├── mysql/                      # MySQL配置
│   ├── my.cnf                  # 开发环境MySQL配置
│   ├── prod.cnf                # 生产环境MySQL配置
│   └── init.sql                # MySQL初始化脚本
├── nginx/                      # Nginx配置
│   ├── nginx.conf              # Nginx主配置
│   ├── conf.d/                 # 站点配置
│   │   └── default.conf
│   └── ssl/                    # SSL证书目录
├── redis/                      # Redis配置
│   ├── redis.conf              # 开发环境Redis配置
│   ├── prod.conf               # 生产环境Redis配置
│   └── redis.acl               # Redis ACL配置
├── prometheus/                 # Prometheus监控配置
│   └── prometheus.yml
└── grafana/                    # Grafana仪表板配置
    ├── datasources/
    │   └── prometheus.yml
    └── dashboards/
        └── dashboard.yml
```

## 使用方法

### 开发环境
```bash
cd docker
docker-compose up -d
```

### 生产环境
```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

## 服务说明

### 开发环境服务
- **app**: 开发服务器 (端口 3000)
- **mysql**: MySQL数据库 (端口 3307)
- **redis**: Redis缓存 (端口 6379)
- **phpmyadmin**: 数据库管理工具 (端口 8080)

### 生产环境服务
- **app**: 生产应用服务器
- **nginx**: 反向代理服务器 (端口 80, 443)
- **mysql**: MySQL数据库
- **redis**: Redis缓存
- **backup**: 数据库备份服务
- **prometheus**: 监控服务 (端口 9090)
- **grafana**: 仪表板服务 (端口 3001)

## 环境变量配置

生产环境需要在项目根目录创建 `secrets/` 目录，并包含以下文件：
- `mysql_root_password.txt`
- `mysql_password.txt`
- `jwt_secret.txt`
- `redis_password.txt`
- `grafana_password.txt`

## 注意事项

1. 生产环境配置文件中的密码和密钥需要替换为实际值
2. SSL证书需要放在 `nginx/ssl/` 目录下
3. 备份脚本位于 `../scripts/backup.sh`
4. 确保Docker和Docker Compose版本兼容