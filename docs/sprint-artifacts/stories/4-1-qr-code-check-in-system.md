# Story 4.1: 二维码签到系统

Status: drafted

## Story

As a 会议参会者,
I want 通过扫描二维码进行会议室签到,
So that 快速便捷地确认参会身份，记录会议出席情况.

## Acceptance Criteria

1. 动态二维码生成：每个预约生成唯一的二维码，包含时间、位置验证信息
2. 二维码安全设计：防止截图、转发等安全风险
3. 多种扫描方式：手机摄像头、扫码枪、移动应用内扫码
4. 签到验证机制：验证时间窗口、地理位置、用户身份
5. 签到记录管理：记录签到时间、用户信息、设备信息
6. 签到状态更新：自动更新预约状态为"进行中"
7. 签到失败处理：无效二维码、过期时间、位置不符的处理

## Tasks / Subtasks

- [ ] Task 1: 二维码生成与安全机制 (AC: 1, 2)
  - [ ] Subtask 1.1: 集成qrcode.js库，实现动态二维码生成
  - [ ] Subtask 1.2: 设计安全令牌机制，包含加密时间戳和位置验证
  - [ ] Subtask 1.3: 实现二维码有效期控制（5分钟有效期）
  - [ ] Subtask 1.4: 添加防截图重用保护机制
  - [ ] Subtask 1.5: 创建二维码API端点 /api/v1/checkin/qr/generate

- [ ] Task 2: 多种扫描方式支持 (AC: 3)
  - [ ] Subtask 2.1: 集成手机摄像头扫码功能（HTML5 Camera API）
  - [ ] Subtask 2.2: 支持扫码枪设备输入（键盘事件监听）
  - [ ] Subtask 2.3: 实现移动应用内扫码（前端相机组件）
  - [ ] Subtask 2.4: 创建CheckInScanner.vue扫描组件
  - [ ] Subtask 2.5: 添加扫描结果解析和验证逻辑

- [ ] Task 3: 签到验证与安全控制 (AC: 4, 7)
  - [ ] Subtask 3.1: 实现时间窗口验证（会议开始前30分钟到结束后30分钟）
  - [ ] Subtask 3.2: 集成浏览器地理位置API验证会议室范围
  - [ ] Subtask 3.3: 创建用户身份验证机制
  - [ ] Subtask 3.4: 实现预约状态实时验证
  - [ ] Subtask 3.5: 添加签到失败原因分类和提示
  - [ ] Subtask 3.6: 创建 /api/v1/checkin/qr/validate 验证接口

- [ ] Task 4: 签到记录与数据管理 (AC: 5)
  - [ ] Subtask 4.1: 扩展Prisma schema，创建CheckIn数据模型
  - [ ] Subtask 4.2: 实现签到记录API端点 /api/v1/checkin/record
  - [ ] Subtask 4.3: 添加设备信息采集（浏览器信息、IP地址等）
  - [ ] Subtask 4.4: 实现签到历史查询功能
  - [ ] Subtask 4.5: 创建签到统计和报告功能

- [ ] Task 5: 预约状态自动更新 (AC: 6)
  - [ ] Subtask 5.1: 实现签到后预约状态自动更新为"进行中"
  - [ ] Subtask 5.2: 添加状态变更事件通知机制
  - [ ] Subtask 5.3: 集成WebSocket实时状态同步
  - [ ] Subtask 5.4: 实现状态变更审计日志记录
  - [ ] Subtask 5.5: 处理多人签到和主持人优先级逻辑

- [ ] Task 6: 前端签到界面与组件 (AC: 3, 5)
  - [ ] Subtask 6.1: 创建QRCodeDisplay.vue动态二维码显示组件
  - [ ] Subtask 6.2: 实现CheckInScanner.vue二维码扫描组件
  - [ ] Subtask 6.3: 设计LocationVerification.vue地理位置验证组件
  - [ ] Subtask 6.4: 建立CheckInSuccess.vue签到成功反馈组件
  - [ ] Subtask 6.5: 创建CheckInHistory.vue签到历史查看组件
  - [ ] Subtask 6.6: 实现MobileCheckIn.vue移动端签到界面
  - [ ] Subtask 6.7: 添加CheckInTutorial.vue签到操作教程组件

