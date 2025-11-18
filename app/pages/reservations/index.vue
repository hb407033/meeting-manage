<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format, addDays, startOfWeek, endOfWeek, isAfter, isBefore, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 模拟预约数据
const reservations = ref([
  {
    id: '1',
    title: '产品设计会议',
    roomName: '会议室 A',
    roomId: '1',
    organizerName: '张三',
    startTime: new Date(2025, 10, 19, 9, 0),
    endTime: new Date(2025, 10, 19, 11, 0),
    status: 'confirmed',
    description: '讨论新产品的设计需求',
    attendees: ['张三', '李四', '王五']
  },
  {
    id: '2',
    title: '技术评审',
    roomName: '会议室 B',
    roomId: '2',
    organizerName: '李四',
    startTime: new Date(2025, 10, 19, 14, 0),
    endTime: new Date(2025, 10, 19, 16, 0),
    status: 'confirmed',
    description: '技术方案评审会议',
    attendees: ['李四', '赵六']
  },
  {
    id: '3',
    title: '客户演示',
    roomName: '会议室 C',
    roomId: '3',
    organizerName: '王五',
    startTime: new Date(2025, 10, 20, 10, 0),
    endTime: new Date(2025, 10, 20, 12, 0),
    status: 'pending',
    description: '重要客户产品演示',
    attendees: ['王五', '客户代表']
  },
  {
    id: '4',
    title: '团队周会',
    roomName: '会议室 A',
    roomId: '1',
    organizerName: '赵六',
    startTime: new Date(2025, 10, 21, 15, 0),
    endTime: new Date(2025, 10, 21, 16, 0),
    status: 'confirmed',
    description: '每周团队同步会议',
    attendees: ['全体团队成员']
  }
])

// 筛选状态
const selectedRoom = ref<string>('')
const selectedStatus = ref<string>('')
const selectedDateRange = ref<string>('today')

// 模拟会议室数据
const rooms = ref([
  { id: '1', name: '会议室 A' },
  { id: '2', name: '会议室 B' },
  { id: '3', name: '会议室 C' }
])

// 状态选项
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'confirmed', label: '已确认' },
  { value: 'pending', label: '待确认' },
  { value: 'cancelled', label: '已取消' }
]

// 日期范围选项
const dateRangeOptions = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本周' },
  { value: 'all', label: '全部' }
]

// 过滤后的预约列表
const filteredReservations = computed(() => {
  let filtered = reservations.value

  // 按会议室筛选
  if (selectedRoom.value) {
    filtered = filtered.filter(r => r.roomId === selectedRoom.value)
  }

  // 按状态筛选
  if (selectedStatus.value) {
    filtered = filtered.filter(r => r.status === selectedStatus.value)
  }

  // 按日期范围筛选
  const now = new Date()
  if (selectedDateRange.value === 'today') {
    filtered = filtered.filter(r => {
      const reservationDate = new Date(r.startTime)
      return reservationDate.toDateString() === now.toDateString()
    })
  } else if (selectedDateRange.value === 'tomorrow') {
    const tomorrow = addDays(now, 1)
    filtered = filtered.filter(r => {
      const reservationDate = new Date(r.startTime)
      return reservationDate.toDateString() === tomorrow.toDateString()
    })
  } else if (selectedDateRange.value === 'week') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    filtered = filtered.filter(r => {
      const reservationDate = new Date(r.startTime)
      return reservationDate >= weekStart && reservationDate <= weekEnd
    })
  }

  return filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
})

// 获取状态显示样式
function getStatusStyle(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'confirmed':
      return '已确认'
    case 'pending':
      return '待确认'
    case 'cancelled':
      return '已取消'
    default:
      return '未知状态'
  }
}

// 格式化时间
function formatDateTime(date: Date): string {
  return format(date, 'MM月dd日 HH:mm', { locale: zhCN })
}

function formatTime(date: Date): string {
  return format(date, 'HH:mm', { locale: zhCN })
}

// 获取时长
function getDuration(startTime: Date, endTime: Date): string {
  const hours = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
  const minutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)) % 60
  if (hours > 0) {
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
  return `${minutes}分钟`
}

// 检查是否为过期预约
function isPastReservation(startTime: Date): boolean {
  return isBefore(new Date(startTime), new Date())
}

// 检查是否为进行中的预约
function isCurrentReservation(startTime: Date, endTime: Date): boolean {
  const now = new Date()
  return isAfter(now, startTime) && isBefore(now, endTime)
}

// 生命周期
onMounted(() => {
  console.log('✅ Reservation list page mounted successfully!')
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
              to="/rooms/availability"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-clock"></i>
              会议室可用时间
            </NuxtLink>
            <NuxtLink
              to="/rooms"
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
                v-for="room in rooms"
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

        <div v-if="filteredReservations.length === 0" class="p-8 text-center">
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
                      <span>会议室：{{ reservation.roomName }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-user text-gray-400"></i>
                      <span>组织者：{{ reservation.organizerName }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-users text-gray-400"></i>
                      <span>参与人：{{ reservation.attendees.join(', ') }}</span>
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