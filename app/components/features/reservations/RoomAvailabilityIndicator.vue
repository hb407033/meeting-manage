<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { format, isAfter, isBefore, isToday, isTomorrow, isYesterday } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface RoomAvailabilityData {
  roomId: string
  roomName: string
  status: 'available' | 'unavailable' | 'maintenance'
  availableSlots?: Array<{
    startTime: Date
    endTime: Date
  }>
  reservations?: Array<{
    id: string
    title: string
    startTime: Date
    endTime: Date
    organizerName?: string
  }>
  maintenanceSlots?: Array<{
    startTime: Date
    endTime: Date
    reason?: string
  }>
  capacity?: number
  equipment?: string[]
}

interface Props {
  roomData: RoomAvailabilityData
  timeRange?: {
    start: Date
    end: Date
  }
  showDetails?: boolean
  showTimeline?: boolean
  compact?: boolean
  showRoomInfo?: boolean
}

interface Emits {
  (e: 'roomSelect', roomId: string): void
  (e: 'slotClick', data: { roomId: string; slot: { startTime: Date; endTime: Date } }): void
  (e: 'reservationClick', data: { roomId: string; reservation: any }): void
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  showTimeline: true,
  compact: false,
  showRoomInfo: true
})

const emit = defineEmits<Emits>()

// 状态配置
const statusConfig = {
  available: {
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    icon: 'pi pi-check-circle',
    label: '可用'
  },
  unavailable: {
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: 'pi pi-times-circle',
    label: '已预约'
  },
  maintenance: {
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    icon: 'pi pi-exclamation-triangle',
    label: '维护中'
  }
}

// 当前状态
const currentStatus = computed(() => {
  const now = new Date()

  // 检查是否有维护时间段
  if (props.roomData.maintenanceSlots) {
    const inMaintenance = props.roomData.maintenanceSlots.some(slot => {
      const start = new Date(slot.startTime)
      const end = new Date(slot.endTime)
      return (isAfter(now, start) || now.getTime() === start.getTime()) &&
             (isBefore(now, end) || now.getTime() === end.getTime())
    })
    if (inMaintenance) return 'maintenance'
  }

  // 检查是否有预约时间段
  if (props.roomData.reservations) {
    const inReservation = props.roomData.reservations.some(reservation => {
      const start = new Date(reservation.startTime)
      const end = new Date(reservation.endTime)
      return (isAfter(now, start) || now.getTime() === start.getTime()) &&
             (isBefore(now, end) || now.getTime() === end.getTime())
    })
    if (inReservation) return 'unavailable'
  }

  return 'available'
})

// 状态配置
const currentStatusConfig = computed(() => statusConfig[currentStatus.value])

// 统计信息
const statistics = computed(() => {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  let availableMinutes = 0
  let totalMinutes = 0

  // 计算时间段统计
  if (props.timeRange) {
    const rangeStart = props.timeRange.start
    const rangeEnd = props.timeRange.end
    totalMinutes = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60)

    if (props.roomData.availableSlots) {
      props.roomData.availableSlots.forEach(slot => {
        const slotStart = new Date(slot.startTime)
        const slotEnd = new Date(slot.endTime)

        // 计算与查询范围的交集
        const overlapStart = slotStart > rangeStart ? slotStart : rangeStart
        const overlapEnd = slotEnd < rangeEnd ? slotEnd : rangeEnd

        if (overlapEnd > overlapStart) {
          availableMinutes += (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
        }
      })
    }
  }

  const availabilityRate = totalMinutes > 0 ? (availableMinutes / totalMinutes) * 100 : 0

  return {
    totalMinutes: Math.round(totalMinutes),
    availableMinutes: Math.round(availableMinutes),
    availabilityRate: Math.round(availabilityRate),
    reservationCount: props.roomData.reservations?.length || 0,
    maintenanceCount: props.roomData.maintenanceSlots?.length || 0
  }
})

// 时间线数据
const timelineData = computed(() => {
  if (!props.showTimeline || !props.timeRange) return []

  const { start, end } = props.timeRange
  const timeline: Array<{
    time: Date
    status: 'available' | 'unavailable' | 'maintenance'
    label?: string
    reservation?: any
    maintenance?: any
  }> = []

  // 添加时间段数据
  if (props.roomData.reservations) {
    props.roomData.reservations.forEach(reservation => {
      timeline.push({
        time: new Date(reservation.startTime),
        status: 'unavailable',
        label: reservation.title,
        reservation
      })
    })
  }

  if (props.roomData.maintenanceSlots) {
    props.roomData.maintenanceSlots.forEach(maintenance => {
      timeline.push({
        time: new Date(maintenance.startTime),
        status: 'maintenance',
        label: maintenance.reason || '维护中',
        maintenance
      })
    })
  }

  // 按时间排序
  return timeline.sort((a, b) => a.time.getTime() - b.time.getTime())
})

