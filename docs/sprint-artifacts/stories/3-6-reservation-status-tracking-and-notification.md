# Story 3.6: 预约状态跟踪与通知

Status: drafted

## Story

As a 会议组织者,
I want 跟踪预约状态变化并接收实时通知,
so that 及时了解预约进展，确保会议顺利进行并做好相应准备.

## Acceptance Criteria

1. 预约状态管理：支持6种状态（待确认、已确认、进行中、已完成、已取消、已过期）
2. 多渠道通知系统：状态变更时发送邮件、系统内消息、移动推送通知
3. 自动状态更新：会议开始/结束时间到达时自动更新预约状态
4. 状态变更历史：完整记录预约状态变化过程，包含变更时间、操作人、原因
5. 批量状态管理：支持管理员批量更新多个预约状态，具备权限控制
6. 状态权限控制：不同角色对状态变更的权限限制（用户只能操作自己的预约）

## Tasks / Subtasks

- [ ] Task 1: 状态机设计与实现 (AC: 1)
  - [ ] Subtask 1.1: 创建 ReservationStateManager 服务类，实现状态转换逻辑
  - [ ] Subtask 1.2: 设计并实现6种预约状态的状态机（PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED）
  - [ ] Subtask 1.3: 实现状态转换规则和业务逻辑验证机制
  - [ ] Subtask 1.4: 添加状态变更的异常处理和回滚机制

- [ ] Task 2: 通知系统开发 (AC: 2)
  - [ ] Subtask 2.1: 扩展现有 NotificationService 支持预约状态变更通知
  - [ ] Subtask 2.2: 创建邮件通知模板（状态变更、会议提醒、取消通知等）
  - [ ] Subtask 2.3: 实现系统内消息通知机制和消息队列
  - [ ] Subtask 2.4: 集成 WebSocket 实时状态变更通知到前端界面

- [ ] Task 3: 自动状态更新功能 (AC: 3)
  - [ ] Subtask 3.1: 开发定时任务服务，使用 node-cron 检查会议开始/结束时间
  - [ ] Subtask 3.2: 实现状态自动更新逻辑（PENDING→IN_PROGRESS→COMPLETED）
  - [ ] Subtask 3.3: 处理过期预约状态更新（PENDING→EXPIRED，超过开始时间30分钟）
  - [ ] Subtask 3.4: 添加状态更新的异常处理、重试机制和日志记录

- [ ] Task 4: 状态历史记录系统 (AC: 4)
  - [ ] Subtask 4.1: 扩展 Prisma schema 添加 reservation_status_history 表
  - [ ] Subtask 4.2: 实现状态变更的完整记录机制（包含时间、操作人、原因）
  - [ ] Subtask 4.3: 开发 GET /api/v1/reservations/:id/history 状态历史查询 API
  - [ ] Subtask 4.4: 创建 StatusHistoryTimeline.vue 状态历史时间轴可视化组件

- [ ] Task 5: 批量状态管理功能 (AC: 5)
  - [ ] Subtask 5.1: 开发管理员专用的批量状态更新界面
  - [ ] Subtask 5.2: 实现批量操作的权限验证和审计日志记录
  - [ ] Subtask 5.3: 创建批量操作的确认机制和操作预览功能
  - [ ] Subtask 5.4: 添加批量操作的性能优化和分批处理机制

- [ ] Task 6: 前端状态管理界面 (AC: 1, 2, 4, 6)
  - [ ] Subtask 6.1: 创建 ReservationStatusManager.vue 状态管理主界面
  - [ ] Subtask 6.2: 实现 StatusIndicator.vue 状态指示器组件，支持颜色编码
  - [ ] Subtask 6.3: 开发 StatusHistoryTimeline.vue 状态历史时间轴组件
  - [ ] Subtask 6.4: 创建 StatusNotificationSettings.vue 通知设置组件
  - [ ] Subtask 6.5: 集成 UniversalHeader.vue 组件保持界面一致性

- [ ] Task 7: 后端API开发与集成 (AC: 1, 4, 5, 6)
  - [ ] Subtask 7.1: 创建 PUT /api/v1/reservations/:id/status 状态更新 API
  - [ ] Subtask 7.2: 实现状态变更的业务逻辑验证和权限检查
  - [ ] Subtask 7.3: 开发 POST /api/v1/reservations/batch-status 批量状态更新 API
  - [ ] Subtask 7.4: 集成现有认证中间件和 RBAC 权限控制体系
  - [ ] Subtask 7.5: 实现 API 响应缓存策略，提升查询性能

- [ ] Task 8: 数据库设计与优化
  - [ ] Subtask 8.1: 扩展 Reservation 表添加 status 和 statusUpdatedAt 字段
  - [ ] Subtask 8.2: 创建 reservation_status_history 表存储状态变更历史
  - [ ] Subtask 8.3: 优化数据库索引，提升状态查询性能
  - [ ] Subtask 8.4: 实现状态数据的 Redis 缓存机制，设置合适 TTL

