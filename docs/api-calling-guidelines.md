# API 调用规范指南

**版本**: 1.0
**创建日期**: 2025-11-24
**状态**: 强制执行

---

## 🔴 强制要求：统一 API 请求管理

### 核心原则

**严禁直接在 Vue 组件或 Composables 中调用后端 API！** 所有 API 请求必须通过 Pinia Store 方法进行，并使用 `getApiFetch()` 工具函数确保统一的认证头处理。

### ❌ 禁止的代码模式

```typescript
// 错误示例 1: 在组件中直接使用 $fetch
const response = await $fetch('/api/v1/reservations/availability', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
    // ❌ 缺少统一的认证头处理
  },
  body: { roomIds, startTime, endTime }
})

// 错误示例 2: 在组件中直接使用 useFetch
const { data, error } = await useFetch('/api/v1/rooms')

// 错误示例 3: 在 Composables 中直接调用 API
export function useMyComposable() {
  const fetchData = async () => {
    // ❌ 严禁！
    return await $fetch('/api/v1/some-endpoint')
  }
}
```

### ✅ 正确的代码模式

#### 1. Store 层实现

```typescript
// app/stores/reservations.ts
export const useReservationStore = defineStore('reservations', {
  state: () => ({
    reservations: [],
    loading: false,
    error: null
  }),

  actions: {
    // ✅ 正确：使用 getApiFetch
    async checkRoomAvailability(roomIds: string[], startTime: string, endTime: string) {
      const apiFetch = getApiFetch()
      return await apiFetch('/api/v1/reservations/availability', {
        method: 'POST',
        body: { roomIds, startTime, endTime }
      })
    },

    async getReservationById(reservationId: string) {
      const apiFetch = getApiFetch()
      return await apiFetch(`/api/v1/reservations/${reservationId}`)
    },

    async createReservation(data: any) {
      const apiFetch = getApiFetch()
      return await apiFetch('/api/v1/reservations', {
        method: 'POST',
        body: data
      })
    }
  }
})

// 🔴 强制要求的 getApiFetch 实现
function getApiFetch() {
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

#### 2. Composables 层实现

```typescript
// app/composables/useReservations.ts
export function useReservations() {
  const reservationStore = useReservationStore()

  // ✅ 正确：Composables 作为 Store 方法的代理
  const checkAvailability = async (roomIds: string[], startTime: string, endTime: string) => {
    return await reservationStore.checkRoomAvailability(roomIds, startTime, endTime)
  }

  const getReservation = async (reservationId: string) => {
    return await reservationStore.getReservationById(reservationId)
  }

  const createReservation = async (data: any) => {
    return await reservationStore.createReservation(data)
  }

  return {
    // 状态
    loading: computed(() => reservationStore.loading),
    error: computed(() => reservationStore.error),
    reservations: computed(() => reservationStore.reservations),

    // 方法 - 仅代理 Store 方法
    checkAvailability,
    getReservation,
    createReservation
  }
}
```

#### 3. 组件层实现

```vue
<template>
  <div>
    <!-- 组件模板 -->
  </div>
</template>

<script setup lang="ts">
// ✅ 正确：通过 Composables 访问 Store
const { checkAvailability, createReservation, loading } = useReservations()

const handleSubmit = async (formData: any) => {
  try {
    // ✅ 正确：通过 Store 方法调用 API
    await createReservation(formData)
  } catch (error) {
    console.error('创建预约失败:', error)
  }
}

const checkRoomAvailability = async () => {
  try {
    // ✅ 正确：通过 Store 方法调用 API
    const availability = await checkAvailability(['room1'], startTime, endTime)
    console.log('可用性结果:', availability)
  } catch (error) {
    console.error('检查可用性失败:', error)
  }
}
</script>
```

---

## 🏗️ 架构分层原则

### 数据流向

```
组件 (Vue Component)
    ↓ (通过 Composables)
Composables (Proxy Layer)
    ↓ (调用 Store 方法)
Pinia Store (Business Logic)
    ↓ (使用 getApiFetch)
API Service (getApiFetch)
    ↓ (自动添加认证头)