// 方法
function handleRoomClick() {
  emit('roomSelect', props.roomData.roomId)
}

function handleSlotClick(slot: { startTime: Date; endTime: Date }) {
  emit('slotClick', {
    roomId: props.roomData.roomId,
    slot
  })
}

function handleReservationClick(reservation: any) {
  emit('reservationClick', {
    roomId: props.roomData.roomId,
    reservation
  })
}

function formatTime(date: Date) {
  return format(date, 'HH:mm', { locale: zhCN })
}

function formatDate(date: Date) {
  const now = new Date()
  if (isToday(date)) {
    return '今天'
  } else if (isTomorrow(date)) {
    return '明天'
  } else if (isYesterday(date)) {
    return '昨天'
  } else {
    return format(date, 'MM/dd', { locale: zhCN })
  }
}

function getStatusColor(status: string) {
  return statusConfig[status as keyof typeof statusConfig]?.color || 'gray'
}

// 获取可用性等级
function getAvailabilityLevel(rate: number) {
  if (rate >= 80) return { level: 'high', color: 'text-green-600', label: '高' }
  if (rate >= 50) return { level: 'medium', color: 'text-yellow-600', label: '中' }
  return { level: 'low', color: 'text-red-600', label: '低' }
}

const availabilityLevel = computed(() => getAvailabilityLevel(statistics.value.availabilityRate))
</script>

<template>
  <div class="room-availability-indicator">
    <div
      class="indicator-container"
      :class="[
        currentStatusConfig.bgColor,
        currentStatusConfig.borderColor,
        'border rounded-lg p-4',
        compact ? 'p-3' : 'p-4',
        'transition-all duration-200 hover:shadow-md cursor-pointer'
      ]"
      @click="handleRoomClick"
    >
      <!-- 会议室基本信息 -->
      <div v-if="showRoomInfo" class="room-header mb-3">
        <div class="flex items-center justify-between">
          <div class="room-info">
            <h3 class="room-name font-semibold text-gray-900">
              {{ roomData.roomName }}
            </h3>
            <div v-if="roomData.capacity" class="room-capacity text-sm text-gray-600">
              <i class="pi pi-users text-xs"></i>
              容纳 {{ roomData.capacity }} 人
            </div>
          </div>

          <!-- 状态指示器 -->
          <div class="status-indicator">
            <div
              class="status-badge"
              :class="[
                currentStatusConfig.bgColor,
                currentStatusConfig.textColor,
                'flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium'
              ]"
            >
              <i :class="currentStatusConfig.icon"></i>
              <span>{{ currentStatusConfig.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="showDetails && !compact" class="statistics mb-4">
        <div class="grid grid-cols-2 gap-4">
          <!-- 可用率 -->
          <div class="stat-item">
            <div class="stat-label text-sm text-gray-600">可用率</div>
            <div class="stat-value">
              <span
                :class="[
                  'text-2xl font-bold',
                  availabilityLevel.color
                ]"
              >
                {{ statistics.availabilityRate }}%
              </span>
              <span class="text-xs text-gray-500 ml-1">
                ({{ availabilityLevel.label }})
              </span>
            </div>
          </div>

          <!-- 预约数量 -->
          <div class="stat-item">
            <div class="stat-label text-sm text-gray-600">今日预约</div>
            <div class="stat-value">
              <span class="text-2xl font-bold text-gray-900">
                {{ statistics.reservationCount }}
              </span>
              <span class="text-xs text-gray-500 ml-1">
                场
              </span>
            </div>
          </div>
        </div>

        <!-- 可用时间 -->
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">可用时间</span>
            <span class="text-sm font-medium text-gray-900">
              {{ Math.round(statistics.availableMinutes / 60) }}小时 /
              {{ Math.round(statistics.totalMinutes / 60) }}小时
            </span>
          </div>
        </div>
      </div>

      <!-- 设备信息 -->
      <div v-if="!compact && roomData.equipment && roomData.equipment.length > 0" class="equipment-info mb-4">
        <div class="text-sm text-gray-600 mb-2">设备配置</div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="equipment in roomData.equipment.slice(0, 4)"
            :key="equipment"
            class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
          >
            <i class="pi pi-desktop mr-1"></i>
            {{ equipment }}
          </span>
          <span
            v-if="roomData.equipment.length > 4"
            class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"
          >
            +{{ roomData.equipment.length - 4 }}
          </span>
        </div>
      </div>

      <!-- 时间线视图 -->
      <div v-if="showTimeline && timelineData.length > 0" class="timeline-section">
        <div class="timeline-header flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">时间安排</span>
          <span class="text-xs text-gray-500">
            {{ formatDate(timelineData[0]?.time) }}
          </span>
        </div>

        <div class="timeline-container space-y-2">
          <div
            v-for="(item, index) in timelineData.slice(0, compact ? 3 : 5)"
            :key="index"
            class="timeline-item"
            :class="[
              'flex items-center space-x-3 p-2 rounded-lg text-sm',
              statusConfig[item.status].bgColor,
              statusConfig[item.status].textColor
            ]"
          >
            <i :class="statusConfig[item.status].icon"></i>
            <div class="flex-1 min-w-0">
              <div class="timeline-title font-medium truncate">
                {{ item.label }}
              </div>
              <div class="timeline-time text-xs opacity-75">
                {{ formatTime(item.time) }}
                <template v-if="item.reservation">
                  - {{ formatTime(new Date(item.reservation.endTime)) }}
                </template>
                <template v-else-if="item.maintenance">
                  - {{ formatTime(new Date(item.maintenance.endTime)) }}
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 更多时间安排 -->
        <div
          v-if="timelineData.length > (compact ? 3 : 5)"
          class="more-items mt-2 text-center"
        >
          <span class="text-xs text-gray-500">
            还有 {{ timelineData.length - (compact ? 3 : 5) }} 个时间安排
          </span>
        </div>
      </div>

      <!-- 紧凑模式简化显示 -->
      <div v-if="compact" class="compact-view">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <i :class="currentStatusConfig.icon"></i>
            <span class="font-medium text-gray-900">{{ roomData.roomName }}</span>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium" :class="availabilityLevel.color">
              {{ statistics.availabilityRate }}%
            </div>
            <div class="text-xs text-gray-500">{{ statistics.reservationCount }} 场</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-availability-indicator {
  @apply w-full;
}

