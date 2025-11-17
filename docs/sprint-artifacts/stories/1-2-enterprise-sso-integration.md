# Story 1.2: 企业单点登录集成 (已拆分)

Status: superseded

**注意**: 此故事已根据敏捷开发策略拆分为两个独立故事：
- **Story 1.2a**: 本地用户名密码登录 - 提供基础认证功能
- **Story 1.2b**: 企业单点登录集成 - 提供企业级SSO功能

**拆分原因**: 为了更符合敏捷开发策略，优先实现本地认证功能，为系统提供稳定的基础认证支撑，然后在此基础上集成企业SSO系统。

## Story

As a 企业用户,
I want 通过Hyd企业系统进行单点登录认证,
so that 无需记忆额外密码，安全便捷地访问会议室管理系统.

## Acceptance Criteria

1. **Given** 用户已登录Hyd企业系统, **When** 用户访问智能会议室管理系统, **Then** 系统自动通过Hyd SSO完成身份验证
2. 集成OAuth 2.0/OpenID Connect协议实现企业级单点登录
3. JWT Token管理完成，包含访问令牌和刷新令牌机制
4. 用户会话管理实现，支持自动续期和安全登出
5. 跨域认证配置完成，支持前端和后端API的无缝认证
6. 错误处理机制完善，包含认证失败、网络异常等场景
7. 登录状态持久化，支持页面刷新后保持登录状态
8. 安全措施实施，防止CSRF攻击和会话劫持

## Tasks / Subtasks

- [ ] Task 1.2.1: OAuth 2.0集成配置 (AC: 1, 2)
  - [ ] 配置 @sidebase/nuxt-auth OAuth 2.0 提供商
  - [ ] 设置 Hyd 企业 SSO 端点配置
  - [ ] 创建 OAuth 回调处理机制
  - [ ] 配置 client credentials 和 redirect URIs
  - [ ] 测试 OAuth 流程完整性

- [ ] Task 1.2.2: JWT Token管理 (AC: 2)
  - [ ] 创建 JWT 工具函数 server/utils/jwt.ts
  - [ ] 实现 JWT payload 包含用户信息 (sub, email, role, permissions)
  - [ ] 配置访问令牌和刷新令牌机制
  - [ ] 实现令牌自动续期逻辑
  - [ ] 创建令牌验证和解析中间件

- [ ] Task 1.2.3: 用户会话管理 (AC: 3)
  - [ ] 升级 stores/auth.ts 支持SSO会话管理
  - [ ] 配置 secure, httpOnly, sameSite cookies
  - [ ] 实现会话超时和自动续期
  - [ ] 创建安全登出功能
  - [ ] 实现多设备会话管理

- [ ] Task 1.2.4: 跨域认证配置 (AC: 4)
  - [ ] 配置 CORS 支持 Hyd 域名认证请求
  - [ ] 实现 middleware/auth.ts 全局认证检查
  - [ ] 创建 API 认证端点 server/api/v1/auth/
  - [ ] 统一前后端认证状态同步
  - [ ] 测试跨域认证流程

- [ ] Task 1.2.5: 错误处理和安全防护 (AC: 5, 8)
  - [ ] 实现认证失败错误处理
  - [ ] 配置 CSRF 防护机制
  - [ ] 实现登录失败锁定
  - [ ] 创建会话安全防护
  - [ ] 处理网络异常和超时场景

- [ ] Task 1.2.6: 登录状态持久化 (AC: 6, 7)
  - [ ] 实现页面刷新后登录状态保持
  - [ ] 创建认证状态本地存储机制
  - [ ] 配置 token 自动刷新
  - [ ] 实现认证状态恢复功能
  - [ ] 测试状态持久化可靠性

- [ ] Task 1.2.7: 前端认证界面开发 (AC: 8)
  - [ ] 创建 auth.vue 认证页面布局
  - [ ] 实现登录表单和SSO跳转
  - [ ] 设计加载状态和进度反馈
  - [ ] 创建错误处理提示组件
  - [ ] 实现用户菜单和登出功能

## Dev Notes

### 企业级安全认证要求

**技术栈要求：**
- **认证框架**: @sidebase/nuxt-auth + OAuth 2.0/OpenID Connect
- **JWT管理**: JSON Web Token 访问令牌 + 刷新令牌
- **会话管理**: secure, httpOnly, sameSite cookies
- **缓存策略**: Redis 缓存认证状态，提升性能

