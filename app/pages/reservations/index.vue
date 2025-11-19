<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { format, addDays, startOfWeek, endOfWeek, isAfter, isBefore, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 导入store
import { useReservationStore } from '~/stores/reservations'
import { useRoomStore } from '~/stores/rooms'

// 使用store
const reservationStore = useReservationStore()
const roomStore = useRoomStore()

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

  return filtered.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
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

// 检查是否为过期预约
function isPastReservation(startTime: string | Date): boolean {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  return isBefore(start, new Date())
}

// 检查是否为进行中的预约
function isCurrentReservation(startTime: string | Date, endTime: string | Date): boolean {
  const now = new Date()
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime
  return isAfter(now, start) && isBefore(now, end)
}

// 加载预约数据
async function loadReservations() {
  try {
    await reservationStore.fetchReservations()
  } catch (err: any) {
    console.error('加载预约列表失败:', err)
  }
}

// 加载会议室数据
async function loadRooms() {
  try {
    await roomStore.fetchRooms()
  } catch (err: any) {
    console.error('加载会议室失败:', err)
  }
}

// 生命周期
onMounted(async () => {
  console.log('✅ Reservation list page mounted successfully!')

  // 添加强制刷新逻辑
  console.log('🔄 开始加载预约数据...')

  try {
    // 直接调用 store 方法
    await reservationStore.fetchReservations()
    console.log('✅ 预约数据加载完成，数量:', reservationStore.reservations.length)

    // 强制触发响应式更新
    await nextTick()
    console.log('✅ nextTick 完成')

  } catch (error) {
    console.error('❌ 预约数据加载失败:', error)
  }

  // 加载会议室数据
  try {
    await roomStore.fetchRooms()
    console.log('✅ 会议室数据加载完成，数量:', roomStore.rooms.length)
  } catch (error) {
    console.error('❌ 会议室数据加载失败:', error)
  }

  console.log('🔍 最终状态检查:')
  console.log('  - Store 预约数量:', reservationStore.reservations.length)
  console.log('  - Store 加载状态:', reservationStore.loading)
  console.log('  - Store 错误状态:', reservationStore.error)
  console.log('  - computed 过滤后数量:', filteredReservations.value.length)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面标题 -->
    <div class="bg-white shadow-sm border-b">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">预约列表</h1>
            <p class="mt-1 text-gray-600">查看和管理所有会议室预约</p>
          </div>
          <div class="flex gap-3">
            <NuxtLink
              to="/reservations/create"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-plus"></i>
              新建预约
            </NuxtLink>
            <NuxtLink
              to="/availability"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-clock"></i>
              会议室可用时间
            </NuxtLink>
            <NuxtLink
              to="/admin/rooms"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-home"></i>
              会议室管理
            </NuxtLink>
            <NuxtLink
              to="/dashboard"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-th-large"></i>
              控制台
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="container mx-auto px-4 py-6">
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
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-medium text-gray-900">{{ reservation.title }}</h3>
                  <span :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getStatusStyle(reservation.status)
                  ]">
                    {{ getStatusText(reservation.status) }}
                  </span>
                  <span v-if="isPastReservation(reservation.startTime)"
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
                  class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <i class="pi pi-eye mr-1"></i>
                  查看详情
                </button>
                <button
                  class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <i class="pi pi-pencil mr-1"></i>
                  编辑
                </button>
                <button
                  class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
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