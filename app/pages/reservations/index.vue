<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { format, addDays, startOfWeek, endOfWeek, isAfter, isBefore, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRouter } from 'vue-router'

// 导入store
import { useReservationStore } from '~/stores/reservations'
import { useRoomStore } from '~/stores/rooms'
import { useAuthStore } from '~/stores/auth'

// 使用store和路由
const reservationStore = useReservationStore()
const roomStore = useRoomStore()
const authStore = useAuthStore()
const router = useRouter()

// 页面设置
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

// 筛选状态
const selectedRoom = ref<string>('')
const selectedStatus = ref<string>('')
const selectedDateRange = ref<string>('all')

// 状态选项
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'PENDING', label: '待确认' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'COMPLETED', label: '已完成' }
]

// 日期范围选项
const dateRangeOptions = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本周' }
]

// 过滤后的预约列表
const filteredReservations = computed(() => {
  let filtered = reservationStore.reservations

  // 按会议室筛选
  if (selectedRoom.value) {
    filtered = filtered.filter(r => r.room?.id === selectedRoom.value || r.roomId === selectedRoom.value)
  }

  // 按状态筛选
  if (selectedStatus.value) {
    filtered = filtered.filter(r => r.status === selectedStatus.value)
  }

  // 按日期范围筛选（修复时区问题）
  const now = new Date()
  if (selectedDateRange.value === 'today') {
    filtered = filtered.filter(r => {
      const reservationDate = new Date(r.startTime)
      // 使用UTC时间进行日期比较，避免时区问题
      const reservationDateUTC = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate())
      const nowUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return reservationDateUTC.getTime() === nowUTC.getTime()
    })
  } else if (selectedDateRange.value === 'tomorrow') {
    const tomorrow = addDays(now, 1)
    filtered = filtered.filter(r => {
      const reservationDate = new Date(r.startTime)
      // 使用UTC时间进行日期比较，避免时区问题
      const reservationDateUTC = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate())
      const tomorrowUTC = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
      return reservationDateUTC.getTime() === tomorrowUTC.getTime()
    })
  } else if (selectedDateRange.value === 'week') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    filtered = filtered.filter(r => {
      const reservationDate = new Date(r.startTime)
      // 使用UTC时间进行日期比较
      const reservationDateUTC = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate())
      return reservationDateUTC >= weekStart && reservationDateUTC <= weekEnd
    })
  }

  return filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
})

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
  return format(dateObj, 'MM月dd日 HH:mm', { locale: zhCN })
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

// 判断是否为详细预约
function isDetailedReservation(reservation: any): boolean {
  return !!(
    reservation.equipment ||
    reservation.services ||
    reservation.attendeeList ||
    reservation.specialRequirements ||
    reservation.budgetAmount ||
    (reservation.importanceLevel && reservation.importanceLevel !== 'NORMAL') ||
    (reservation.meetingMaterials && reservation.meetingMaterials.length > 0)
  )
}

// 获取预约类型信息
function getReservationTypeInfo(reservation: any) {
  const isDetailed = isDetailedReservation(reservation)
  return {
    isDetailed,
    type: isDetailed ? '详细预约' : '快速预约',
    icon: isDetailed ? 'pi-cog' : 'pi-clock',
    color: isDetailed ? 'purple' : 'blue'
  }
}

// 检查是否为过期预约（基于预约的结束时间）
function isPastReservation(startTime: string | Date, endTime?: string | Date): boolean {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : start

  // 如果预约已经结束（结束时间已过），则认为是过期预约
  return isBefore(end, new Date())
}

// 检查是否为已结束预约的更准确版本（考虑状态和时间）
function isReservationEnded(reservation: any): boolean {
  // 如果状态是已完成或已取消，直接返回true
  if (reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') {
    return true
  }

  // 否则检查结束时间
  return isPastReservation(reservation.startTime, reservation.endTime)
}

// 检查是否为进行中的预约
function isCurrentReservation(startTime: string | Date, endTime: string | Date): boolean {
  const now = new Date()
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime
  return isAfter(now, start) && isBefore(now, end)
}

// 检查用户是否可以编辑预约
function canEditReservation(reservation: { status: string; startTime: string; endTime: string; organizerId?: string; organizer?: { email?: string } }): { canEdit: boolean; reason: string } {
  if (!authStore.user) return { canEdit: false, reason: '用户未登录' }

  // 检查是否是管理员
  if (authStore.user.role === 'ADMIN') {
    // 管理员也不能编辑已结束或已完成的预约
    const isEnded = isReservationEnded(reservation)
    if (isEnded) {
      return { canEdit: false, reason: '预约已结束' }
    }
    return { canEdit: true, reason: '' }
  }

  // 检查是否是预约组织者
  const isOrganizer = reservation.organizerId === authStore.user.id ||
                     reservation.organizer?.email === authStore.user.email ||
                     reservation.organizerName === authStore.user.name

  if (!isOrganizer) {
    return { canEdit: false, reason: '只有组织者可以编辑' }
  }

  // 检查预约状态：只有未结束且未取消的预约可以编辑
  const now = new Date()
  const startTime = new Date(reservation.startTime)
  const endTime = new Date(reservation.endTime)

  // 预约已经结束（结束时间已过）
  const isEnded = endTime <= now
  // 预约还未开始
  const isUpcoming = startTime > now

  // 可编辑条件：组织者 + (未开始或正在进行中) + 未取消 + 未完成
  const canEditByStatus = !isEnded &&
                          reservation.status !== 'CANCELLED' &&
                          reservation.status !== 'COMPLETED'

  const statusReason = isEnded ? '预约已结束' :
                      (reservation.status === 'CANCELLED' ? '预约已取消' :
                       reservation.status === 'COMPLETED' ? '预约已完成' : '')

  return {
    canEdit: canEditByStatus,
    reason: statusReason
  }
}

