<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRoute, useRouter } from 'vue-router'

// 导入store
import { useReservationStore } from '~/stores/reservations'
import { useAuthStore } from '~/stores/auth'

// 使用store
const reservationStore = useReservationStore()
const authStore = useAuthStore()

// 页面设置
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()

// 获取预约ID
const reservationId = computed(() => route.params.id as string)

// 当前预约
const currentReservation = computed(() => {
  if (!reservationId.value) return null

  // 首先从store中的数据查找
  const reservation = reservationStore.reservations.find(r => r.id === reservationId.value)
  if (reservation) return reservation

  // 如果store中没有，则使用当前预约
  return reservationStore.currentReservation
})

// 判断是否为详细预约
const isDetailedReservation = computed(() => {
  if (!currentReservation.value) return false

  return !!(
    currentReservation.value.equipment ||
    currentReservation.value.services ||
    currentReservation.value.attendeeList ||
    currentReservation.value.specialRequirements ||
    currentReservation.value.budgetAmount ||
    (currentReservation.value.importanceLevel && currentReservation.value.importanceLevel !== 'NORMAL') ||
    (currentReservation.value.meetingMaterials && currentReservation.value.meetingMaterials.length > 0)
  )
})

// 加载状态
const loading = computed(() => reservationStore.loading)

// 获取状态显示样式
function getStatusStyle(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return '已确认'
    case 'PENDING':
      return '待确认'
    case 'CANCELLED':
      return '已取消'
    case 'COMPLETED':
      return '已完成'
    default:
      return '未知状态'
  }
}

// 格式化时间
function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
}

function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'HH:mm', { locale: zhCN })
}

// 获取时长
function getDuration(startTime: string | Date, endTime: string | Date): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime
  const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60))
  const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60)) % 60
  if (hours > 0) {
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
  return `${minutes}分钟`
}

// 获取重要性级别文本
function getImportanceLevelText(level: string): string {
  switch (level) {
    case 'LOW': return '低'
    case 'NORMAL': return '普通'
    case 'HIGH': return '高'
    case 'URGENT': return '紧急'
    default: return '普通'
  }
}

// 检查是否可以编辑
const canEdit = computed(() => {
  if (!currentReservation.value || !authStore.user) return false

  // 只有组织者本人可以编辑
  const isOrganizer = currentReservation.value.organizerId === authStore.user.id ||
                     currentReservation.value.organizer?.email === authStore.user.email

  // 检查预约状态：只有未结束且未取消的预约可以编辑
  const now = new Date()
  const startTime = new Date(currentReservation.value.startTime)
  const endTime = new Date(currentReservation.value.endTime)

  // 预约已经结束（结束时间已过）
  const isEnded = endTime <= now

  // 预约还未开始
  const isUpcoming = startTime > now

  // 预约正在进行中
  const isOngoing = startTime <= now && endTime > now

  // 可编辑条件：组织者 + (未开始或正在进行中) + 未取消 + 未完成
  const canEditByStatus = !isEnded &&
                          currentReservation.value.status !== 'CANCELLED' &&
                          currentReservation.value.status !== 'COMPLETED'

  const statusReason = isEnded ? '预约已结束' :
                      (currentReservation.value.status === 'CANCELLED' ? '预约已取消' :
                       currentReservation.value.status === 'COMPLETED' ? '预约已完成' : '')

  return {
    canEdit: isOrganizer && canEditByStatus,
    reason: statusReason
  }
})

// 检查是否可以取消
const canCancel = computed(() => {
  if (!currentReservation.value || !authStore.user) return false

  // 只有组织者本人可以取消
  const isOrganizer = currentReservation.value.organizerId === authStore.user.id ||
                     currentReservation.value.organizer?.email === authStore.user.email

  // 检查预约状态：只有未开始且未结束的预约可以取消
  const now = new Date()
  const startTime = new Date(currentReservation.value.startTime)
  const endTime = new Date(currentReservation.value.endTime)

  // 预约已经结束（结束时间已过）
  const isEnded = endTime <= now

  // 预约还未开始
  const isUpcoming = startTime > now

  // 可取消条件：组织者 + 未开始 + 未取消 + 未完成
  const canCancelByStatus = isUpcoming &&
                           currentReservation.value.status !== 'CANCELLED' &&
                           currentReservation.value.status !== 'COMPLETED'

  const statusReason = !isUpcoming ? '预约已开始或已结束' :
                      (currentReservation.value.status === 'CANCELLED' ? '预约已取消' :
                       currentReservation.value.status === 'COMPLETED' ? '预约已完成' : '')

  return {
    canCancel: isOrganizer && canCancelByStatus,
    reason: statusReason
  }
})

// 检查预约是否已结束
const isReservationEnded = computed(() => {
  if (!currentReservation.value) return false

  const now = new Date()
  const endTime = new Date(currentReservation.value.endTime)
  return endTime <= now
})

