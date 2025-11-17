# Story 1.2b: 企业单点登录集成

Status: drafted

## Story

As a 企业用户,
I want 通过Hyd企业系统进行单点登录认证,
so that 无需记忆额外密码，安全便捷地访问会议室管理系统，并与企业现有身份管理体系集成.

## Acceptance Criteria

1. **Given** 用户已登录Hyd企业系统, **When** 用户访问智能会议室管理系统, **Then** 系统自动通过Hyd SSO完成身份验证
2. OAuth 2.0/OpenID Connect协议集成，实现企业级单点登录
3. JWT Token管理完成，与本地认证系统兼容的访问令牌和刷新令牌机制
4. 用户信息同步，从Hyd企业系统获取用户基本信息和组织架构
5. 权限映射，将Hyd角色映射到系统内部权限体系
6. 跨域认证配置完成，支持前端和后端API的无缝认证
7. 高级错误处理机制，包含认证失败、网络异常、企业系统不可用等场景
8. 双认证模式支持，用户可以选择本地登录或企业SSO登录

## Tasks / Subtasks

- [ ] Task 1.2b.1: OAuth 2.0集成配置 (AC: 1, 2)
  - [ ] 配置 @sidebase/nuxt-auth OAuth 2.0 提供商
  - [ ] 设置 Hyd 企业 SSO 端点配置
  - [ ] 创建 OAuth 回调处理机制
  - [ ] 配置 client credentials 和 redirect URIs
  - [ ] 实现多环境SSO配置支持

- [ ] Task 1.2b.2: JWT Token与本地认证兼容 (AC: 3)
  - [ ] 扩展现有 JWT 工具函数支持SSO认证
  - [ ] 实现 JWT payload 包含SSO认证信息
  - [ ] 配置访问令牌和刷新令牌机制
  - [ ] 实现令牌自动续期逻辑
  - [ ] 创建统一令牌验证中间件

- [ ] Task 1.2b.3: 用户信息同步和权限映射 (AC: 4, 5)
  - [ ] 实现Hyd用户信息获取API调用
  - [ ] 创建用户信息本地存储和同步机制
  - [ ] 实现Hyd角色到系统权限的映射逻辑
  - [ ] 支持组织架构同步和数据隔离
  - [ ] 创建用户权限实时同步机制

- [ ] Task 1.2b.4: 跨域认证和双模式支持 (AC: 6, 8)
  - [ ] 扩展CORS配置支持Hyd域名认证请求
  - [ ] 升级middleware/auth.ts支持双认证模式
  - [ ] 创建统一认证端点处理本地和SSO认证
  - [ ] 实现前端认证方式选择界面
  - [ ] 配置认证模式自动切换逻辑

- [ ] Task 1.2b.5: 高级错误处理和容错机制 (AC: 7)
  - [ ] 实现Hyd系统不可用时的降级处理
  - [ ] 配置SSO认证失败的重试机制
  - [ ] 创建企业系统连接状态监控
  - [ ] 实现认证错误的友好提示和引导
  - [ ] 建立企业系统集成的监控和告警

- [ ] Task 1.2b.6: SSO前端界面集成 (AC: 8)
  - [ ] 升级auth.vue页面支持双认证模式
  - [ ] 实现SSO登录按钮和跳转逻辑
  - [ ] 创建企业认证状态显示组件
  - [ ] 设计认证方式选择和切换界面
  - [ ] 实现SSO认证流程的用户引导

## Dev Notes

### 企业级安全认证要求

**技术栈要求：**
- **认证框架**: @sidebase/nuxt-auth + OAuth 2.0/OpenID Connect
- **兼容性**: 与现有本地认证系统完全兼容
- **JWT管理**: 统一的访问令牌 + 刷新令牌机制
- **会话管理**: secure, httpOnly, sameSite cookies
- **缓存策略**: Redis 缓存认证状态，支持多认证源

