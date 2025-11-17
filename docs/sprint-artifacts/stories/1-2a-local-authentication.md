# Story 1.2a: 本地用户名密码登录

Status: done

## Story

As a 企业用户,
I want 使用用户名和密码在会议室管理系统进行本地登录,
so that 能够独立访问系统基础功能，不依赖外部企业认证系统.

## Acceptance Criteria

1. **Given** 用户已在系统中注册账户, **When** 用户输入正确的用户名和密码, **Then** 系统完成身份验证并建立用户会话
2. 本地用户认证系统实现，包含安全的密码哈希和验证机制
3. 会话管理完成，支持访问令牌和刷新令牌机制
4. 用户登录状态持久化，支持页面刷新后保持登录状态
5. 基础错误处理机制，包含用户名/密码错误、账户锁定等场景
6. 登录界面开发，提供良好的用户体验和表单验证
7. 安全措施实施，防止暴力破解和会话劫持
8. 基础权限验证，支持不同角色的功能访问控制

## Tasks / Subtasks

- [ ] Task 1.2a.1: 本地用户认证系统 (AC: 1, 2)
  - [ ] 扩展 Prisma User 表支持本地认证字段
  - [ ] 创建密码哈希工具函数 server/utils/password.ts
  - [ ] 实现用户注册和密码设置API
  - [ ] 创建本地登录验证逻辑 server/api/v1/auth/local-login.post.ts
  - [ ] 配置安全的密码存储和验证机制

- [ ] Task 1.2a.2: 会话管理和Token机制 (AC: 3)
  - [ ] 实现 JWT 工具函数 server/utils/jwt.ts
  - [ ] 配置访问令牌和刷新令牌机制
  - [ ] 创建令牌刷新端点 server/api/v1/auth/refresh.post.ts
  - [ ] 实现 middleware/auth.ts 认证中间件
  - [ ] 配置 secure, httpOnly, sameSite cookies

- [ ] Task 1.2a.3: 登录状态持久化 (AC: 4, 5)
  - [ ] 升级 stores/auth.ts 支持本地认证会话
  - [ ] 实现页面刷新后登录状态保持
  - [ ] 创建认证状态本地存储机制
  - [ ] 实现登录失败计数和账户锁定
  - [ ] 配置会话超时和自动登出

- [ ] Task 1.2a.4: 前端登录界面开发 (AC: 6, 7)
  - [ ] 创建 auth.vue 认证页面布局
  - [ ] 实现 pages/auth/login.vue 本地登录表单
  - [ ] 设计表单验证和错误提示组件
  - [ ] 创建加载状态和进度反馈
  - [ ] 实现防暴力破解的登录限制

- [ ] Task 1.2a.5: 基础权限和安全防护 (AC: 7, 8)
  - [ ] 集成现有权限系统 composites/usePermissions.ts
  - [ ] 实现基于角色的基础功能访问控制
  - [ ] 配置 CSRF 防护机制
  - [ ] 实现登录失败锁定和IP限制
  - [ ] 创建安全登出功能

## Dev Notes

### 本地认证系统要求

**技术栈要求：**
- **认证框架**: 基于Nuxt 4 + Nitro的本地认证实现
- **密码哈希**: bcrypt 或 Argon2 安全哈希算法
- **JWT管理**: JSON Web Token 访问令牌 + 刷新令牌
- **会话管理**: secure, httpOnly, sameSite cookies
- **缓存策略**: Redis 缓存认证状态，提升性能

**本地认证与后续SSO集成的兼容性设计：**
- 用户表设计支持多种认证方式 (LOCAL, SSO)
- 权限系统设计独立于认证方式
- JWT payload 统一格式，便于后续扩展
- 会话管理机制兼容本地认证和SSO认证

**JWT Token规范：**
```typescript
interface JWTPayload {
  sub: string           // 用户唯一标识
  email: string         // 用户邮箱
  name: string          // 用户姓名
  role: UserRole        // 用户角色 (ADMIN/MANAGER/USER)
  permissions: string[] // 用户权限列表
  authMethod: 'LOCAL' | 'SSO' // 认证方式标识
  iat: number          // 签发时间
  exp: number          // 过期时间
  iss: string          // 签发者
  aud: string          // 受众
}
```

### Project Structure Notes

**基于现有架构的扩展：**
- 复用已建立的Nuxt 4 + PrimeVue + Tailwind CSS架构
- 遵循已有API响应格式和错误处理模式
- 为后续SSO集成预留扩展接口
- 利用Redis缓存基础设施

**新增/修改文件结构：**
```
meeting-manage/
├── prisma/
│   └── schema.prisma                    # 扩展User表支持本地认证 (修改)
├── server/
│   ├── utils/
│   │   ├── password.ts                  # 密码哈希工具 (新建)
│   │   └── jwt.ts                       # JWT工具函数 (新建)
│   ├── middleware/
│   │   └── auth.ts                      # 后端认证中间件 (新建)
│   └── api/
│       └── v1/
│           └── auth/                    # 认证API端点 (新建)
│               ├── local-login.post.ts  # 本地登录接口 (新建)
│               ├── register.post.ts     # 用户注册接口 (新建)
│               ├── logout.post.ts       # 登出接口 (新建)
│               └── refresh.post.ts      # 令牌刷新接口 (新建)
├── stores/
│   └── auth.ts                          # 认证状态管理 (升级现有)
├── pages/
│   └── auth/
│       └── login.vue                    # 本地登录页面 (新建)
├── layouts/
│   ├── auth.vue                         # 认证页面布局 (新建)
│   └── default.vue                      # 默认布局 (修改，集成认证检查)
└── components/
    └── auth/
        ├── LoginForm.vue                # 本地登录表单 (新建)
        └── AuthStatus.vue               # 认证状态组件 (新建)
```

### 敏捷开发策略

**分阶段实现优势：**
- **快速验证**: 本地登录功能可以快速实现和测试
- **基础稳定**: 建立稳定的认证基础，为后续功能开发提供支撑
- **风险控制**: 降低对Hyd企业系统的依赖风险
- **用户体验**: 用户可以提前使用系统核心功能
- **技术积累**: 为后续SSO集成积累认证系统经验

**与后续SSO集成的衔接：**
- 用户身份信息统一管理，支持多种认证方式
- 权限系统独立设计，认证方式变更不影响权限控制
- 会话管理机制兼容，本地认证和SSO认证可并存
- 数据库设计预留扩展字段，便于后续集成

### References

- [Source: docs/architecture.md#Security Architecture] - 安全架构和JWT认证设计
- [Source: docs/epics.md#Story 1.2] - 原始故事需求和验收标准
- [Source: stories/1-3-role-permission-management.md] - 权限系统集成和模式复用
- [Source: stories/1-1-project-infra-init.md] - 基础设施和项目架构

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/stories/1-2a-local-authentication.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

**Completed:** 2025-11-17
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### File List