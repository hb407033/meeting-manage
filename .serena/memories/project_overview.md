# 智能会议室管理系统 - 项目概览

## 项目目的
这是一个基于Nuxt 4的智能会议室管理系统，提供完整的会议室预定、管理、权限控制等功能。系统支持多组织架构、用户权限管理、会议室预定审批、设备管理等业务场景。

## 技术栈

### 前端技术栈
- **Nuxt 4**: 使用最新的App目录模式，支持Vue 3和TypeScript
- **Vue 3**: 前端框架，组合式API
- **TypeScript**: 类型安全的JavaScript
- **PrimeVue**: UI组件库，提供丰富的企业级组件
- **Tailwind CSS**: 原子化CSS框架
- **Pinia**: 状态管理，替代Vuex
- **VueUse**: Vue组合式工具集

### 后端技术栈
- **Nuxt Server**: 基于Nitro的后端API服务
- **Prisma**: 现代化ORM，数据库操作和类型安全
- **MySQL**: 主数据库
- **Redis**: 缓存和会话存储
- **JWT**: 身份验证和授权
- **bcryptjs**: 密码加密

### 开发工具
- **Vitest**: 单元测试框架
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Husky**: Git钩子管理
- **Commitlint**: 提交信息规范

## 项目结构

### 前端结构 (app目录)
- `app/pages/`: 页面组件，支持Nuxt 4 App目录模式
- `app/components/`: 可复用组件
  - `features/rooms/`: 会议室相关功能组件
  - `admin/`: 管理员相关组件
  - `common/`: 通用组件
- `app/layouts/`: 布局模板
- `app/composables/`: 组合式函数，业务逻辑复用
- `app/stores/`: Pinia状态管理
- `app/plugins/`: 插件配置
- `app/middleware/`: 路由中间件

### 后端结构 (server目录)
- `server/api/`: API路由，按版本和功能模块组织
  - `v1/`: API v1版本
  - `auth/`: 身份验证相关API
  - `admin/`: 管理员API
  - `rooms/`: 会议室管理API
- `server/services/`: 服务层
- `server/utils/`: 工具函数
- `server/middleware/`: 服务端中间件

### 数据层
- `prisma/schema.prisma`: 数据模型定义
- `prisma/seed-*.ts`: 数据库种子文件

## 核心功能模块

### 用户管理
- 多层级组织架构支持
- 基于角色的权限控制(RBAC)
- 用户注册、登录、密码重置
- 权限申请和审批流程

### 会议室管理
- 会议室基础信息管理
- 会议室设备管理
- 会议室状态跟踪
- 会议室历史记录

### 预定管理
- 会议室预定
- 预定审批流程
- 预定冲突检测
- 预定历史查询

### 权限系统
- 细粒度权限控制
- 动态权限分配
- 权限审批工作流
- 审计日志记录