.indicator-container {
  @apply transition-all duration-200;
}

.indicator-container:hover {
  @apply transform scale-[1.02] shadow-lg;
}

.room-header {
  @apply flex-shrink-0;
}

.room-name {
  @apply text-lg;
}

.room-capacity {
  @apply mt-1;
}

.status-indicator {
  @apply flex-shrink-0;
}

.status-badge {
  @apply transition-all duration-200;
}

.statistics {
  @apply flex-shrink-0;
}

.stat-item {
  @apply text-center;
}

.stat-label {
  @apply mb-1;
}

.stat-value {
  @apply flex items-baseline justify-center;
}

.equipment-info {
  @apply flex-shrink-0;
}

.timeline-section {
  @apply flex-shrink-0;
}

.timeline-header {
  @apply flex-shrink-0;
}

.timeline-container {
  @apply max-h-48 overflow-y-auto;
}

.timeline-item {
  @apply transition-all duration-150;
}

.timeline-item:hover {
  @apply opacity-80;
}

.timeline-title {
  @apply truncate;
}

.more-items {
  @apply flex-shrink-0;
}

.compact-view {
  @apply w-full;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .indicator-container {
    @apply p-3;
  }

  .room-name {
    @apply text-base;
  }

  .stat-value {
    @apply text-xl;
  }

  .timeline-container {
    @apply max-h-32;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .room-name {
    @apply text-white;
  }

  .room-capacity,
  .stat-label,
  .timeline-header {
    @apply text-gray-400;
  }

  .stat-value span:first-child {
    @apply text-white;
  }

  .timeline-item {
    @apply border border-gray-600;
  }
}

/* 打印样式 */
@media print {
  .indicator-container {
    @apply border-2 border-gray-300 shadow-none;
  }

  .timeline-container {
    @apply max-h-none overflow-visible;
  }
}

/* 无障碍支持 */
.indicator-container:focus-visible {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

/* 动画效果 */
.timeline-item {
  @apply transform transition-all duration-200;
}

.timeline-item:hover {
  @apply translate-x-1;
}

/* 状态指示器动画 */
.status-badge {
  @apply relative overflow-hidden;
}

.status-badge::before {
  content: '';
  @apply absolute inset-0 opacity-0 transition-opacity duration-300;
}

.status-badge:hover::before {
  @apply opacity-10;
}

/* 可用性进度条（可选） */
.availability-bar {
  @apply w-full bg-gray-200 rounded-full h-2 mt-2;
}

.availability-fill {
  @apply h-2 rounded-full transition-all duration-500;
}

.availability-fill.high {
  @apply bg-green-500;
}

.availability-fill.medium {
  @apply bg-yellow-500;
}

.availability-fill.low {
  @apply bg-red-500;
}
</style>