后端 API (Nuxt Server)
```

### 各层职责

#### 1. 组件层 (Component Layer)
- **职责**: UI 展示和用户交互
- **禁止**: 直接调用 API
- **允许**: 调用 Composables 方法

#### 2. Composables 层 (Composables Layer)
- **职责**: Store 方法的代理和组合
- **禁止**: 直接调用 API 或获取 token
- **允许**: 调用 Store 方法，组合多个 Store

#### 3. Store 层 (Store Layer)
- **职责**: 业务逻辑和状态管理
- **强制**: 使用 `getApiFetch()` 调用 API
- **禁止**: 直接使用 `$fetch` 或 `useFetch`

#### 4. API Service 层 (API Service Layer)
- **职责**: 统一的 HTTP 请求处理
- **强制**: 自动添加认证头
- **处理**: 错误处理、token 刷新等

---

## 📋 检查清单

### 代码审查检查点

在代码审查时，必须检查以下项目：

#### ✅ 正确的代码
- [ ] 组件只通过 Composables 调用 Store 方法
- [ ] Composables 只代理 Store 方法，不直接调用 API
- [ ] Store 方法使用 `getApiFetch()` 进行 API 调用
- [ ] `getApiFetch()` 自动添加 Authorization header
- [ ] 没有直接使用 `$fetch` 或 `useFetch` 的代码

#### ❌ 错误的代码
- [ ] 组件中直接使用 `$fetch` 或 `useFetch`
- [ ] Composables 中直接调用 API
- [ ] Store 方法中直接使用 `$fetch` 而不是 `getApiFetch`
- [ ] 手动构造 Authorization header（应由 getApiFetch 自动处理）

### ESLint 规则建议

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name=/$fetch/]",
        "message": "禁止直接使用 $fetch，请通过 store 方法调用 API"
      },
      {
        "selector": "CallExpression[callee.name=/useFetch/]",
        "message": "禁止直接使用 useFetch，请通过 store 方法调用 API"
      }
    ]
  }
}
```

---

## 🔧 开发工具和脚本

### 自动化检查脚本

创建 `scripts/check-api-calls.js`：

```javascript
// 检查是否有非法的 API 调用
const fs = require('fs')
const path = require('path')

const forbiddenPatterns = [
  /\$fetch\(/g,
  /useFetch\(/g
]

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const errors = []

  forbiddenPatterns.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) {
      errors.push(`发现非法 API 调用: ${matches.length} 处`)
    }
  })

  return errors
}

function checkDirectory(dirPath) {
  const files = fs.readdirSync(dirPath, { withFileTypes: true })
  const results = []

  files.forEach(file => {
    const fullPath = path.join(dirPath, file.name)

    if (file.isDirectory() && (file.name === 'components' || file.name === 'pages')) {
      results.push(...checkDirectory(fullPath))
    } else if (file.isFile() && file.name.endsWith('.vue') || file.name.endsWith('.ts')) {
      const errors = checkFile(fullPath)
      if (errors.length > 0) {
        results.push({ file: fullPath, errors })
      }
    }
  })

  return results
}

const results = checkDirectory('./app')
if (results.length > 0) {
  console.error('❌ 发现非法 API 调用:')
  results.forEach(({ file, errors }) => {
    console.log(`${file}:`)
    errors.forEach(error => console.log(`  - ${error}`))
  })
  process.exit(1)
} else {
  console.log('✅ API 调用检查通过')
}
```

---

## 📚 学习资源

### 参考文档
- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue 3 Composables](https://vuejs.org/guide/extras/composition-api-faq.html)

### 最佳实践
- [Vue 3 Composition API Best Practices](https://vuejs.org/style-guide/)
- [Nuxt 3 Best Practices](https://nuxt.com/docs/getting-started/prerequisites)

---

## ⚠️ 违规后果

### 开发阶段
1. **代码审查失败**: 任何违反此规范的代码都将被拒绝合并
2. **自动化检查失败**: CI/CD 流程中的检查脚本会标记违规代码
3. **技术债务**: 违规代码将被标记为技术债务，需要立即修复

### 运行阶段
1. **认证失败**: 缺少认证头导致 API 调用失败
2. **安全漏洞**: 不一致的认证处理可能导致安全风险
3. **维护困难**: 不统一的 API 调用模式增加维护成本

---

## 📞 支持和联系

如有疑问或需要帮助，请联系：
- **架构师**: Winston
- **技术负责人**: [待指定]
- **代码审查团队**: [待指定]

---

**最后更新**: 2025-11-24
**下次审查**: 2025-12-24