- [ ] Task 9: 测试与验证
  - [ ] Subtask 9.1: 编写状态机逻辑的单元测试，覆盖所有状态转换
  - [ ] Subtask 9.2: 进行端到端测试验证完整状态转换流程
  - [ ] Subtask 9.3: 性能测试验证批量状态更新的响应时间 < 500ms
  - [ ] Subtask 9.4: 集成测试验证通知系统的可靠性和实时性

## Dev Notes

### 技术架构约束
- 遵循现有Nuxt 4全栈架构模式，使用MySQL + Prisma进行数据持久化
- 复用现有认证中间件和RBAC权限体系
- 与PrimeVue 4.4.1组件库保持样式一致性，使用企业级商务蓝主题(#1e40af)
- 支持TypeScript严格模式，所有组件必须有完整的类型定义
- 集成现有缓存策略优化性能，Redis缓存状态数据（15分钟TTL）

### 数据模型扩展
基于技术规格需要扩展以下数据结构：
- Reservation表：添加status字段（ReservationStatus枚举）、statusUpdatedAt字段
- reservation_status_history表：存储状态变更历史（id, reservationId, fromStatus, toStatus, changedBy, reason, timestamp）
- 扩展User表：添加notificationPreferences字段存储用户通知偏好

### API设计约束
- 使用统一API响应格式和错误处理机制
- PUT /api/v1/reservations/:id/status 状态更新接口，需要reason参数说明变更原因
- GET /api/v1/reservations/:id/history 状态历史查询接口，支持分页和时间范围筛选
- POST /api/v1/reservations/batch-status 批量状态更新接口，支持事务回滚
- 集成现有缓存策略，状态数据缓存15分钟，状态变更时主动失效缓存

### 前端组件结构
- 使用Composition API开发Vue 3组件，集成@vueuse/core工具库
- 采用Pinia进行状态管理，创建reservations store管理预约状态
- 响应式设计适配桌面端和移动端，使用PrimeVue响应式组件
- 集成WebSocket实时通知，监听状态变更事件

### 项目结构对齐
- 遵循app/components/features/reservations/目录结构，创建状态管理相关组件
- 复用app/composables/中现有的useAuth和usePermissions进行权限控制
- 集成app/components/UniversalHeader.vue统一头部组件，保持界面一致性
- 遵循项目的ESLint和Prettier代码规范，保持代码质量

### 安全考虑
- 状态变更需要适当的权限验证（用户只能操作自己的预约，管理员可操作所有预约）
- 批量状态操作需要特殊权限，记录详细的审计日志
- 敏感状态变更（如取消预约）需要二次确认
- 防SQL注入和XSS攻击的数据验证
- 状态变更通知内容的安全过滤，避免信息泄露

### 性能要求
- 单个状态更新响应时间 < 100ms
- 批量状态更新响应时间 < 500ms（支持100个预约）
- 状态历史查询响应时间 < 200ms（分页查询）
- 实时状态通知延迟 < 3秒
- 使用Redis缓存减少数据库查询压力

### Learnings from Previous Story

**From Story 3-4 (Status: drafted)**

- **UniversalHeader组件**: 已创建统一的页面头部组件，位于 `app/components/UniversalHeader.vue` - 在状态管理界面中直接集成使用
- **权限控制模式**: 已建立基于usePermissions()的菜单权限控制 - 在状态管理时参考此模式控制可见性
- **响应式设计**: 已实现移动端导航适配 - 状态管理界面需要同样适配移动端体验
- **企业级样式**: 已确立商务蓝主题(#1e40af)的应用模式 - 新组件保持一致的视觉风格
- **冲突检测机制**: 已实现复杂的业务逻辑验证和错误处理 - 状态管理可复用这些数据验证逻辑
- **WebSocket实时通知**: 已建立的实时通知基础设施 - 可直接用于状态变更通知

**From Story 3-3 (Status: drafted)**

- **详细预约模式**: 已实现复杂表单的验证和数据处理机制 - 状态管理可复用这些数据验证逻辑
- **文件上传服务**: 已建立会议材料上传和管理功能 - 状态变更通知可包含相关文件链接
- **设备选择机制**: 已实现设备可用性检查 - 状态管理可集成设备状态信息

[Source: docs/sprint-artifacts/stories/3-4-reservation-conflict-detection-and-resolution.md]
[Source: docs/sprint-artifacts/stories/3-3-detailed-reservation-configuration.md]

### References

- [Source: docs/epics.md#Story-36-预约状态跟踪与通知]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#AC6]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#Services-and-Modules]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#Data-Models-and-Contracts]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#APIs-and-Interfaces]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#Workflows-and-Sequencing]
- [Source: docs/architecture.md#Project-Structure]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

glm-4.6

### Debug Log References

### Completion Notes List

### File List