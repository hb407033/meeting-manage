# Sprint 变更提案: API 请求统一管理

**生成日期**: 2025-11-24
**变更触发器**: 实施 API 请求 Token 统一管理需求
**影响范围**: Epic 1, Epic 3, Epic 7
**优先级**: 高 (安全性和架构一致性)

---

## 1. 问题总结

### 1.1 核心问题描述

在项目实施过程中发现代码中存在违反架构原则的直接 API 调用，这些调用：

1. **缺少认证 headers**: 直接使用 `$fetch` 调用后端 API，没有添加 `Authorization` 头
2. **违反架构原则**: 架构文档明确规定"前端页面调用API都采用组合式函数封装，状态管理采用 Pinia，不直接在组件中调用 Server 中的 API"
3. **存在安全风险**: 缺少统一的 token 管理可能导致认证失败或安全漏洞

### 1.2 发现的具体问题位置

**存在问题的文件**:
- `app/pages/reservations/create.vue:71` - 直接调用可用性检查 API
- `app/pages/admin/rooms/[id]/edit.vue` - 多个直接 API 调用
- `app/pages/admin/audit.vue` - 直接调用审计日志 API
- `app/pages/reservations/detailed.vue` - 直接调用预约详情 API

**问题代码示例**:
```typescript
// 当前问题代码 - 缺少认证头
const response = await $fetch('/api/v1/reservations/availability', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
    // 缺少 Authorization header!
  },
  body: { roomIds, startTime, endTime }
})
```

---

## 2. 影响分析

### 2.1 Epic 影响

**Epic 1: 基础设施与用户认证**
- **影响**: 需要加强 API 请求统一管理工具
- **变更类型**: 增强现有认证基础设施

**Epic 3: 预约系统核心**
- **影响**: Story 3.2 (快速预约), Story 3.3 (详细预约), Story 3.4 (冲突检测)
- **变更类型**: 修正 API 调用方式，确保认证一致性

**Epic 7: 系统配置与管理**
- **影响**: 管理后台功能的 API 调用
- **变更类型**: 统一管理后台的 API 请求方式

### 2.2 工件冲突分析

**架构文档冲突**:
- 架构文档第420行明确要求通过 store 和 composables 封装 API 调用
- 当前实现存在多处直接 API 调用，违反架构原则
- 需要修正代码以符合已定义的架构模式

### 2.3 技术影响

**安全影响**:
- 高: 缺少统一的认证 token 处理存在安全风险
- 可能导致未授权访问或 API 调用失败

**维护性影响**:
- 中: 代码不一致导致维护困难
- 需要统一 API 调用模式以便后续维护

### 2.4 违规代码检查结果

**🔴 严重违规发现**: 通过自动化检查脚本发现150个违规API调用，分布在33个文件中

**违规统计**:
- **页面文件**: 5个文件，9个违规调用
- **组件文件**: 22个文件，77个违规调用
- **Composables文件**: 6个文件，64个违规调用

**主要违规文件**:
- `app/pages/reservations/create.vue` - 直接调用可用性检查API
- `app/pages/admin/audit.vue` - 多个直接API调用
- `app/composables/useAuth.ts` - 认证相关直接API调用
- `app/composables/useNotifications.ts` - 通知相关直接API调用

**检查命令**: `npm run check-api-calls`

---

## 3. 推荐解决方案

### 3.1 选择方案: 直接调整 (选项1)

**选择理由**:
- 问题明确且影响范围有限
- 可以通过修改现有代码快速解决
- 不需要回滚或重新设计

### 3.2 详细解决方案

#### 解决方案 1: 创建统一 API 工具函数

**实施步骤**:
1. 创建 `server/utils/api-fetch.ts` 统一的 API 工具
2. 扩展现有的 `getApiFetch` 函数到所有 store
3. 修改问题文件中的直接 API 调用

**新增工具函数**:
```typescript
// server/utils/api-fetch.ts
export function createApiFetch() {
  return async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // 自动添加认证头
    const event = useEvent()
    const token = getCookie(event, 'auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return await $fetch(url, {
      ...options,
      headers
    })
  }
}
```

#### 解决方案 2: Store 方法增强

**需要增强的 store 方法**:

**app/stores/reservations.ts 添加**:
```typescript
async checkRoomAvailability(roomIds: string[], startTime: string, endTime: string) {
  const apiFetch = getApiFetch()
  return await apiFetch('/api/v1/reservations/availability', {
    method: 'POST',
    body: { roomIds, startTime, endTime }
  })
}

async getReservationById(reservationId: string) {
  const apiFetch = getApiFetch()
  return await apiFetch(`/api/v1/reservations/${reservationId}`)
}

async updateReservation(reservationId: string, data: any) {
  const apiFetch = getApiFetch()
  return await apiFetch(`/api/v1/reservations/${reservationId}`, {
    method: 'PUT',
    body: data
  })
}
```

**app/stores/rooms.ts 添加**:
```typescript
async getRoomById(roomId: string) {
  const apiFetch = getApiFetch()
  return await apiFetch(`/api/v1/rooms/${roomId}`)
}

async getRoomHistory(roomId: string) {
  const apiFetch = getApiFetch()
  return await apiFetch(`/api/v1/rooms/${roomId}/history`)
}

async updateRoom(roomId: string, data: any) {
  const apiFetch = getApiFetch()
  return await apiFetch(`/api/v1/rooms/${roomId}`, {
    method: 'PUT',
    body: data
  })
}
```

