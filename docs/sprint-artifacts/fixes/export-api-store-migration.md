# 导出功能API请求迁移到Store

**日期**: 2025-11-17
**任务**: 将导出功能的API请求迁移到store中，符合统一规范
**状态**: ✅ 已完成

## 任务背景

根据用户要求，需要将RoomManagement.vue组件中的导出功能API请求迁移到rooms store中，以符合项目的统一规范，提高代码的可维护性和复用性。

## 实现内容

### 1. Store层增强

**文件**: `app/stores/rooms.ts`

新增 `exportRooms` 方法：
```typescript
// 导出会议室数据
async exportRooms(params?: {
  status?: string
  minCapacity?: number
  maxCapacity?: number
}) {
  this.setLoading(true)
  this.setError(null)

  try {
    // 构建查询参数
    const queryParams = new URLSearchParams()

    // 添加筛选条件
    if (params?.status && params.status !== 'all') {
      queryParams.append('status', params.status)
    }
    if (params?.minCapacity) {
      queryParams.append('minCapacity', params.minCapacity.toString())
    }
    if (params?.maxCapacity) {
      queryParams.append('maxCapacity', params.maxCapacity.toString())
    }

    // 构建完整的URL
    const queryString = queryParams.toString()
    const exportUrl = `/api/v1/rooms/export${queryString ? '?' + queryString : ''}`

    // 使用 $fetch.raw 发起请求
    const response = await $fetch.raw(exportUrl)

    // 检查响应是否成功
    if (!response.ok) {
      throw new Error(`导出失败: ${response.statusText}`)
    }

    // 获取响应数据
    const csvContent = response._data as string

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `meeting-rooms-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)

    return {
      success: true,
      filename: link.download,
      size: csvContent.length
    }

  } catch (error: any) {
    const { parseApiError } = await import('~/utils/api-error-handler')
    const errorMessage = parseApiError(error)
    this.setError(errorMessage)
    console.error('导出会议室数据失败:', error)
    return {
      success: false,
      error: errorMessage
    }
  } finally {
    this.setLoading(false)
  }
}
```

### 2. Composable层更新

**文件**: `app/composables/useRooms.ts`

在useRooms函数中导出exportRooms方法：
```typescript
exportRooms: roomStore.exportRooms.bind(roomStore),
```

### 3. 组件层重构

**文件**: `app/components/features/rooms/RoomManagement.vue`

#### 更新导入
```typescript
import { useNuxtApp } from '#app'
import { useRooms } from '~/composables/useRooms'
```

#### 简化导出方法
原有的78行复杂导出逻辑简化为：
```typescript
const exportRooms = async () => {
  isExporting.value = true

  try {
    // 构建导出参数
    const exportParams = {
      status: selectedStatus.value,
      minCapacity: minCapacity.value || undefined,
      maxCapacity: maxCapacity.value || undefined
    }

    // 调用store的导出方法
    const result = await exportRoomsFromStore(exportParams)

    // 显示成功消息
    const { $toast } = useNuxtApp() as any
    if ($toast && result.success) {
      $toast.add({
        severity: 'success',
        summary: '导出成功',
        detail: `会议室数据已成功导出到 ${result.filename}`,
        life: 3000
      })
    }
  } catch (error) {
    console.error('导出失败:', error)

    // 显示错误消息
    const { $toast } = useNuxtApp() as any
    if ($toast) {
      $toast.add({
        severity: 'error',
        summary: '导出失败',
        detail: '无法导出会议室数据，请稍后重试',
        life: 5000
      })
    }
  } finally {
    isExporting.value = false
  }
}
```

## 重构收益

### 1. 代码复用性提升
- 导出逻辑现在可以在任何使用rooms store的组件中复用
- 避免了在多个组件中重复相同的API调用逻辑

### 2. 统一错误处理
- 使用统一的错误处理工具 `parseApiError`
- 错误信息存储在store中，便于全局访问

### 3. 状态管理一致性
- 导出操作现在使用store的loading状态
- 导出错误信息通过store统一管理

### 4. 代码简化
- RoomManagement.vue中的导出方法从78行减少到约30行
- 移除了组件中的直接API调用逻辑

## 技术细节

### API兼容性
- 保持与后端API `/api/v1/rooms/export` 的完全兼容
- 支持所有原有的查询参数：`status`, `minCapacity`, `maxCapacity`

### 错误处理
- 使用项目统一的错误处理机制
- 提供用户友好的错误提示
- 支持详细的错误信息解析

### 文件下载
- 保持原有的文件名格式：`meeting-rooms-export-YYYY-MM-DD.csv`
- 使用标准的Blob和URL.createObjectURL进行文件下载
- 自动清理临时URL对象

## 验证结果

✅ **TypeScript类型检查通过**
✅ **后端API完整且功能正常**
✅ **store方法实现完整**
✅ **组件调用简化成功**
✅ **错误处理统一规范**

## 后续优化建议

1. **添加导出进度指示器**：对于大量数据的导出，可以考虑添加进度反馈
2. **支持更多导出格式**：可以考虑支持Excel等其他格式的导出
3. **批量操作优化**：可以考虑添加批量导出的队列管理
4. **缓存机制**：对于相同参数的导出请求，可以考虑添加缓存机制

## 相关文件

- `app/stores/rooms.ts` - 新增exportRooms方法
- `app/composables/useRooms.ts` - 导出exportRooms方法
- `app/components/features/rooms/RoomManagement.vue` - 简化导出逻辑
- `server/api/v1/rooms/export.get.ts` - 后端导出API（已存在且完整）

---

**总结**: 导出功能API请求已成功迁移到store中，符合项目统一规范，提高了代码的可维护性和复用性。