# 测试文档

## 测试结构

```
test/
├── fixtures/              # 测试夹具和设置
│   └── vitest-setup.ts   # Vitest全局设置
├── helpers/              # 测试工具函数
│   └── api.ts           # API测试辅助工具
├── unit/                 # 单元测试
│   ├── services/        # 服务层单元测试
│   ├── utils/          # 工具函数单元测试
│   └── example.test.ts # 示例测试
├── integration/         # 集成测试
│   └── api/            # API集成测试
├── e2e/                # 端到端测试（暂未实现）
└── README.md          # 本文档
```

## 运行测试

### 所有测试
```bash
npm run test
```

### 监视模式
```bash
npm run test:watch
```

### 测试覆盖率
```bash
npm run test:coverage
```

### UI界面
```bash
npm run test:ui
```

### 调试模式
```bash
npm run test:debug
```

## 测试配置

主要配置文件：
- `vitest.config.ts` - Vitest主配置
- `test/fixtures/vitest-setup.ts` - 全局测试设置

## 编写测试

### 单元测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MyService } from '#server/services/my-service'

describe('MyService', () => {
  let service: MyService

  beforeEach(() => {
    service = new MyService()
  })

  it('should work correctly', () => {
    expect(service.doSomething()).toBe(true)
  })
})
```

### 集成测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { apiTestHelper } from '#test/helpers/api'

describe('API Integration', () => {
  it('should register user successfully', async () => {
    const user = apiTestHelper.generateTestUser()
    const response = await apiTestHelper.registerUser(user)

    expect(response.success).toBe(true)
    expect(response.data.email).toBe(user.email)
  })
})
```

## 测试工具

### apiTestHelper

API测试辅助工具，提供以下方法：
- `registerUser()` - 注册用户
- `loginUser()` - 用户登录
- `createRoom()` - 创建会议室
- `createReservation()` - 创建预约
- `getHealth()` - 健康检查
- 等等...

### 数据生成器

- `generateTestUser()` - 生成测试用户数据
- `generateTestRoom()` - 生成测试会议室数据
- `generateTestReservation()` - 生成测试预约数据

## 测试环境

### 环境变量

测试会使用以下环境变量：
- `NODE_ENV=test`
- `DATABASE_URL=mysql://test:test@localhost:3307/meeting_manage_test`
- `REDIS_URL=redis://localhost:6379/1`

### 数据库

测试使用独立的MySQL数据库，避免与开发数据冲突。

### Redis

测试使用Redis的db1数据库，与开发环境隔离。

## 覆盖率要求

- 全局覆盖率：70%
- 核心服务（server/services/**）：85%

覆盖率报告生成在 `./coverage` 目录。

## 调试技巧

1. 使用 `console.log` 调试测试
2. 使用 `--inspect-brk` 参数进行Node.js调试
3. 使用Vitest UI进行可视化调试
4. 使用 `test.only()` 运行单个测试
5. 使用 `test.skip()` 跳过测试

## 常见问题

### 测试数据库连接失败

确保MySQL和Redis服务正在运行：
```bash
docker-compose up -d
```

### 测试权限问题

确保测试用户有数据库操作权限，参考 `.env.test` 配置。

### 端口冲突

确保API服务器在3000端口运行，或修改 `TEST_API_URL` 环境变量。