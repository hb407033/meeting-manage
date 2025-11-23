<template>
  <div class="room-history-view">
    <div v-if="isLoading" class="text-center py-8">
      <ProgressSpinner />
      <p class="mt-4 text-gray-600">加载操作历史...</p>
    </div>

    <div v-else-if="history.length === 0" class="text-center py-8 text-gray-500">
      <i class="pi pi-history text-4xl mb-4"></i>
      <p>暂无操作历史记录</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="item in history"
        :key="item.id"
        class="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
      >
        <!-- 操作图标 -->
        <div class="flex-shrink-0">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :class="getActionIconClass(item.action)"
          >
            <i :class="getActionIcon(item.action)"></i>
          </div>
        </div>

        <!-- 操作信息 -->
        <div class="flex-grow min-w-0">
          <div class="flex items-center justify-between mb-1">
            <h4 class="text-sm font-medium text-gray-900">
              {{ getActionLabel(item.action) }}
            </h4>
            <span class="text-xs text-gray-500">
              {{ formatDate(item.timestamp) }}
            </span>
          </div>

          <!-- 操作描述 -->
          <p v-if="getActionDescription(item)" class="text-sm text-gray-600 mb-2">
            {{ getActionDescription(item) }}
          </p>

          <!-- 变更详情 -->
          <div v-if="showChangeDetails(item)" class="bg-gray-50 rounded-md p-3">
            <div class="text-xs font-medium text-gray-700 mb-2">变更详情:</div>
            <div class="space-y-1">
              <div v-if="item.field" class="flex items-center gap-2 text-xs">
                <span class="font-medium text-gray-600">字段:</span>
                <span class="text-gray-800">{{ getFieldLabel(item.field) }}</span>
              </div>
              <div v-if="item.oldValue !== null && item.oldValue !== undefined" class="text-xs">
                <span class="font-medium text-red-600">原值:</span>
                <span class="text-gray-700 ml-1">{{ formatValue(item.oldValue) }}</span>
              </div>
              <div v-if="item.newValue !== null && item.newValue !== undefined" class="text-xs">
                <span class="font-medium text-green-600">新值:</span>
                <span class="text-gray-700 ml-1">{{ formatValue(item.newValue) }}</span>
              </div>
            </div>
          </div>

          <!-- 操作人员信息 -->
          <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span v-if="item.user" class="flex items-center gap-1">
              <i class="pi pi-user"></i>
              {{ item.user.name || item.user.email }}
            </span>
            <span v-if="item.ipAddress" class="flex items-center gap-1">
              <i class="pi pi-globe"></i>
              {{ item.ipAddress }}
            </span>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="text-center">
        <Button
          label="加载更多"
          icon="pi pi-arrow-down"
          @click="loadMore"
          :loading="isLoadingMore"
          class="p-button-outlined p-button-sm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface HistoryItem {
  id: string
  action: string
  field?: string
  oldValue?: any
  newValue?: any
  user?: {
    id: string
    name?: string
    email: string
  }
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

interface Props {
  roomId: string
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20
})