// 检查用户是否可以取消预约
function canCancelReservation(reservation: { status: string; startTime: string; endTime: string; organizerId?: string; organizer?: { email?: string } }): { canCancel: boolean; reason: string } {
  if (!authStore.user) return { canCancel: false, reason: '用户未登录' }

  // 检查是否是管理员
  if (authStore.user.role === 'ADMIN') {
    // 管理员也只能取消未开始的预约
    const now = new Date()
    const startTime = new Date(reservation.startTime)
    if (startTime <= now) {
      return { canCancel: false, reason: '预约已开始或已结束' }
    }
    return { canEdit: true, reason: '' }
  }

  // 检查是否是预约组织者
  const isOrganizer = reservation.organizerId === authStore.user.id ||
                     reservation.organizer?.email === authStore.user.email ||
                     reservation.organizerName === authStore.user.name

  if (!isOrganizer) {
    return { canCancel: false, reason: '只有组织者可以取消' }
  }

  // 检查预约状态：只有未开始且未结束的预约可以取消
  const now = new Date()
  const startTime = new Date(reservation.startTime)
  const endTime = new Date(reservation.endTime)

  // 预约已经结束（结束时间已过）
  const isEnded = endTime <= now
  // 预约还未开始
  const isUpcoming = startTime > now

  // 可取消条件：组织者 + 未开始 + 未取消 + 未完成
  const canCancelByStatus = isUpcoming &&
                           reservation.status !== 'CANCELLED' &&
                           reservation.status !== 'COMPLETED'

  const statusReason = !isUpcoming ? '预约已开始或已结束' :
                      (reservation.status === 'CANCELLED' ? '预约已取消' :
                       reservation.status === 'COMPLETED' ? '预约已完成' : '')

  return {
    canCancel: canCancelByStatus,
    reason: statusReason
  }
}

// 加载预约数据
async function loadReservations() {
  try {
    await reservationStore.fetchReservations()
  } catch (err: any) {
    console.error('加载预约列表失败:', err)
  }
}

// 查看预约详情
function viewReservationDetail(reservationId: string, reservation: any) {
  const typeInfo = getReservationTypeInfo(reservation)
  if (typeInfo.isDetailed) {
    // 详细预约跳转到详细页面
    router.push(`/reservations/detailed#${reservationId}`)
  } else {
    // 简单预约跳转到简单详情页面
    router.push(`/reservations/${reservationId}`)
  }
}

// 编辑预约
function editReservation(reservationId: string, reservation: any) {
  // 检查编辑权限
  const editPermission = canEditReservation(reservation)
  if (!editPermission.canEdit) {
    window.alert(`无法编辑预约：${editPermission.reason}`)
    return
  }

  const typeInfo = getReservationTypeInfo(reservation)
  if (typeInfo.isDetailed) {
    // 详细预约跳转到详细编辑页面
    router.push(`/reservations/detailed?edit=${reservationId}`)
  } else {
    // 简单预约跳转到简单编辑页面
    router.push(`/reservations/create?edit=${reservationId}`)
  }
}

// 取消预约
async function cancelReservation(reservationId: string, reservation?: any) {
  // 如果传入了预约对象，先检查权限
  if (reservation) {
    const cancelPermission = canCancelReservation(reservation)
    if (!cancelPermission.canCancel) {
      window.alert(`无法取消预约：${cancelPermission.reason}`)
      return
    }
  }

  // TODO: 替换为更好的用户确认对话框组件
  if (!window.confirm('确定要取消这个预约吗？此操作不可撤销。')) {
    return
  }

  try {
    // 使用 store 的 cancelReservation 方法
    const success = await reservationStore.cancelReservation(reservationId)

    if (success) {
      // TODO: 替换为更好的通知组件
      window.alert('预约已取消')
    } else {
      window.alert('取消预约失败')
    }
  } catch (error: unknown) {
    console.error('取消预约失败:', error)
    window.alert('取消预约失败，请稍后重试')
  }
}

// 加载会议室数据
async function _loadRooms() {
  try {
    await roomStore.fetchRooms()
  } catch (err: unknown) {
    console.error('加载会议室失败:', err)
  }
}

