# meeting-manage 项目文档索引

_创建时间: 2025-11-24_
_文档类型: discover_inputs 协议生成的项目索引_

## 文档分类

### Architecture (架构文档)
- **[docs/architecture.md](./architecture.md)** - 系统架构决策文档
  - 技术栈: Nuxt 4 + PrimeVue + FormKit + MySQL + Prisma
  - 统一API响应格式规范
  - 强制使用Pinia store进行状态管理
  - 项目结构完整说明

### Technical Specifications (技术规范)
- **[docs/sprint-artifacts/tech-spec-epic-1.md](./sprint-artifacts/tech-spec-epic-1.md)** - Epic 1 技术规范
  - 基础设施与用户认证技术要求
  - 权限系统性能要求: 权限验证<50ms，缓存TTL 30分钟
  - 安全架构设计
  - API设计标准

### UX Design (UX设计规范)
- **[docs/ux-design-specification.md](./ux-design-specification.md)** - UX设计规范
  - 设计系统: PrimeVue Styled Mode + Aura主题
  - 专业商务蓝色彩体系 (#1e40af)
  - 响应式设计策略
  - 组件库和交互模式决策

### Epics (史诗文档)
- **[docs/epics.md](./epics.md)** - 史诗分解文档
  - 7个史诗完整分解: 基础设施、会议室管理、预约系统、签到验证、设备集成、数据分析、系统管理
  - Epic 1: 基础设施与用户认证 - 包含权限管理架构
  - 功能需求完整映射和可追溯性

### Stories (故事文档)
- **[docs/sprint-artifacts/1-10-permission-driven-layout-refactor.md](./sprint-artifacts/1-10-permission-driven-layout-refactor.md)** - 权限驱动布局重构故事
  - Story 1.10: Permission-Driven Layout Refactor
  - 目标: 简化布局架构，实现基于权限的动态菜单加载
  - 验收标准: 统一布局、权限驱动菜单、性能优化

### Context Files (上下文文件)
- **[docs/sprint-artifacts/stories/1-10-permission-driven-layout-refactor.context.xml](./sprint-artifacts/stories/1-10-permission-driven-layout-refactor.context.xml)** - Story上下文XML
  - 包含完整的实现上下文
  - 代码依赖关系和接口定义
  - 约束条件和测试策略

### Project Management (项目管理)
- **[docs/PRD.md](./PRD.md)** - 产品需求文档
- **[docs/sprint-artifacts/sprint-status.yaml](./sprint-artifacts/sprint-status.yaml)** - 冲刺状态跟踪

## 优先加载文档 (针对权限驱动布局重构)

### 核心架构文档
1. **architecture.md** - 了解整体技术架构和布局系统
2. **tech-spec-epic-1.md** - 权限系统技术规范和性能要求
3. **ux-design-specification.md** - UI组件库和菜单设计模式

### 权限相关文档
1. **epics.md** - Epic 1权限管理架构设计
2. **1-10-permission-driven-layout-refactor.md** - 具体故事需求
3. **1-10-permission-driven-layout-refactor.context.xml** - 完整实现上下文

## discover_inputs 智能加载结果

基于权限驱动布局重构故事的需求，以下文档已按优先级智能加载：

### Architecture Type (已加载)
- ✅ **docs/architecture.md** - 提供Nuxt 4布局系统架构指导
- ✅ **docs/sprint-artifacts/tech-spec-epic-1.md** - 提供权限系统性能和安全要求

### Tech Spec Type (已加载)
- ✅ **docs/sprint-artifacts/tech-spec-epic-1.md** - Epic 1基础设施与用户认证技术规范

### UX Design Type (已加载)
- ✅ **docs/ux-design-specification.md** - PrimeVue组件库和菜单设计模式指导

### Epics Type (已加载)
- ✅ **docs/epics.md** - Epic 1权限管理架构和RBAC设计模式

### Document Project Type (已创建)
- ✅ **当前文档** - 项目文档索引，提供所有相关文档的快速访问

## 下一步建议

1. **实现优先级**: 根据加载的文档，权限驱动布局重构应按以下顺序进行：
   - 分析现有布局结构 (Task 1.1)
   - 设计双布局架构方案 (Task 1.2)
   - 创建UniversalHeader.vue组件 (Task 2.1)
   - 实现权限菜单系统 (Task 3)

2. **性能优化参考**: 参考tech-spec-epic-1.md中的权限缓存要求
3. **UX设计参考**: 遵循ux-design-specification.md中的组件库设计模式
4. **架构约束**: 遵循architecture.md中的技术栈和开发规范

---

_此索引文档由discover_inputs协议自动生成，为权限驱动布局重构故事提供完整的项目文档支持。_