# Story 2.2: 会议室搜索与筛选

Status: ready-for-dev

## Story

As a 普通用户,
I want 搜索和筛选会议室,
so that 快速找到符合需求的会议室资源.

## Acceptance Criteria

1. **Given** 用户输入关键词
**When** 执行搜索
**Then** 返回匹配的会议室列表

**And** 支持按会议室名称、位置、描述进行数据库模糊查询

2. **Given** 用户选择筛选条件
**When** 应用筛选
**Then** 显示符合所有条件的会议室

**And** 多维度筛选：容量范围、设备配置、地理位置、可用状态等

3. **Given** 用户有搜索结果
**When** 选择排序方式
**Then** 结果按指定维度重新排序

**And** 支持按容量、名称、位置等维度排序

4. **Given** 搜索结果超过20条
**When** 显示结果
**Then** 分页显示，每页20条记录

**And** 搜索结果分页显示，优化大数据量下的性能

## Tasks / Subtasks

- [ ] Task 2.2.1: 开发数据库搜索API接口 (AC: 1)
  - [ ] 创建 server/api/v1/rooms/search.post.ts - 基于数据库的搜索API
  - [ ] 实现关键词模糊查询：名称、位置、描述字段
  - [ ] 添加权限验证 (room:read)
  - [ ] 实现数据库查询优化和索引

- [ ] Task 2.2.2: 实现筛选功能 (AC: 2, 3)
  - [ ] 扩展现有 server/api/v1/rooms/index.get.ts 支持筛选参数
  - [ ] 实现多维度筛选：容量、设备、位置、状态
  - [ ] 添加排序功能：容量、名称、位置
  - [ ] 实现筛选条件的数据验证

- [ ] Task 2.2.3: 创建搜索前端组件 (AC: 1, 2, 3)
  - [ ] 创建 app/components/features/rooms/RoomSearch.vue - 搜索输入组件
  - [ ] 创建 app/components/features/rooms/RoomFilter.vue - 筛选器组件
  - [ ] 创建 app/components/features/rooms/SearchResults.vue - 结果展示组件
  - [ ] 集成 PrimeVue 组件和 FormKit 验证

- [ ] Task 2.2.4: 实现分页和性能优化 (AC: 4)
  - [ ] 实现搜索结果分页逻辑
  - [ ] 添加搜索防抖处理 (300ms)
  - [ ] 优化数据库查询性能和索引策略

- [ ] Task 2.2.5: 集成状态管理和路由 (AC: 全部)
  - [ ] 扩展 app/stores/rooms.ts 支持搜索和筛选状态
  - [ ] 集成搜索组件到现有会议室页面
  - [ ] 实现搜索URL参数和页面刷新

- [ ] Task 2.2.6: 添加测试覆盖 (AC: 全部)
  - [ ] 创建搜索API的集成测试
  - [ ] 添加前端搜索组件单元测试
  - [ ] 性能测试：搜索响应时间测试

## Dev Notes

### Project Structure Notes

根据 Story 2.1 的架构经验，简化的搜索功能应该放置在以下位置：
- **搜索API**: `server/api/v1/rooms/search.post.ts`
- **筛选功能**: 扩展现有 `server/api/v1/rooms/index.get.ts`
- **前端组件**: `app/components/features/rooms/` 目录
- **状态管理**: 扩展 `app/stores/rooms.ts`
- **数据库优化**: 为搜索字段添加数据库索引

### Learnings from Previous Story

**From Story 2.1 (Status: review)**

- **基础设施就绪**: Nuxt 4 + PrimeVue + MySQL + Redis 环境已配置完成
- **权限系统完善**: JWT + RBAC 权限控制已实现，可直接使用 room:read 权限 [Source: stories/2-1-room-basic-data-management.md#Dev-Agent-Record]
- **API架构模式**: 统一响应格式、错误处理、数据验证模式已建立 [Source: docs/architecture.md#API-响应格式模式]
- **Vue组件模式**: FormKit + PrimeVue 集成模式已验证成功

**New Services Available for Reuse**:
- `server/middleware/permission.ts` - 权限验证中间件，支持 requirePermission()
- `server/utils/response.ts` - 统一API响应格式工具
- `app/stores/rooms.ts` - 会议室状态管理，可扩展搜索功能
- `app/composables/useAuth.ts` - 认证状态管理composable

**Architectural Decisions to Maintain**:
- **API设计**: RESTful 规范，GET/POST 语义化使用
- **数据验证**: 后端 Zod schema + 前端 FormKit 双重验证
- **错误处理**: 统一错误响应格式，用户友好错误信息
- **性能策略**: 多层缓存策略，Redis + 浏览器缓存

**Technical Debt to Address**:
- **数据库索引**: 会议室列表查询需要为搜索字段添加索引优化
- **性能优化**: 数据库查询优化，避免全表扫描

### Implementation Constraints

**Performance Requirements**:
- 搜索响应时间 < 500ms (可接受范围)
- 前端防抖处理: 300ms
- 数据库查询优化：使用索引优化搜索性能

**Security Requirements**:
- 权限验证: room:read 基础权限
- 输入验证: 防止SQL注入和XSS攻击
- 敏感信息过滤: 不在搜索结果中暴露敏感数据

**Technology Stack**:
- 数据库搜索: MySQL + Prisma ORM (模糊查询)
- 前端框架: Nuxt 4 + PrimeVue + FormKit
- 后端API: Node.js + TypeScript + Zod验证

### References

- [Source: docs/architecture.md#Core-Data-Models] - MeetingRoom 数据模型 (已完成)
- [Source: docs/architecture.md#API-Contracts] - API 接口设计规范
- [Source: docs/architecture.md#Implementation-Patterns] - 代码实现模式
- [Source: docs/architecture.md#Security-Architecture] - 安全架构和权限控制
- [Source: docs/architecture.md#缓存策略模式] - 缓存策略和性能优化
- [Source: docs/epics.md#Story-2.2] - Story 2.2 详细需求和技术实现
- [Source: stories/2-1-room-basic-data-management.md] - 前序故事的实现经验
- [Source: docs/ux-design.md] - UX设计规范和组件库

## Dev Agent Record

### Context Reference

- [Context File: 2-2-room-search-and-filter.context.xml](./2-2-room-search-and-filter.context.xml) - Generated story context with technical specifications, code references, and implementation guidance

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List

## Change Log

- **2025-11-17**: 创建会议室搜索与筛选故事草稿，包含完整的搜索功能设计、API接口规划和前端组件架构
- **2025-11-17**: 简化故事实现方案，移除复杂搜索引擎和搜索历史功能，改为基于数据库的简单搜索