// 生命周期
onMounted(async () => {
  console.warn('✅ Reservation list page mounted successfully!')

  // 添加强制刷新逻辑
  console.warn('🔄 开始加载预约数据...')

  try {
    // 直接调用 store 方法
    await reservationStore.fetchReservations()
    console.warn('✅ 预约数据加载完成，数量:', reservationStore.reservations.length)

    // 强制触发响应式更新
    await nextTick()
    console.warn('✅ nextTick 完成')

  } catch (error) {
    console.error('❌ 预约数据加载失败:', error)
  }

  // 加载会议室数据
  try {
    await roomStore.fetchRooms()
    console.warn('✅ 会议室数据加载完成，数量:', roomStore.rooms.length)
  } catch (error) {
    console.error('❌ 会议室数据加载失败:', error)
  }

  console.warn('🔍 最终状态检查:')
  console.warn('  - Store 预约数量:', reservationStore.reservations.length)
  console.warn('  - Store 加载状态:', reservationStore.loading)
  console.warn('  - Store 错误状态:', reservationStore.error)
  console.warn('  - computed 过滤后数量:', filteredReservations.value.length)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-6">
    <!-- 筛选条件 -->
    <div>
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <i class="pi pi-filter text-blue-600"></i>
          筛选条件
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 会议室筛选 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">会议室</label>
            <select
              v-model="selectedRoom"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部会议室</option>
              <option
                v-for="room in roomStore.rooms"
                :key="room.id"
                :value="room.id"
              >
                {{ room.name }}
              </option>
            </select>
          </div>

          <!-- 状态筛选 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <select
              v-model="selectedStatus"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option
                v-for="option in statusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- 日期范围筛选 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
            <select
              v-model="selectedDateRange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option
                v-for="option in dateRangeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 预约列表 -->
    <div class="container mx-auto px-4 pb-6">
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">
              预约列表 ({{ filteredReservations.length }})
            </h2>
          </div>
        </div>

        <div v-if="reservationStore.loading" class="p-8 text-center">
          <i class="pi pi-spinner pi-spin text-4xl text-blue-400 mb-4"></i>
          <p class="text-gray-500">正在加载预约列表...</p>
        </div>

        <div v-else-if="filteredReservations.length === 0" class="p-8 text-center">
          <i class="pi pi-calendar-times text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-500">暂无符合条件的预约记录</p>
        </div>

        <div v-else class="divide-y divide-gray-200">
          <div
            v-for="reservation in filteredReservations"
            :key="reservation.id"
            class="p-6 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between">
              <!-- 左侧：主要信息 -->
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 class="text-lg font-medium text-gray-900">{{ reservation.title }}</h3>
                  <!-- 预约类型标识 -->
                  <span :class="[
                    'px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1',
                    getReservationTypeInfo(reservation).color === 'purple'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  ]">
                    <i :class="['pi', getReservationTypeInfo(reservation).icon, 'text-xs']"></i>
                    {{ getReservationTypeInfo(reservation).type }}
                  </span>
                  <span :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getStatusStyle(reservation.status)
                  ]">
                    {{ getStatusText(reservation.status) }}
                  </span>
                  <span v-if="isReservationEnded(reservation)"
                        class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                    已结束
                  </span>
                  <span v-else-if="isCurrentReservation(reservation.startTime, reservation.endTime)"
                        class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                    进行中
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-home text-gray-400"></i>
                      <span>会议室：{{ reservation.room?.name || reservation.roomName || '未知' }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-user text-gray-400"></i>
                      <span>组织者：{{ reservation.organizer?.name || reservation.organizerName || '未知' }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-users text-gray-400"></i>
                      <span>参与人：{{ (reservation.attendees || []).join(', ') || reservation.attendeeCount || 0 }}人</span>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-calendar text-gray-400"></i>
                      <span>日期：{{ formatDateTime(reservation.startTime) }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-clock text-gray-400"></i>
                      <span>时间：{{ formatTime(reservation.startTime) }} - {{ formatTime(reservation.endTime) }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-hourglass text-gray-400"></i>
                      <span>时长：{{ getDuration(reservation.startTime, reservation.endTime) }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="reservation.description" class="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <i class="pi pi-info-circle text-gray-400 mr-1"></i>
                  {{ reservation.description }}
                </div>
              </div>

              <!-- 右侧：操作按钮 -->
              <div class="ml-6 flex flex-col gap-2">
                <button
                  @click="viewReservationDetail(reservation.id, reservation)"
                  class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <i class="pi pi-eye mr-1"></i>
                  查看详情
                </button>
                <button
                  v-if="canEditReservation(reservation).canEdit"
                  @click="editReservation(reservation.id, reservation)"
                  class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  title="编辑预约"
                >
                  <i class="pi pi-pencil mr-1"></i>
                  编辑
                </button>
                <button
                  v-if="canCancelReservation(reservation).canCancel"
                  @click="cancelReservation(reservation.id, reservation)"
                  class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                  title="取消预约"
                >
                  <i class="pi pi-trash mr-1"></i>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reservation-list {
  font-family: system-ui, -apple-system, sans-serif;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>