// 获取操作限制提示信息
const getOperationRestrictionMessage = computed(() => {
  if (!currentReservation.value) return ''

  const status = currentReservation.value.status
  const isEnded = isReservationEnded.value

  if (status === 'COMPLETED') {
    return '✅ 此预约已完成，只能查看详情'
  }

  if (status === 'CANCELLED') {
    return '❌ 此预约已取消，只能查看详情'
  }

  if (isEnded) {
    return '⏰ 此预约已结束，只能查看详情'
  }

  return ''
})

// 编辑预约
function editReservation() {
  if (!currentReservation.value || !canEdit.value.canEdit) {
    // 显示不能编辑的原因
    if (canEdit.value.reason) {
      window.alert(`无法编辑预约：${canEdit.value.reason}`)
    }
    return
  }

  // 导航到编辑页面，或者使用编辑模式
  router.push(`/reservations/create?edit=${currentReservation.value.id}`)
}

// 取消预约
async function cancelReservation() {
  if (!currentReservation.value || !canCancel.value.canCancel) {
    // 显示不能取消的原因
    if (canCancel.value.reason) {
      window.alert(`无法取消预约：${canCancel.value.reason}`)
    }
    return
  }

  // TODO: 替换为更好的用户确认对话框组件
  if (!window.confirm('确定要取消这个预约吗？此操作不可撤销。')) {
    return
  }

  try {
    // 使用 store 的 cancelReservation 方法
    const success = await reservationStore.cancelReservation(currentReservation.value.id)

    if (success) {
      // TODO: 替换为更好的通知组件
      window.alert('预约已取消')
      router.push('/reservations/my')
    } else {
      window.alert('取消预约失败')
    }
  } catch (error: unknown) {
    console.error('取消预约失败:', error)
    window.alert('取消预约失败，请稍后重试')
  }
}

// 返回列表
function goBack() {
  router.back()
}

// 加载预约详情
async function loadReservationDetail() {
  if (!reservationId.value) return

  try {
    await reservationStore.fetchReservation(reservationId.value)
  } catch (error: unknown) {
    console.error('加载预约详情失败:', error)

    // 如果从API获取失败，尝试从现有数据中查找
    const existingReservation = reservationStore.reservations.find(r => r.id === reservationId.value)
    if (!existingReservation) {
      // TODO: 替换为更好的通知组件
      window.alert('预约不存在或已被删除')
      router.push('/reservations/my')
    }
  }
}