**OAuth 2.0配置要求：**
- **授权流程**: Authorization Code Flow
- **作用域**: openid email profile permissions organization
- **客户端认证**: client_id + client_secret
- **回调处理**: 多环境回调URL支持
- **令牌交换**: 访问令牌 + 刷新令牌机制

**双认证模式设计：**
- 用户可以选择本地认证或企业SSO认证
- 同一用户支持多种认证方式绑定
- 权限系统独立于认证方式
- 会话管理统一处理不同认证源

### 与本地认证系统的集成

**认证模式兼容性：**
- User表扩展authMethod字段 ('LOCAL', 'SSO', 'BOTH')
- JWT payload统一格式，包含authMethod标识
- 权限验证函数hasPermission()、hasRole()兼容所有认证方式
- 会话管理middleware/auth.ts支持多认证源

**用户身份统一管理：**
- SSO用户首次登录时自动创建本地账户
- 支持本地账户与SSO账户的绑定和解绑
- 用户信息实时同步，保持企业系统一致性
- 权限映射支持动态更新和缓存

**安全性增强：**
- SSO认证时验证企业系统证书
- 支持企业系统连接状态监控
- 实现SSO认证失败的降级到本地认证
- 防止SSO劫持和中间人攻击

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
  organizationUrl: 'https://hyd.company.com/api/organization',
  redirectUri: process.env.HYD_REDIRECT_URI,
  scopes: ['openid', 'email', 'profile', 'organization', 'permissions']
}
```

**权限映射配置：**
```typescript
const hydRoleMapping = {
  'HYD_ADMIN': ['ADMIN'],
  'HYD_MANAGER': ['MANAGER'],
  'HYD_SUPERVISOR': ['MANAGER', 'USER'],
  'HYD_EMPLOYEE': ['USER']
}
```

### Project Structure Notes

**基于现有架构的扩展：**
- 重用本地认证系统的基础设施
- 扩展现有JWT和会话管理机制
- 集成现有权限系统和组织架构数据隔离
- 利用Redis缓存基础设施

**新增/修改文件结构：**
```
meeting-manage/
├── prisma/
│   └── schema.prisma                    # 扩展User表支持SSO认证 (修改)
├── server/
│   ├── utils/
│   │   ├── sso.ts                       # SSO认证工具 (新建)
│   │   └── user-sync.ts                 # 用户信息同步工具 (新建)
│   ├── middleware/
│   │   └── auth.ts                      # 升级支持双认证模式 (修改)
│   └── api/
│       └── v1/
│           └── auth/
│               ├── sso-login.post.ts    # SSO登录接口 (新建)
│               ├── sso-callback.get.ts  # SSO回调处理 (新建)
│               ├── user-sync.post.ts    # 用户同步接口 (新建)
│               └── auth-mode.post.ts    # 认证模式切换 (新建)
├── stores/
│   └── auth.ts                          # 升级支持双认证模式 (修改)
├── pages/
│   └── auth/
│       ├── login.vue                    # 升级支持双认证模式 (修改)
│       └── sso-callback.vue             # SSO回调页面 (新建)
└── components/
    └── auth/
        ├── AuthModeSelector.vue         # 认证方式选择器 (新建)
        ├── SSOButton.vue                # SSO登录按钮 (新建)
        └── SSOLoading.vue               # SSO认证加载组件 (新建)
```

### 双认证模式用户体验

**认证流程设计：**
- 登录页面提供本地认证和SSO认证两个选项
- 默认显示本地认证表单，SSO作为快速登录选项
- 首次SSO登录后询问是否绑定本地账户
- 支持已绑定账户的认证方式切换

**安全性和便利性平衡：**
- SSO提供便捷登录，本地认证作为备份
- 企业网络内优先使用SSO，外部网络使用本地认证
- 支持认证方式的无缝切换和会话保持
- 提供清晰的用户引导和帮助文档

### References

- [Source: docs/architecture.md#Security Architecture] - 安全架构和JWT认证设计
- [Source: docs/epics.md#Story 1.2] - 原始故事需求和验收标准
- [Source: stories/1-2a-local-authentication.md] - 本地认证系统基础
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