**OAuth 2.0配置要求：**
- **授权流程**: Authorization Code Flow
- **作用域**: openid email profile permissions
- **客户端认证**: client_id + client_secret
- **回调处理**: 多环境回调URL支持
- **令牌交换**: 访问令牌 + 刷新令牌机制

**JWT Token规范：**
```typescript
interface JWTPayload {
  sub: string           // 用户唯一标识
  email: string         // 用户邮箱
  name: string          // 用户姓名
  role: UserRole        // 用户角色 (ADMIN/MANAGER/USER)
  permissions: string[] // 用户权限列表
  organization: string  // 所属组织
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
- 集成现有权限系统和组织架构数据隔离
- 利用Redis缓存基础设施

**新增/修改文件结构：**
```
meeting-manage/
├── server/
│   ├── utils/
│   │   └── jwt.ts                 # JWT工具函数 (新建)
│   ├── middleware/
│   │   └── auth.ts                # 后端认证中间件 (新建)
│   └── api/
│       └── v1/
│           └── auth/              # 认证API端点 (新建)
│               ├── login.post.ts
│               ├── logout.post.ts
│               ├── refresh.post.ts
│               └── me.get.ts
├── stores/
│   └── auth.ts                    # 认证状态管理 (升级现有)
├── composables/
│   └── auth.ts                    # 认证组合式函数 (新建)
├── middleware/
│   └── auth.ts                    # 前端认证中间件 (新建)
├── pages/
│   ├── auth/
│   │   ├── login.vue              # 登录页面 (新建)
│   │   └── callback.vue           # OAuth回调页面 (新建)
│   └── profile/
│       └── index.vue              # 个人中心 (升级现有)
├── layouts/
│   ├── auth.vue                   # 认证页面布局 (新建)
│   └── default.vue                # 默认布局 (修改，集成认证检查)
└── components/
    ├── auth/
    │   ├── LoginForm.vue          # 登录表单 (新建)
    │   ├── SSOButton.vue          # SSO登录按钮 (新建)
    │   └── AuthStatus.vue         # 认证状态组件 (新建)
    └── common/
        └── UserMenu.vue           # 用户菜单 (新建)
```

### 学习自前一个故事 (1.3) 的经验

**重用已建立的模式：**
- **权限系统**: 复用composables/usePermissions.ts的验证模式
- **缓存机制**: 采用Redis缓存策略，15分钟TTL用于认证状态
- **中间件架构**: 复用权限中间件的设计模式用于认证检查
- **API响应格式**: 继续使用server/utils/response.ts统一响应格式
- **错误处理**: 复用权限系统的错误处理和日志记录模式

**与权限系统的集成：**
- SSO登录后自动获取用户权限信息
- 利用现有权限验证函数hasPermission(), hasRole()
- 复用组织架构数据隔离机制
- 保持与权限管理界面的一致性

**安全防护的延续：**
- 复用CSRF防护机制
- 采用相同的会话超时策略
- 保持一致的审计日志记录
- 延续登录失败锁定机制

### Hyd企业系统集成要求

**SSO集成点：**
- **用户信息同步**: 从Hyd系统获取用户基本信息和组织架构
- **权限映射**: 将Hyd角色映射到系统内部权限体系
- **组织架构**: 同步企业组织结构，支持数据隔离
- **实时同步**: 用户权限变更时的实时同步机制

**配置参数：**
```typescript
const hydSSOConfig = {
  clientId: process.env.HYD_CLIENT_ID,
  clientSecret: process.env.HYD_CLIENT_SECRET,
  authUrl: 'https://hyd.company.com/oauth/authorize',
  tokenUrl: 'https://hyd.company.com/oauth/token',
  userInfoUrl: 'https://hyd.company.com/api/userinfo',
  redirectUri: process.env.HYD_REDIRECT_URI,
  scopes: ['openid', 'email', 'profile', 'organization']
}
```

### References

- [Source: docs/architecture.md#Security Architecture] - 安全架构和JWT认证设计
- [Source: docs/epics.md#Story 1.2] - 完整故事需求和验收标准
- [Source: docs/PRD.md#企业级安全要求] - 企业级安全合规要求
- [Source: stories/1-3-role-permission-management.md] - 权限系统集成和模式复用
- [Source: stories/1-1-project-infra-init.md] - 基础设施和项目架构

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List