- [ ] Task 7: 签到统计与分析面板 (AC: 5)
  - [ ] Subtask 7.1: 创建CheckInStats.vue签到统计面板
  - [ ] Subtask 7.2: 实现实时签到监控功能
  - [ ] Subtask 7.3: 添加出席率统计和趋势分析
  - [ ] Subtask 7.4: 创建签到异常检测和报警功能
  - [ ] Subtask 7.5: 实现签到数据导出功能（Excel、CSV）

- [ ] Task 8: 测试与质量保证 (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] Subtask 8.1: 编写二维码生成和安全机制单元测试
  - [ ] Subtask 8.2: 创建签到验证逻辑集成测试
  - [ ] Subtask 8.3: 开发前端组件交互测试
  - [ ] Subtask 8.4: 实现性能测试，确保高并发签到场景
  - [ ] Subtask 8.5: 进行安全性测试，验证防截图和防重用机制
  - [ ] Subtask 8.6: 测试不同设备和浏览器的兼容性

## Dev Notes

### 项目结构对齐

基于统一项目结构和现有架构模式：

- **数据模型**: 扩展现有Prisma schema，在预约系统基础上添加CheckIn模型
- **API端点**: 遵循RESTful规范，使用`/server/api/v1/checkin/`路径
- **前端组件**: 集成到现有`/app/components/features/`结构，创建checkin子目录
- **权限控制**: 复用现有RBAC系统，添加签到相关权限项
- **状态管理**: 扩展Pinia stores，添加checkin状态管理

### 架构模式

- **服务层**: 创建`CheckInService`，遵循现有服务层设计模式
- **安全机制**: 复用现有JWT认证，添加QR码专属验证逻辑
- **缓存策略**: 利用Redis缓存签到状态和二维码数据
- **错误处理**: 遵循统一API响应格式，保持系统一致性

### 安全考虑

- **二维码安全**: 包含临时token、时间戳、位置验证的加密数据
- **地理位置验证**: 使用浏览器地理位置API确保在会议室范围内
- **防重用机制**: 二维码一次性使用，签到后立即失效
- **时间窗口控制**: 严格的时间验证，防止提前或迟到签到
- **设备指纹**: 记录设备信息，辅助安全验证

### 性能优化

- **二维码生成**: 服务端生成，减少客户端计算负担
- **缓存机制**: 二维码数据缓存，提高响应速度
- **并发处理**: 支持多人同时签到，避免性能瓶颈
- **数据库优化**: 为签到查询添加适当索引

### 用户体验设计

- **响应式设计**: 支持桌面端和移动端签到体验
- **操作引导**: 提供清晰的签到操作教程和提示
- **实时反馈**: 签到成功/失败的即时反馈
- **历史记录**: 便捷的签到历史查看功能

### Learnings from Previous Story

**From Story 3.5 (Status: review)**

- **新服务创建**: `NotificationService` 已在 `server/services/notification-service.ts` 中实现，通知系统完整可用 - 可用于签到成功/失败通知
- **架构模式**: 复用现有API响应格式和错误处理机制，确保系统一致性
- **数据模型扩展**: Prisma schema 扩展模式已验证，可安全添加新的CheckIn模型
- **前端组件**: 遵循现有组件结构和命名规范，集成PrimeVue组件库
- **权限系统**: RBAC权限系统完善，可添加签到相关权限项
- **缓存策略**: Redis缓存系统已就绪，可用于二维码数据缓存
- **测试模式**: 遵循现有测试结构和命名约定

**Technical Debt to Address:**
- 签到系统需要考虑离线场景的处理机制
- 需要优化大量并发签到的性能处理
- 考虑与其他签到方式（人脸识别）的集成接口设计

### References

[Source: docs/epics.md#Epic-4-Story-41] - 二维码签到系统需求和验收标准
[Source: docs/architecture.md#Data-Model] - 现有数据模型和安全架构模式
[Source: docs/sprint-artifacts/stories/3-5-recurring-reservation-management.md] - 通知服务和权限系统集成参考
[Source: docs/architecture.md#Security-Considerations] - JWT认证和安全机制实现参考

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List