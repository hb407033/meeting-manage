# 数据库和缓存配置指南

本文档描述了智能会议室管理系统的数据库和Redis缓存配置。

## 🏗️ 系统架构

### 数据库
- **类型**: MySQL 8.0
- **ORM**: Prisma 6.x
- **连接池**: 支持高并发连接
- **字符集**: utf8mb4 (支持完整Unicode)

### 缓存
- **类型**: Redis 7.x
- **用途**: 会话管理、查询结果缓存、限流
- **配置**: 支持持久化和集群

## 📦 快速开始

### 方法1: 使用Docker (推荐)

```bash
# 克隆项目
git clone <repository-url> meeting-manage
cd meeting-manage

# 安装依赖
npm install

# 运行快速设置脚本（自动启动MySQL和Redis）
./scripts/setup-dev.sh

# 启动开发服务器
npm run dev
```

### 方法2: 手动配置

#### 1. 启动MySQL和Redis
```bash
# 使用Docker启动
docker-compose up -d mysql redis

# 或者手动启动本地服务
# MySQL 8.0 on localhost:3307
# Redis 7.x on localhost:6379
```

#### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置文件
DATABASE_URL="mysql://root:password@localhost:3307/meeting_manage"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret-key"
```

#### 3. 初始化数据库
```bash
# 生成Prisma客户端
npm run db:generate

# 创建数据库迁移
npm run db:migrate

# 运行种子数据
npm run db:seed
```

## 🔧 配置说明

### 数据库配置

#### Prisma Schema
- **位置**: `prisma/schema.prisma`
- **特性**:
  - 类型安全的数据库访问
  - 自动迁移生成
  - 事务支持
  - 连接池管理

#### 连接配置
```typescript
// server/services/database.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'], // 生产环境只记录警告和错误
})
```

### Redis配置

#### 连接配置
```typescript
// server/services/redis.ts
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
}
```

#### 缓存策略
- **用户信息**: 30分钟TTL
- **会议室列表**: 10分钟TTL
- **系统配置**: 24小时TTL
- **限流**: 1分钟窗口

## 📊 数据模型

### 核心实体

#### 用户 (User)
```typescript
interface User {
  id: string
  email: string
  name: string
  password: string
  role: UserRole
  department?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### 会议室 (MeetingRoom)
```typescript
interface MeetingRoom {
  id: string
  name: string
  description?: string
  capacity: number
  location?: string
  status: RoomStatus
  hasProjector: boolean
  hasWhiteboard: boolean
  hasVideoConf: boolean
  requiresApproval: boolean
}
```

#### 预约 (Reservation)
```typescript
interface Reservation {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  status: ReservationStatus
  organizerId: string
  roomId: string
  attendeeCount: number
}
```

## 🚀 部署配置

### 生产环境

#### Docker Compose
```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```

#### 环境变量
```bash
# 数据库配置
DATABASE_URL="mysql://user:password@mysql:3306/meeting_manage"
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis配置
REDIS_URL="redis://redis:6379"
REDIS_PASSWORD="your-redis-password"

# 安全配置
JWT_SECRET="strong-production-jwt-secret"
```

## 🧪 测试和验证

### 健康检查
```bash
# API健康检查
curl http://localhost:3000/api/v1/health

# 返回示例
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": { "status": "healthy", "latency": 12 },
      "redis": { "status": "healthy", "latency": 2 }
    }
  }
}
```

### 数据库连接测试
```bash
# 测试数据库连接
npm run db:studio

# 运行查询测试
npx prisma db seed
```

### Redis连接测试
```bash
# 使用Redis CLI测试
docker-compose exec redis redis-cli ping
# 返回: PONG

# 测试缓存写入
docker-compose exec redis redis-cli set test-key "test-value"
# 测试缓存读取
docker-compose exec redis redis-cli get test-key
```

## 🔒 安全配置

### 数据库安全
- 使用强密码
- 限制数据库用户权限
- 启用SSL连接（生产环境）
- 定期备份数据

### Redis安全
- 设置Redis密码
- 禁用危险命令
- 限制网络访问
- 启用持久化

### 环境变量安全
```bash
# 使用.env.local存储敏感配置
.env.local
.env.production.local

# 确保添加到.gitignore
.env
.env.local
.env.*.local
```

## 📈 性能优化

### 数据库优化
- 添加适当的索引
- 使用连接池
- 查询优化
- 读写分离（如需要）

### Redis优化
- 合理的TTL设置
- 内存使用监控
- 持久化策略
- 集群配置（大规模部署）

### 监控指标
- 数据库连接数
- 查询响应时间
- Redis内存使用
- 缓存命中率

## 🛠️ 故障排除

### 常见问题

#### 数据库连接失败
```bash
# 检查MySQL状态
docker-compose logs mysql

# 重启MySQL服务
docker-compose restart mysql

# 检查网络连接
telnet localhost 3307
```

#### Redis连接失败
```bash
# 检查Redis状态
docker-compose logs redis

# 重启Redis服务
docker-compose restart redis

# 测试连接
docker-compose exec redis redis-cli ping
```

#### Prisma生成失败
```bash
# 清理缓存
rm -rf node_modules/.prisma
npm run db:generate

# 检查schema语法
npx prisma validate
```

## 📚 参考资料

- [Prisma文档](https://www.prisma.io/docs/)
- [Redis文档](https://redis.io/documentation)
- [MySQL 8.0文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [Docker Compose文档](https://docs.docker.com/compose/)