// 生命周期
onMounted(async () => {
  console.warn('✅ Reservation detail page mounted successfully!')
  console.warn(`🔄 加载预约详情: ${reservationId.value}`)

  if (!authStore.user) {
    console.warn('❌ 用户未登录')
    router.push('/auth/login')
    return
  }

  await loadReservationDetail()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <UniversalHeader/>

    <div class="container mx-auto px-4 py-6">
      <!-- 页面标题和操作 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <button
            @click="goBack"
            class="mr-4 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <i class="pi pi-arrow-left"></i>
            返回
          </button>
          <h1 class="text-2xl font-bold text-gray-900">
            预约详情
          </h1>
        </div>

        <div class="flex gap-2" v-if="currentReservation">
          <!-- 编辑按钮 -->
          <button
            v-if="canEdit.canEdit"
            @click="editReservation"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            title="编辑预约"
          >
            <i class="pi pi-pencil"></i>
            编辑
          </button>

          <!-- 取消按钮 -->
          <button
            v-if="canCancel.canCancel"
            @click="cancelReservation"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            title="取消预约"
          >
            <i class="pi pi-times"></i>
            取消预约
          </button>
        </div>
      </div>

      <!-- 操作限制提示 -->
      <div v-if="currentReservation && getOperationRestrictionMessage" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div class="flex items-center">
          <i class="pi pi-info-circle text-amber-600 mr-3 text-xl"></i>
          <p class="text-sm text-amber-800">{{ getOperationRestrictionMessage }}</p>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <i class="pi pi-spinner pi-spin text-4xl text-blue-400 mr-4"></i>
        <p class="text-gray-500">正在加载预约详情...</p>
      </div>

      <!-- 预约不存在 -->
      <div v-else-if="!currentReservation" class="bg-white rounded-lg shadow-sm border p-8 text-center">
        <i class="pi pi-calendar-times text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">预约不存在</h3>
        <p class="text-gray-500 mb-4">该预约可能已被删除或您没有访问权限</p>
        <button
          @click="goBack"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          返回列表
        </button>
      </div>

      <!-- 预约详情 -->
      <div v-else class="bg-white rounded-lg shadow-sm border">
        <!-- 状态条 -->
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">{{ currentReservation.title }}</h2>
            <span :class="[
              'px-3 py-1 text-sm font-medium rounded-full',
              getStatusStyle(currentReservation.status)
            ]">
              {{ getStatusText(currentReservation.status) }}
            </span>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 左侧：基础信息 -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">基础信息</h3>

              <div class="space-y-3">
                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">会议室:</span>
                  <span class="text-sm text-gray-900">
                    {{ currentReservation.room?.name || currentReservation.roomName || '未知' }}
                    <span v-if="currentReservation.room?.location" class="text-gray-500">
                      ({{ currentReservation.room.location }})
                    </span>
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">组织者:</span>
                  <span class="text-sm text-gray-900">
                    {{ currentReservation.organizer?.name || currentReservation.organizerName || '未知' }}
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">参与人数:</span>
                  <span class="text-sm text-gray-900">
                    {{ currentReservation.attendeeCount || 0 }}人
                  </span>
                </div>

                <div v-if="currentReservation.description" class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">描述:</span>
                  <span class="text-sm text-gray-900">{{ currentReservation.description }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：时间信息 -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">时间信息</h3>

              <div class="space-y-3">
                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">日期:</span>
                  <span class="text-sm text-gray-900">{{ formatDateTime(currentReservation.startTime) }}</span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">时间:</span>
                  <span class="text-sm text-gray-900">
                    {{ formatTime(currentReservation.startTime) }} - {{ formatTime(currentReservation.endTime) }}
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">时长:</span>
                  <span class="text-sm text-gray-900">
                    {{ getDuration(currentReservation.startTime, currentReservation.endTime) }}
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">创建时间:</span>
                  <span class="text-sm text-gray-900">{{ formatDateTime(currentReservation.createdAt) }}</span>
                </div>

                <div v-if="currentReservation.canceledAt" class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">取消时间:</span>
                  <span class="text-sm text-gray-900">{{ formatDateTime(currentReservation.canceledAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 详细配置信息 -->
          <div v-if="isDetailedReservation" class="mt-6 pt-6 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">详细配置</h3>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- 设备信息 -->
              <div v-if="currentReservation.equipment && currentReservation.equipment.length > 0">
                <h4 class="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <i class="pi pi-cog text-blue-600"></i>
                  设备配置
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="(item, index) in currentReservation.equipment"
                    :key="index"
                    class="flex items-center p-3 bg-blue-50 rounded-lg"
                  >
                    <i class="pi pi-check-circle text-blue-600 mr-3"></i>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ item.name || item }}</div>
                      <div v-if="item.specification" class="text-xs text-gray-500">{{ item.specification }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 服务配置 -->
              <div v-if="currentReservation.services && currentReservation.services.length > 0">
                <h4 class="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <i class="pi pi-star text-yellow-600"></i>
                  服务预订
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="(service, index) in currentReservation.services"
                    :key="index"
                    class="flex items-center p-3 bg-yellow-50 rounded-lg"
                  >
                    <i class="pi pi-check-circle text-yellow-600 mr-3"></i>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ service.name || service }}</div>
                      <div v-if="service.quantity" class="text-xs text-gray-500">数量: {{ service.quantity }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 会议材料 -->
              <div v-if="currentReservation.meetingMaterials && currentReservation.meetingMaterials.length > 0">
                <h4 class="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <i class="pi pi-file text-green-600"></i>
                  会议材料
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="(material, index) in currentReservation.meetingMaterials"
                    :key="index"
                    class="flex items-center p-3 bg-green-50 rounded-lg"
                  >
                    <i class="pi pi-file-pdf text-green-600 mr-3"></i>
                    <div class="flex-1">
                      <div class="text-sm font-medium text-gray-900">{{ material.name || material.fileName }}</div>
                      <div v-if="material.type" class="text-xs text-gray-500">类型: {{ material.type }}</div>
                      <div v-if="material.size" class="text-xs text-gray-500">大小: {{ material.size }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 其他详细信息 -->
              <div class="space-y-4">
                <!-- 重要性级别 -->
                <div v-if="currentReservation.importanceLevel && currentReservation.importanceLevel !== 'NORMAL'">
                  <h4 class="text-md font-medium text-gray-800 mb-2">重要性级别</h4>
                  <div class="flex items-center p-3 bg-purple-50 rounded-lg">
                    <i class="pi pi-exclamation-triangle text-purple-600 mr-3"></i>
                    <span class="text-sm font-medium text-purple-800">
                      {{ getImportanceLevelText(currentReservation.importanceLevel) }}
                    </span>
                  </div>
                </div>

                <!-- 预算金额 -->
                <div v-if="currentReservation.budgetAmount">
                  <h4 class="text-md font-medium text-gray-800 mb-2">预算金额</h4>
                  <div class="flex items-center p-3 bg-indigo-50 rounded-lg">
                    <i class="pi pi-money-bill text-indigo-600 mr-3"></i>
                    <span class="text-sm font-medium text-indigo-800">¥{{ currentReservation.budgetAmount }}</span>
                  </div>
                </div>

                <!-- 特殊要求 -->
                <div v-if="currentReservation.specialRequirements">
                  <h4 class="text-md font-medium text-gray-800 mb-2">特殊要求</h4>
                  <div class="p-3 bg-orange-50 rounded-lg">
                    <p class="text-sm text-orange-800">{{ currentReservation.specialRequirements }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 参与人员信息 -->
          <div v-if="currentReservation.attendees && currentReservation.attendees.length > 0" class="mt-6 pt-6 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">参与人员</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="(attendee, index) in currentReservation.attendees"
                :key="index"
                class="flex items-center p-3 bg-gray-50 rounded-lg"
              >
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span class="text-xs font-medium text-blue-600">
                    {{ attendee.name.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ attendee.name }}</div>
                  <div v-if="attendee.email" class="text-xs text-gray-500">{{ attendee.email }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>