// 响应式数据
const history = ref<HistoryItem[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const currentPage = ref(0)
const hasMore = ref(true)

// 方法
const loadHistory = async (page: number = 0, append: boolean = false) => {
  try {
    const params = {
      roomId: props.roomId,
      page,
      pageSize: props.pageSize
    }

    const { useRoomsStore } = await import('~/stores/rooms')
    const roomsStore = useRoomsStore()

    const response = await roomsStore.getRoomHistory(props.roomId, {
      startDate,
      endDate,
      page,
      pageSize: props.pageSize
    })

    if (append) {
      history.value.push(...response.history)
    } else {
      history.value = response.history
    }

    hasMore.value = response.hasMore
    currentPage.value = page
  } catch (error) {
    console.error('加载操作历史失败:', error)
    useToast().add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载操作历史',
      life: 3000
    })
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const loadMore = () => {
  if (!isLoadingMore.value && hasMore.value) {
    isLoadingMore.value = true
    loadHistory(currentPage.value + 1, true)
  }
}

const getActionLabel = (action: string): string => {
  const actionLabels: Record<string, string> = {
    'CREATE': '创建会议室',
    'UPDATE': '更新信息',
    'DELETE': '删除会议室',
    'STATUS_CHANGE': '状态变更',
    'BATCH_IMPORT': '批量导入',
    'BATCH_EXPORT': '批量导出'
  }
  return actionLabels[action] || action
}

const getActionIcon = (action: string): string => {
  const actionIcons: Record<string, string> = {
    'CREATE': 'pi pi-plus',
    'UPDATE': 'pi pi-pencil',
    'DELETE': 'pi pi-trash',
    'STATUS_CHANGE': 'pi pi-refresh',
    'BATCH_IMPORT': 'pi pi-upload',
    'BATCH_EXPORT': 'pi pi-download'
  }
  return actionIcons[action] || 'pi pi-info-circle'
}

const getActionIconClass = (action: string): string => {
  const actionClasses: Record<string, string> = {
    'CREATE': 'bg-green-100 text-green-600',
    'UPDATE': 'bg-blue-100 text-blue-600',
    'DELETE': 'bg-red-100 text-red-600',
    'STATUS_CHANGE': 'bg-orange-100 text-orange-600',
    'BATCH_IMPORT': 'bg-purple-100 text-purple-600',
    'BATCH_EXPORT': 'bg-indigo-100 text-indigo-600'
  }
  return actionClasses[action] || 'bg-gray-100 text-gray-600'
}

const getFieldLabel = (field: string): string => {
  const fieldLabels: Record<string, string> = {
    'name': '会议室名称',
    'description': '描述',
    'capacity': '容量',
    'location': '位置',
    'status': '状态',
    'equipment': '设备配置',
    'images': '图片',
    'rules': '预约规则',
    'requiresApproval': '是否需要审批'
  }
  return fieldLabels[field] || field
}

const getActionDescription = (item: HistoryItem): string => {
  if (item.action === 'BATCH_IMPORT') {
    return `批量导入了 ${item.newValue?.importedCount || 0} 个会议室`
  }

  if (item.action === 'BATCH_EXPORT') {
    return `批量导出了 ${item.newValue?.exportCount || 0} 个会议室`
  }

  if (item.action === 'DELETE') {
    return `删除了会议室 ${item.newValue?.roomName || ''}`
  }

  if (item.field) {
    return `修改了${getFieldLabel(item.field)}`
  }

  return ''
}

const showChangeDetails = (item: HistoryItem): boolean => {
  if (item.action === 'BATCH_IMPORT' || item.action === 'BATCH_EXPORT' || item.action === 'DELETE') {
    return false
  }
  return item.field || (item.oldValue !== undefined && item.newValue !== undefined)
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '空'
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return '[对象]'
    }
  }

  return String(value)
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟显示"刚刚"
  if (diff < 60000) {
    return '刚刚'
  }

  // 小于1小时显示分钟数
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }

  // 小于1天显示小时数
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }

  // 小于7天显示天数
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }

  // 超过7天显示具体日期
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  loadHistory()
})

// 监听roomId变化
watch(() => props.roomId, () => {
  history.value = []
  currentPage.value = 0
  hasMore.value = true
  isLoading.value = true
  loadHistory()
})
</script>

<style scoped>
.room-history-view {
  max-width: 100%;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.flex {
  display: flex;
}

.items-start {
  align-items: flex-start;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.justify-center {
  justify-content: center;
}

.gap-1 {
  gap: 0.25rem;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.flex-grow {
  flex-grow: 1;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.min-w-0 {
  min-width: 0;
}

.w-10 {
  width: 2.5rem;
}

.h-10 {
  height: 2.5rem;
}

.rounded-full {
  border-radius: 9999px;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.rounded-md {
  border-radius: 0.375rem;
}

.border {
  border-width: 1px;
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.bg-white {
  background-color: white;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.bg-green-100 {
  background-color: #dcfce7;
}

.bg-blue-100 {
  background-color: #dbeafe;
}

.bg-red-100 {
  background-color: #fee2e2;
}

.bg-orange-100 {
  background-color: #fed7aa;
}

.bg-purple-100 {
  background-color: #f3e8ff;
}

.bg-indigo-100 {
  background-color: #e0e7ff;
}

.bg-gray-100 {
  background-color: #f3f4f6;
}

.text-green-600 {
  color: #059669;
}

.text-blue-600 {
  color: #2563eb;
}

.text-red-600 {
  color: #dc2626;
}

.text-orange-600 {
  color: #ea580c;
}

.text-purple-600 {
  color: #9333ea;
}

.text-indigo-600 {
  color: #4f46e5;
}

.text-gray-600 {
  color: #4b5563;
}

.text-gray-700 {
  color: #374151;
}

.text-gray-800 {
  color: #1f2937;
}

.text-gray-900 {
  color: #111827;
}

.text-gray-500 {
  color: #6b7280;
}

.text-xs {
  font-size: 0.75rem;
}

.text-sm {
  font-size: 0.875rem;
}

.font-medium {
  font-weight: 500;
}

.text-center {
  text-align: center;
}

.mt-1 {
  margin-top: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.ml-1 {
  margin-left: 0.25rem;
}

.py-3 {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.p-3 {
  padding: 0.75rem;
}

.p-4 {
  padding: 1rem;
}

.space-y-1 > * + * {
  margin-top: 0.25rem;
}

.transition-shadow {
  transition-property: box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.hover\:shadow-md:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

:deep(.p-progress-spinner) {
  width: 2rem;
  height: 2rem;
}

:deep(.p-button-outlined.p-button-sm) {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
}
</style>