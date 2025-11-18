<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { format, addMinutes, differenceInMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { MeetingRoom } from '~/types/meeting'

interface TimeSlot {
  start: Date
  end: Date
  roomIds: string[]
  status: 'available' | 'partial' | 'unavailable'
  reservations?: any[]
}

interface RoomAvailability {
  roomId: string
  roomName: string
  timeSlots: TimeSlot[]
  availabilityPercentage: number
}

interface Props {
  rooms: MeetingRoom[]
  selectedDate: Date
  timeRange?: {
    start: Date
    end: Date
  }
  slotDuration?: number // 分钟
  showReservationDetails?: boolean
  enableConflictDetection?: boolean
  maxRoomsVisible?: number
}

interface Emits {
  (e: 'timeSlotSelect', timeSlot: TimeSlot): void
  (e: 'roomSelect', roomIds: string[]): void
  (e: 'dateChange', date: Date): void
  (e: 'timeRangeChange', range: { start: Date; end: Date }): void
}

const props = withDefaults(defineProps<Props>(), {
  rooms: () => [],
  slotDuration: 30,
  showReservationDetails: true,
  enableConflictDetection: true,
  maxRoomsVisible: 6
})

const emit = defineEmits<Emits>()

// 内部状态
const selectedTimeSlot = ref<TimeSlot | null>(null)
const hoveredTimeSlot = ref<TimeSlot | null>(null)
const comparisonMode = ref<'grid' | 'timeline'>('grid')
const loading = ref(false)
const availabilityData = ref<RoomAvailability[]>([])

// 计算属性
const timeSlots = computed(() => {
  const slots: TimeSlot[] = []
  const start = props.timeRange?.start || startOfDay(props.selectedDate)
  const end = props.timeRange?.end || endOfDay(props.selectedDate)

  let currentTime = new Date(start)
  while (currentTime < end) {
    const slotEnd = addMinutes(currentTime, props.slotDuration)
    const roomIds = props.rooms.map(room => room.id)

    slots.push({
      start: new Date(currentTime),
      end: slotEnd,
      roomIds,
      status: 'available' // 初始状态，将根据实际可用性更新
    })

    currentTime = slotEnd
  }

  return slots
})

const visibleRooms = computed(() => {
  return props.rooms.slice(0, props.maxRoomsVisible)
})

const timeRangeLabels = computed(() => {
  return timeSlots.value.map(slot => ({
    time: format(slot.start, 'HH:mm', { locale: zhCN }),
    slot
  }))
})

const conflictingSlots = computed(() => {
  if (!props.enableConflictDetection) return []

  return timeSlots.value.filter(slot => {
    return slot.status === 'unavailable' || (slot.reservations && slot.reservations.length > 0)
  })
})

// 方法
async function loadAvailabilityData() {
  loading.value = true
  try {
    // 调用 API 获取可用性数据
    const response = await $fetch('/api/v1/reservations/availability', {
      method: 'POST',
      body: {
        roomIds: props.rooms.map(room => room.id),
        startTime: timeSlots.value[0]?.start.toISOString(),
        endTime: timeSlots.value[timeSlots.value.length - 1]?.end.toISOString()
      }
    })

    if (response.success && response.data) {
      processAvailabilityData(response.data)
    }
  } catch (error) {
    console.error('Failed to load availability data:', error)
  } finally {
    loading.value = false
  }
}

function processAvailabilityData(data: any) {
  availabilityData.value = props.rooms.map(room => {
    const roomData = data[room.id]
    const roomSlots: TimeSlot[] = []
    let availableCount = 0

    timeSlots.value.forEach(slot => {
      const isSlotAvailable = checkSlotAvailability(slot, roomData)
      const reservations = getReservationsForSlot(slot, roomData)

      if (isSlotAvailable && !reservations.length) {
        availableCount++
      }

      roomSlots.push({
        ...slot,
        roomIds: [room.id],
        status: getSlotStatus(isSlotAvailable, reservations),
        reservations
      })
    })

    return {
      roomId: room.id,
      roomName: room.name,
      timeSlots: roomSlots,
      availabilityPercentage: (availableCount / timeSlots.value.length) * 100
    }
  })

  // 更新时间槽状态
  updateTimeSlotsStatus()
}

function checkSlotAvailability(slot: TimeSlot, roomData: any): boolean {
  if (!roomData) return true

  // 检查是否有预约冲突
  if (roomData.reservations) {
    for (const reservation of roomData.reservations) {
      const reservationStart = new Date(reservation.startTime)
      const reservationEnd = new Date(reservation.endTime)

      if (isWithinInterval(slot.start, { start: reservationStart, end: reservationEnd }) ||
          isWithinInterval(slot.end, { start: reservationStart, end: reservationEnd }) ||
          (slot.start <= reservationStart && slot.end >= reservationEnd)) {
        return false
      }
    }
  }

  return true
}

function getReservationsForSlot(slot: TimeSlot, roomData: any): any[] {
  if (!roomData || !roomData.reservations) return []

  return roomData.reservations.filter((reservation: any) => {
    const reservationStart = new Date(reservation.startTime)
    const reservationEnd = new Date(reservation.endTime)

    return isWithinInterval(slot.start, { start: reservationStart, end: reservationEnd }) ||
           isWithinInterval(slot.end, { start: reservationStart, end: reservationEnd }) ||
           (slot.start <= reservationStart && slot.end >= reservationEnd)
  })
}

function getSlotStatus(isAvailable: boolean, reservations: any[]): 'available' | 'partial' | 'unavailable' {
  if (!isAvailable) return 'unavailable'
  if (reservations.length > 0) return 'partial'
  return 'available'
}

function updateTimeSlotsStatus() {
  timeSlots.value.forEach(slot => {
    const roomStatuses = availabilityData.value.map(roomData => {
      const roomSlot = roomData.timeSlots.find(rs =>
        rs.start.getTime() === slot.start.getTime() &&
        rs.end.getTime() === slot.end.getTime()
      )
      return roomSlot?.status || 'unavailable'
    })

    const availableCount = roomStatuses.filter(status => status === 'available').length
    const totalCount = roomStatuses.length

    if (availableCount === totalCount) {
      slot.status = 'available'
    } else if (availableCount === 0) {
      slot.status = 'unavailable'
    } else {
      slot.status = 'partial'
    }
  })
}

function handleTimeSlotClick(slot: TimeSlot, roomId?: string) {
  selectedTimeSlot.value = slot

  if (roomId) {
    // 单个会议室的时间槽选择
    const roomSlot = {
      ...slot,
      roomIds: [roomId],
      reservations: getRoomReservations(slot, roomId)
    }
    emit('timeSlotSelect', roomSlot)
  } else {
    // 多会议室对比选择
    emit('timeSlotSelect', slot)
  }
}

function getRoomReservations(slot: TimeSlot, roomId: string): any[] {
  const roomData = availabilityData.value.find(rd => rd.roomId === roomId)
  if (!roomData) return []

  const roomSlot = roomData.timeSlots.find(rs =>
    rs.start.getTime() === slot.start.getTime() &&
    rs.end.getTime() === slot.end.getTime()
  )

  return roomSlot?.reservations || []
}

function getSlotColor(slot: TimeSlot, roomId?: string): string {
  if (roomId) {
    // 单个会议室的颜色
    const roomData = availabilityData.value.find(rd => rd.roomId === roomId)
    if (!roomData) return 'bg-gray-100'

    const roomSlot = roomData.timeSlots.find(rs =>
      rs.start.getTime() === slot.start.getTime() &&
      rs.end.getTime() === slot.end.getTime()
    )

    if (!roomSlot) return 'bg-gray-100'

    switch (roomSlot.status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 text-green-800'
      case 'unavailable':
        return 'bg-red-100 hover:bg-red-200 text-red-800'
      case 'partial':
        return 'bg-orange-100 hover:bg-orange-200 text-orange-800'
      default:
        return 'bg-gray-100 hover:bg-gray-200'
    }
  } else {
    // 多会议室对比的颜色
    switch (slot.status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 text-green-800'
      case 'partial':
        return 'bg-orange-100 hover:bg-orange-200 text-orange-800'
      case 'unavailable':
        return 'bg-red-100 hover:bg-red-200 text-red-800'
      default:
        return 'bg-gray-100 hover:bg-gray-200'
    }
  }
}

function getSlotTextColor(slot: TimeSlot): string {
  switch (slot.status) {
    case 'available':
      return 'text-green-800'
    case 'partial':
      return 'text-orange-800'
    case 'unavailable':
      return 'text-red-800'
    default:
      return 'text-gray-800'
  }
}

function formatTimeRange(slot: TimeSlot): string {
  return `${format(slot.start, 'HH:mm', { locale: zhCN })} - ${format(slot.end, 'HH:mm', { locale: zhCN })}`
}

function getAvailabilityPercentage(roomId: string): number {
  const roomData = availabilityData.value.find(rd => rd.roomId === roomId)
  return roomData?.availabilityPercentage || 0
}

function getAvailableSlotsCount(roomId: string): number {
  const roomData = availabilityData.value.find(rd => rd.roomId === roomId)
  if (!roomData) return 0

  return roomData.timeSlots.filter(slot => slot.status === 'available').length
}

function toggleComparisonMode() {
  comparisonMode.value = comparisonMode.value === 'grid' ? 'timeline' : 'grid'
}

function exportComparisonData() {
  const data = {
    date: props.selectedDate.toISOString(),
    rooms: props.rooms.map(room => ({
      id: room.id,
      name: room.name,
      availability: getAvailabilityPercentage(room.id)
    })),
    timeSlots: timeSlots.value.map(slot => ({
      time: formatTimeRange(slot),
      status: slot.status,
      availableRooms: slot.roomIds.length
    }))
  }

  // 创建下载链接
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `room-comparison-${format(props.selectedDate, 'yyyy-MM-dd')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 监听器
watch([() => props.rooms, () => props.selectedDate, () => props.timeRange], () => {
  if (props.rooms.length > 0) {
    loadAvailabilityData()
  }
}, { deep: true })

// 生命周期
onMounted(() => {
  if (props.rooms.length > 0) {
    loadAvailabilityData()
  }
})

// 暴露给父组件的方法
defineExpose({
  loadAvailabilityData,
  exportComparisonData,
  availabilityData,
  conflictingSlots
})
</script>

<template>
  <div class="multi-room-comparison">
    <!-- 工具栏 -->
    <div class="comparison-toolbar mb-6 p-4 bg-white border rounded-lg shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h3 class="text-lg font-semibold text-gray-900">多会议室对比</h3>
          <div class="text-sm text-gray-500">
            {{ format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN }) }}
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- 视图切换 -->
          <div class="view-toggle bg-gray-100 rounded-lg p-1">
            <button
              @click="comparisonMode = 'grid'"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
                comparisonMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              ]"
            >
              网格视图
            </button>
            <button
              @click="comparisonMode = 'timeline'"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
                comparisonMode === 'timeline' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              ]"
            >
              时间线视图
            </button>
          </div>

          <!-- 导出按钮 -->
          <button
            @click="exportComparisonData"
            class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            :disabled="loading"
          >
            <i class="pi pi-download mr-1"></i>
            导出数据
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state text-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      <p class="text-gray-600 mt-2">加载会议室可用性数据...</p>
    </div>

    <!-- 网格视图 -->
    <div v-else-if="comparisonMode === 'grid'" class="grid-view">
      <!-- 统计概览 -->
      <div class="stats-overview mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="room in visibleRooms"
          :key="room.id"
          class="stat-card p-4 bg-white border rounded-lg"
        >
          <h4 class="font-medium text-gray-900 mb-2">{{ room.name }}</h4>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">可用率</span>
            <span class="text-lg font-semibold" :class="getAvailabilityPercentage(room.id) >= 80 ? 'text-green-600' : getAvailabilityPercentage(room.id) >= 50 ? 'text-orange-600' : 'text-red-600'">
              {{ getAvailabilityPercentage(room.id).toFixed(1) }}%
            </span>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ getAvailableSlotsCount(room.id) }}/{{ timeSlots.length }} 时间段
          </div>
        </div>
      </div>

      <!-- 时间槽网格 -->
      <div class="time-slot-grid bg-white border rounded-lg shadow-sm overflow-hidden">
        <!-- 表头 -->
        <div class="grid-header bg-gray-50 border-b">
          <div class="grid grid-cols-[120px_repeat(auto-fill,_minmax(100px,_1fr))] gap-2 px-4 py-3">
            <div class="text-sm font-medium text-gray-700">时间</div>
            <div
              v-for="room in visibleRooms"
              :key="room.id"
              class="text-sm font-medium text-gray-700 text-center"
            >
              {{ room.name }}
            </div>
          </div>
        </div>

        <!-- 表格内容 -->
        <div class="grid-content">
          <div
            v-for="slot in timeSlots"
            :key="`${slot.start.getTime()}-${slot.end.getTime()}`"
            class="grid-row border-b hover:bg-gray-50"
          >
            <div class="grid grid-cols-[120px_repeat(auto-fill,_minmax(100px,_1fr))] gap-2 px-4 py-2">
              <!-- 时间标签 -->
              <div class="time-label flex items-center text-sm font-medium text-gray-600">
                {{ formatTimeRange(slot) }}
              </div>

              <!-- 各会议室状态 -->
              <div
                v-for="room in visibleRooms"
                :key="`${room.id}-${slot.start.getTime()}`"
                class="room-slot"
              >
                <div
                  @click="handleTimeSlotClick(slot, room.id)"
                  class="slot-cell p-2 rounded cursor-pointer text-center transition-all duration-200"
                  :class="getSlotColor(slot, room.id)"
                  :title="`${room.name} - ${formatTimeRange(slot)}`"
                >
                  <div class="slot-status">
                    <i
                      v-if="slot.status === 'available'"
                      class="pi pi-check text-xs"
                    ></i>
                    <i
                      v-else-if="slot.status === 'partial'"
                      class="pi pi-exclamation-triangle text-xs"
                    ></i>
                    <i
                      v-else
                      class="pi pi-times text-xs"
                    ></i>
                  </div>

                  <!-- 预约详情 -->
                  <div
                    v-if="showReservationDetails"
                    class="reservation-info mt-1 text-xs opacity-75"
                  >
                    <div v-if="getRoomReservations(slot, room.id).length > 0" class="truncate">
                      {{ getRoomReservations(slot, room.id).length }}个预约
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 时间线视图 -->
    <div v-else class="timeline-view">
      <div class="timeline-container bg-white border rounded-lg shadow-sm p-4">
        <div
          v-for="room in visibleRooms"
          :key="room.id"
          class="room-timeline mb-6"
        >
          <!-- 会议室标签 -->
          <div class="room-header flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <h4 class="font-medium text-gray-900">{{ room.name }}</h4>
              <span class="text-sm text-gray-500">
                可用率: {{ getAvailabilityPercentage(room.id).toFixed(1) }}%
              </span>
            </div>
            <div class="flex items-center space-x-2 text-xs text-gray-500">
              <span>{{ getAvailableSlotsCount(room.id) }}个可用时间段</span>
            </div>
          </div>

          <!-- 时间线 -->
          <div class="timeline-slots flex space-x-1 overflow-x-auto">
            <div
              v-for="slot in timeSlots"
              :key="`${room.id}-${slot.start.getTime()}`"
              @click="handleTimeSlotClick(slot, room.id)"
              class="timeline-slot flex-shrink-0 p-3 rounded cursor-pointer text-center transition-all duration-200 min-w-[80px]"
              :class="getSlotColor(slot, room.id)"
              :title="`${room.name} - ${formatTimeRange(slot)}`"
            >
              <div class="text-xs font-medium mb-1">
                {{ format(slot.start, 'HH:mm', { locale: zhCN }) }}
              </div>
              <div class="slot-icon">
                <i
                  v-if="getSlotColor(slot, room.id).includes('green')"
                  class="pi pi-check text-green-600"
                ></i>
                <i
                  v-else-if="getSlotColor(slot, room.id).includes('orange')"
                  class="pi pi-exclamation-triangle text-orange-600"
                ></i>
                <i
                  v-else
                  class="pi pi-times text-red-600"
                ></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 冲突提示 -->
    <div v-if="enableConflictDetection && conflictingSlots.length > 0" class="conflict-alert mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div class="flex items-start space-x-3">
        <i class="pi pi-exclamation-triangle text-orange-600 mt-0.5"></i>
        <div>
          <h4 class="font-medium text-orange-800">发现 {{ conflictingSlots.length }} 个冲突时间段</h4>
          <p class="text-sm text-orange-700 mt-1">
            这些时间段存在预约冲突，建议选择其他时间或调整会议室安排。
          </p>
          <div class="mt-2 space-y-1">
            <div
              v-for="slot in conflictingSlots.slice(0, 3)"
              :key="`${slot.start.getTime()}-conflict`"
              class="text-xs text-orange-600"
            >
              {{ formatTimeRange(slot) }}
            </div>
            <div v-if="conflictingSlots.length > 3" class="text-xs text-orange-600">
              还有 {{ conflictingSlots.length - 3 }} 个冲突时间段...
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && visibleRooms.length === 0" class="empty-state text-center py-12">
      <i class="pi pi-calendar-times text-4xl text-gray-300 mb-3"></i>
      <p class="text-gray-500">请选择要对比的会议室</p>
    </div>
  </div>
</template>

<style scoped>
.multi-room-comparison {
  @apply space-y-6;
}

.comparison-toolbar {
  @apply sticky top-0 z-10 backdrop-blur-sm;
}

.stats-overview {
  @apply gap-4;
}

.stat-card {
  @apply transition-shadow hover:shadow-md;
}

.time-slot-grid {
  @apply overflow-x-auto;
}

.grid-header {
  @apply sticky top-0 z-10;
}

.grid-row {
  @apply transition-colors;
}

.room-slot {
  @apply flex items-center;
}

.slot-cell {
  @apply hover:scale-105 active:scale-95;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1;
}

.slot-cell:hover .reservation-info {
  @apply opacity-100;
}

.room-timeline {
  @apply border-b border-gray-200 last:border-b-0;
}

.room-timeline:last-child {
  @apply mb-0;
}

.timeline-slot {
  @apply hover:scale-105 active:scale-95;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1;
}

.conflict-alert {
  @apply animate-pulse;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-overview {
    @apply grid-cols-1;
  }

  .grid-header .grid,
  .grid-row .grid {
    @apply grid-cols-[80px_repeat(auto-fill,_minmax(60px,_1fr))] gap-1 px-2 py-2;
  }

  .timeline-slots {
    @apply gap-0.5;
  }

  .timeline-slot {
    @apply min-w-[60px] p-2;
  }

  .comparison-toolbar {
    @apply flex-col space-y-3;
  }

  .comparison-toolbar > div:first-child {
    @apply flex-col items-start space-x-0 space-y-2;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .comparison-toolbar {
    @apply bg-gray-800 border-gray-700;
  }

  .stat-card {
    @apply bg-gray-800 border-gray-700;
  }

  .time-slot-grid {
    @apply bg-gray-800 border-gray-700;
  }

  .grid-header {
    @apply bg-gray-700;
  }

  .grid-row {
    @apply border-gray-700 hover:bg-gray-700;
  }

  .room-timeline {
    @apply border-gray-700;
  }

  .conflict-alert {
    @apply bg-orange-900 border-orange-700;
  }
}

/* 无障碍支持 */
.slot-cell:focus-visible,
.timeline-slot:focus-visible {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* 动画效果 */
.slot-cell,
.timeline-slot {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>