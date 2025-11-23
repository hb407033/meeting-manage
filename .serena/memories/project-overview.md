# meeting-manage 项目概览

## 项目基本信息
- **项目名称**: 智能会议室管理系统 (meeting-manage)
- **项目级别**: Level 3 - 复杂系统
- **目标规模**: 企业级智能会议室资源配置优化平台
- **技术栈**: Nuxt 4 + PrimeVue + MySQL + Prisma + Redis
- **架构模式**: 全栈架构，使用 Nuxt 4 的 app/ 目录结构

## 项目当前状态 (2025-11-23)

### 已完成功能 (Epic 1-2)
- ✅ Epic 1: 基础设施与用户认证 (基本完成)
  - JWT + bcrypt 认证系统
  - 完整 RBAC 权限模型 
  - 组织架构支持
  - Docker 容器化部署
  - UI 主题优化

- ✅ Epic 2: 会议室核心管理 (完全完成)
  - 会议室 CRUD 操作
  - 会议室搜索和筛选
  - 会议室详情展示
  - 会议室规则配置

### 进行中功能 (Epic 3)
- 🚧 Epic 3: 预约系统核心 (大部分完成，部分功能进行中)
  - ✅ 日历视图与可用性查询
  - ✅ 快速预约功能 
  - ✅ 详细预约配置
  - ✅ 预约冲突检测与解决
  - 🔄 周期性预约管理 (review阶段)
  - 🔄 预约状态跟踪与通知 (drafted阶段)
  - 🔄 用户预约仪表板 (in-progress阶段)

### 待开发功能 (Epic 4-7)
- ⏳ Epic 4: 签到与验证系统 (backlog)
- ⏳ Epic 5: 智能设备集成 (backlog)  
- ⏳ Epic 6: 数据分析洞察 (backlog)
- ⏳ Epic 7: 系统配置与管理 (backlog)

## 核心技术架构

### 前端技术栈
- **框架**: Nuxt 4 (Vue 3 + TypeScript)
- **UI库**: PrimeVue 4.x + Aura主题
- **样式**: Tailwind CSS 3.x
- **状态管理**: Pinia
- **日历组件**: @fullcalendar/vue
- **表单处理**: FormKit

### 后端技术栈
- **服务器**: Nuxt Server (Nitro)
- **数据库**: MySQL 8.0 + Prisma 6.19.0 ORM
- **缓存**: Redis 5.8.2
- **认证**: JWT + bcrypt
- **API设计**: RESTful + 统一响应格式

### 项目结构
```
meeting-manage/
├── app/                    # 前端应用 (Nuxt 4 标准)
│   ├── components/         # Vue组件
│   ├── pages/             # 页面路由
│   ├── composables/       # 组合式函数
│   ├── stores/            # Pinia状态管理
│   └── layouts/           # 布局组件
├── server/                # 后端API服务
│   ├── api/v1/           # API端点
│   ├── services/         # 业务服务层
│   ├── utils/            # 工具函数
│   └── middleware/       # 中间件
├── prisma/               # 数据模型和迁移
├── docs/                 # 项目文档
└── docker/               # 容器化配置
```

## 核心数据模型

### 预约系统相关模型 (Epic 3重点)
- **Reservation**: 预约记录 (title, startTime, endTime, status, equipment等)
- **ReservationStatus**: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
- **MeetingRoom**: 会议室信息 (与Epic 2集成)
- **User**: 用户信息 (与Epic 1集成)

### 关键API端点 (Epic 3)
- `POST /api/v1/reservations` - 创建预约
- `GET /api/v1/reservations/availability` - 检查可用性
- `POST /api/v1/reservations/conflict-check` - 冲突检测
- `POST /api/v1/reservations/recurring` - 周期性预约
- `GET /api/v1/reservations/statistics` - 统计信息

## 开发规范

### 命名约定
- 组件文件: `PascalCase.vue`
- 页面文件: `kebab-case.vue` 
- API文件: `kebab-case.post.ts`
- 变量: `camelCase`
- 常量: `UPPER_SNAKE_CASE`

### Import路径规范
- Server文件: 使用 `~~/server` 前缀
- App目录文件: 使用 `~/` 前缀 (自动解析到app/)
- 全局文件: 使用 `~/` 前缀访问根目录

### 开发命令
```bash
# 安装依赖
pnpm install

# 数据库初始化
pnpm db:setup  # generate + migrate + seed

# 启动开发服务器
pnpm dev

# 代码质量检查
pnpm lint
pnpm type-check
```

## UX设计原则

### 核心体验
- **"预约会议室，从未如此简单"** - 以极致便捷的预约流程为核心
- **一目了然** - 会议室状态实时清晰展示
- **极其简单** - 3步完成预约：选房间 → 选时间 → 确认
- **智能匹配** - 基于历史数据的智能推荐

### 设计系统
- PrimeVue Styled Mode + Aura主题 + 企业定制
- 专业商务蓝色彩体系 (#1e40af 主色调)
- 响应式设计，移动端H5完美适配

## 当前开发重点

### Epic 3 完成情况
需要重点关注的功能:
1. **周期性预约管理** - 当前在review阶段，需要完成测试和文档
2. **预约状态跟踪与通知** - 已drafted，需要实现状态机和通知系统
3. **用户预约仪表板** - 进行中，需要完善个人预约管理界面

### 下一步工作
1. 完成Epic 3剩余功能的实现和测试
2. 进行Epic 3的retrospective回顾
3. 开始Epic 4 (签到与验证系统)的技术规范和实现

## 快速启动指南

### 环境要求
- Node.js 18+
- pnpm 8+
- MySQL 8.0+
- Redis 7+ (可选)

### 启动步骤
```bash
# 1. 配置环境变量
cp .env.example .env.local

# 2. 安装依赖
pnpm install

# 3. 数据库初始化
pnpm db:setup

# 4. 启动开发服务器
pnpm dev

# 访问应用
# 前端: http://localhost:3000
# API: http://localhost:3000/api/v1
```