**创建新的 admin store**:
```typescript
// app/stores/admin.ts
import { defineStore } from 'pinia'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    auditLogs: [],
    alerts: []
  }),

  actions: {
    async getAuditLogs(params: any = {}) {
      const apiFetch = getApiFetch()
      return await apiFetch('/api/v1/admin/audit-logs', {
        method: 'GET',
        query: params
      })
    },

    async getAlerts() {
      const apiFetch = getApiFetch()
      return await apiFetch('/api/v1/admin/alerts')
    },

    async exportAuditLogs(params: any = {}) {
      const apiFetch = getApiFetch()
      return await apiFetch('/api/v1/admin/audit-logs/export', {
        method: 'POST',
        body: params
      })
    }
  }
})
```

#### 解决方案 3: 页面文件修改

**需要修改的具体文件**:

**app/pages/reservations/create.vue**:
```typescript
// 修改前:
const response = await $fetch('/api/v1/reservations/availability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { roomIds, startTime, endTime }
})

// 修改后:
const response = await reservationStore.checkRoomAvailability([roomId], startTime, endTime)
```

**app/pages/admin/rooms/[id]/edit.vue**:
```typescript
// 修改前:
const response = await $fetch(`/api/v1/rooms/${roomId}`)

// 修改后:
const roomData = await roomStore.getRoomById(roomId)
```

**app/pages/admin/audit.vue**:
```typescript
// 修改前:
const response = await $fetch('/api/v1/admin/audit-logs/export', {...})

// 修改后:
const response = await adminStore.exportAuditLogs(exportData)
```

---

## 4. 实施计划

### 4.1 变更范围分类

**变更级别**: Minor - 可以直接由开发团队实施

**工作量估算** (基于实际违规代码检查结果):
- 创建统一 API 工具: 4 小时
- 创建 admin store 和扩展其他 store: 12 小时
- 修改 33个违规文件 (150个违规调用): 24 小时
- 创建 composables 代理方法: 8 小时
- 测试和验证: 6 小时
- **总计**: 54 小时 (约7个工作日)

**影响范围**:
- 需要修改 33 个文件
- 涉及 150 个违规 API 调用
- 主要集中在管理后台和预约系统

### 4.2 实施步骤

1. **步骤1**: 创建 `server/utils/api-fetch.ts` 统一工具
2. **步骤2**: 扩展 `app/stores/reservations.ts` 和 `app/stores/rooms.ts`
3. **步骤3**: 创建 `app/stores/admin.ts`
4. **步骤4**: 修改问题页面文件中的 API 调用
5. **步骤5**: 添加单元测试确保 API 调用正确
6. **步骤6**: 集成测试验证认证流程

### 4.3 风险评估

**低风险变更**:
- 不涉及数据模型变更
- 不影响现有业务逻辑
- 仅改变 API 调用方式

**缓解措施**:
- 逐步实施，每次修改一个文件
- 充分测试确保功能正常
- 保留原有代码作为备份

---

## 5. 成功标准

### 5.1 技术标准

✅ 所有前端 API 调用都通过 store 方法进行
✅ 所有 API 请求自动包含正确的 Authorization headers
✅ 代码符合架构文档定义的原则
✅ 现有功能保持不变，确保向后兼容

### 5.2 安全标准

✅ 消除所有缺少认证头的 API 调用
✅ Token 自动刷新机制正常工作
✅ 认证失败时正确处理错误

### 5.3 代码质量标准

✅ 代码通过 ESLint 检查
✅ 单元测试覆盖新增的 store 方法
✅ 集成测试验证 API 调用流程

---

## 6. 实施交接

### 6.1 责任分配

**开发团队责任**:
- 实施所有代码变更
- 执行单元测试和集成测试
- 验证功能正常性

**代码审查**:
- 架构师负责审查代码符合性
- 安全负责人负责审查认证实现

### 6.2 时间线

**第1天**: 创建工具函数和 store 增强
**第2天**: 修改页面文件，实施主要变更
**第3天**: 测试、验证和部署准备

### 6.3 验收标准

**功能验收**:
- 所有现有功能正常工作
- 认证流程无缝运行
- 无 console 错误

**代码验收**:
- 代码符合项目编码规范
- 通过所有自动化测试
- 架构原则得到遵循

---

## 7. 结论

这个变更提案解决了一个重要的架构一致性和安全性问题。通过统一 API 请求管理，我们将：

1. **提升安全性** - 确保所有 API 请求包含正确的认证信息
2. **改善架构一致性** - 使代码符合已定义的架构原则
3. **简化维护** - 统一的 API 调用模式更易维护和扩展
4. **降低风险** - 防止因缺少认证导致的功能故障

建议立即实施此变更，以确保系统的安全性和架构一致性。

---

**提案人**: Winston (架构师)
**日期**: 2025-11-24
**状态**: 待审批
**审批**: [ ] 产品经理 [ ] 技术负责人 [ ] 安全负责人