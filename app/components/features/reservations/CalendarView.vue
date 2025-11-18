<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { FullCalendar } from '@fullcalendar/vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { CalendarOptions, EventSourceInput } from '@fullcalendar/core'
import type { Socket } from 'socket.io-client'

interface Props {
  roomIds?: string[]
  selectedTimeRange?: {
    start: Date
    end: Date
  }
  viewMode?: 'dayGridMonth' | 'dayGridWeek' | 'dayGridDay' | 'timeGridWeek' | 'timeGridDay'
  height?: string | number
  selectable?: boolean
  editable?: boolean
  eventLimit?: boolean
}

interface Emits {
  (e: 'timeSelect', selection: { start: Date; end: Date }): void
  (e: 'eventClick', info: { event: any; el: HTMLElement }): void
  (e: 'viewChange', view: { type: string; start: Date; end: Date }): void
  (e: 'dateClick', info: { date: Date; allDay: boolean }): void
  (e: 'eventDrop', info: { event: any; delta: number }): void
  (e: 'eventResize', info: { event: any; delta: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  roomIds: () => [],
  viewMode: 'dayGridWeek',
  height: 'auto',
  selectable: true,
  editable: false,
  eventLimit: true
})

const emit = defineEmits<Emits>()

// WebSocket 连接
const { $socket } = useNuxtApp()
const socket = ref<Socket | null>($socket)
const realTimeEnabled = ref(false)

const calendarApi = ref<any>(null)
const calendarOptions = ref<CalendarOptions>({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,dayGridWeek,dayGridDay,timeGridWeek,timeGridDay'
  },
  initialView: props.viewMode,
  height: props.height,
  selectable: props.selectable,
  selectMirror: true,
  selectMinDistance: 10,
  editable: props.editable,
  eventLimit: props.eventLimit,
  nowIndicator: true,
  locale: 'zh-cn',
  firstDay: 1, // 周一开始
  allDaySlot: true,
  slotMinTime: '06:00:00',
  slotMaxTime: '24:00:00',
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00:00',
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  displayEventTime: true,
  displayEventEnd: true,
  eventOverlap: false,
  dayMaxEventRows: true,
  dayMaxEvents: 4,
  moreLinkClick: 'popover',
  progressiveEventRendering: true,
  lazyFetching: true,
  events: [] as EventSourceInput,
  select: handleSelect,
  eventClick: handleEventClick,
  viewDidMount: handleViewDidMount,
  datesSet: handleDatesSet,
  dateClick: handleDateClick,
  eventDrop: handleEventDrop,
  eventResize: handleEventResize,
  loading: handleLoading,
  eventContent: renderEventContent
})

// 加载状态
const loading = ref(false)
const currentView = ref(props.viewMode)
const currentRange = ref({ start: new Date(), end: new Date() })

// 性能监控
const performanceMetrics = ref({
  initialLoadTime: 0,
  renderTime: 0,
  eventCount: 0
})

// 计算属性
const calendarHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height
})

const isMobile = computed(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768
  }
  return false
})

// 方法
function handleSelect(selectInfo: any) {
  const { start, end } = selectInfo
  emit('timeSelect', { start: new Date(start), end: new Date(end) })

  // 清除选择
  calendarApi.value?.unselect()
}

function handleEventClick(clickInfo: any) {
  emit('eventClick', {
    event: clickInfo.event,
    el: clickInfo.el
  })
}

function handleDateClick(clickInfo: any) {
  emit('dateClick', {
    date: new Date(clickInfo.date),
    allDay: clickInfo.allDay
  })
}

function handleEventDrop(dropInfo: any) {
  emit('eventDrop', {
    event: dropInfo.event,
    delta: dropInfo.delta
  })
}

function handleEventResize(resizeInfo: any) {
  emit('eventResize', {
    event: resizeInfo.event,
    delta: resizeInfo.endDelta
  })
}

function handleViewDidMount() {
  currentView.value = calendarApi.value?.currentData?.currentViewType || props.viewMode
  updatePerformanceMetrics()
}

function handleDatesSet(dateInfo: any) {
  currentRange.value = {
    start: new Date(dateInfo.start),
    end: new Date(dateInfo.end)
  }

  currentView.value = dateInfo.view.type
  emit('viewChange', {
    type: dateInfo.view.type,
    start: new Date(dateInfo.start),
    end: new Date(dateInfo.end)
  })

  // 触发数据加载
  loadEvents()
}

function handleLoading(isLoading: boolean) {
  loading.value = isLoading
  if (!isLoading) {
    updatePerformanceMetrics()
  }
}

function updatePerformanceMetrics() {
  if (process.client && calendarApi.value) {
    const eventCount = calendarApi.value.getEvents().length
    performanceMetrics.value.eventCount = eventCount

    if (eventCount > 0) {
      performanceMetrics.value.renderTime = performance.now()
    }
  }
}

function renderEventContent(arg: any) {
  const event = arg.event
  const isAvailable = event.extendedProps?.status === 'available'
  const isUnavailable = event.extendedProps?.status === 'unavailable'
  const isMaintenance = event.extendedProps?.status === 'maintenance'
  const hasConflict = event.extendedProps?.hasConflict || false
  const conflictSeverity = event.extendedProps?.conflictSeverity || ''

  // 根据状态和冲突情况设置颜色
  let backgroundColor = '#10b981' // 默认可用（绿色）
  let textColor = '#ffffff'
  let borderColor = 'transparent'
  let conflictIndicator = ''

  if (isUnavailable) {
    backgroundColor = '#ef4444' // 不可用（红色）
    if (hasConflict) {
      borderColor = '#991b1b' // 深红色边框
      conflictIndicator = '<div class="conflict-indicator" style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background-color: #dc2626; border-radius: 50%; border: 1px solid white;"></div>'
    }
  } else if (isMaintenance) {
    backgroundColor = '#f59e0b' // 维护中（橙色）
  }

  // 根据冲突严重程度设置特殊样式
  if (hasConflict) {
    switch (conflictSeverity) {
      case 'high':
        borderColor = '#991b1b' // 深红色
        backgroundColor = '#dc2626' // 更深的红色
        break
      case 'medium':
        borderColor = '#ea580c' // 深橙色
        backgroundColor = '#ea580c'
        break
      case 'low':
        borderColor = '#ca8a04' // 深黄色
        backgroundColor = '#eab308'
        break
    }

    // 添加闪烁动画用于高冲突
    if (conflictSeverity === 'high') {
      backgroundColor += ' animation: pulse-red 2s infinite'
    }
  }

  const conflictTitle = hasConflict ? ' title="⚠️ 时间冲突"' : ''

  return {
    html: `
      <div class="calendar-event ${hasConflict ? 'has-conflict' : ''}"
           style="
        background-color: ${backgroundColor};
        color: ${textColor};
        border: 2px solid ${borderColor};
        border-radius: 4px;
        padding: 2px 6px;
        margin: 1px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        cursor: pointer;
        position: relative;
        box-shadow: ${hasConflict ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'};
      "${conflictTitle}>
        ${conflictIndicator}
        <div class="event-title" style="font-weight: ${hasConflict ? 'bold' : 'normal'};">
          ${event.title || '未命名事件'}
          ${hasConflict ? ' ⚠️' : ''}
        </div>
        ${event.extendedProps?.roomName ? `<div class="event-room" style="font-size: 10px; opacity: 0.8;">${event.extendedProps.roomName}</div>` : ''}
        ${event.extendedProps?.conflictDescription ? `<div class="conflict-desc" style="font-size: 9px; opacity: 0.9; margin-top: 2px;">${event.extendedProps.conflictDescription}</div>` : ''}
      </div>
    `
  }
}

// 公共方法
function changeView(viewType: string) {
  calendarApi.value?.changeView(viewType)
}

function today() {
  calendarApi.value?.today()
}

function prev() {
  calendarApi.value?.prev()
}

function next() {
  calendarApi.value?.next()
}

function getDate() {
  return calendarApi.value?.getDate()
}

function gotoDate(date: Date) {
  calendarApi.value?.gotoDate(date)
}

function updateEvents(events: any[]) {
  if (calendarApi.value) {
    // 移除现有事件
    calendarApi.value.removeAllEvents()

    // 添加新事件
    events.forEach(event => {
      calendarApi.value.addEvent(event)
    })
  }
}

function addEvent(event: any) {
  calendarApi.value?.addEvent(event)
}

function removeEvent(eventId: string) {
  const event = calendarApi.value?.getEventById(eventId)
  if (event) {
    event.remove()
  }
}

function getEvents() {
  return calendarApi.value?.getEvents() || []
}

function refetchEvents() {
  calendarApi.value?.refetchEvents()
}

// 加载事件数据
async function loadEvents() {
  if (!props.roomIds.length) return

  try {
    loading.value = true
    const startTime = performance.now()

    // 获取当前视图的时间范围
    const { start, end } = currentRange.value

    // 调用 API 获取可用性数据
    const response = await $fetch('/api/v1/reservations/availability', {
      method: 'POST',
      body: {
        roomIds: props.roomIds,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    })

    if (response.success && response.data) {
      // 转换数据为 FullCalendar 事件格式
      const events = transformAvailabilityToEvents(response.data)
      updateEvents(events)
    }

    // 记录性能指标
    const loadTime = performance.now() - startTime
    if (process.client) {
      console.log(`Calendar events loaded in ${loadTime.toFixed(2)}ms`)
    }

  } catch (error) {
    console.error('Failed to load calendar events:', error)
  } finally {
    loading.value = false
  }
}

function transformAvailabilityToEvents(data: any): any[] {
  const events: any[] = []

  // 遍历每个会议室的数据
  Object.entries(data).forEach(([roomId, roomData]: [string, any]) => {
    if (!roomData) return

    // 处理已预约时间段
    if (roomData.reservations && Array.isArray(roomData.reservations)) {
      roomData.reservations.forEach((reservation: any) => {
        // 检测冲突情况
        const hasConflict = reservation.conflicts && reservation.conflicts.length > 0
        const conflictSeverity = hasConflict ? getHighestConflictSeverity(reservation.conflicts) : ''
        const conflictDescription = hasConflict ? getConflictDescription(reservation.conflicts[0]) : ''

        events.push({
          id: reservation.id,
          title: `${reservation.title} - ${roomData.roomName}`,
          start: reservation.startTime,
          end: reservation.endTime,
          backgroundColor: hasConflict ? getConflictColor(conflictSeverity) : '#ef4444', // 根据冲突设置颜色
          textColor: '#ffffff',
          extendedProps: {
            status: 'unavailable',
            roomId: roomData.roomId,
            roomName: roomData.roomName,
            reservationId: reservation.id,
            hasConflict,
            conflictSeverity,
            conflictDescription,
            conflicts: reservation.conflicts || []
          },
          editable: false
        })
      })
    }

    // 处理维护时间段
    if (roomData.maintenanceSlots && Array.isArray(roomData.maintenanceSlots)) {
      roomData.maintenanceSlots.forEach((slot: any) => {
        events.push({
          id: `maintenance-${slot.id}`,
          title: `维护中 - ${roomData.roomName}`,
          start: slot.startTime,
          end: slot.endTime,
          backgroundColor: '#f59e0b', // 橙色 - 维护中
          textColor: '#ffffff',
          extendedProps: {
            status: 'maintenance',
            roomId: roomData.roomId,
            roomName: roomData.roomName,
            hasConflict: false
          },
          editable: false
        })
      })
    }

    // 可选：添加可用时间段（可选显示）
    if (roomData.availableSlots && Array.isArray(roomData.availableSlots)) {
      roomData.availableSlots.forEach((slot: any) => {
        events.push({
          id: `available-${slot.id}`,
          title: '可用',
          start: slot.startTime,
          end: slot.endTime,
          backgroundColor: '#10b981', // 绿色 - 可用
          textColor: '#ffffff',
          extendedProps: {
            status: 'available',
            roomId: roomData.roomId,
            roomName: roomData.roomName,
            hasConflict: false
          },
          editable: false
        })
      })
    }
  })

  return events
}

/**
 * 获取最高冲突严重程度
 */
function getHighestConflictSeverity(conflicts: any[]): string {
  if (!conflicts || conflicts.length === 0) return ''

  const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
  let highestSeverity = 'low'

  conflicts.forEach(conflict => {
    if (severityOrder[conflict.severity as keyof typeof severityOrder] > severityOrder[highestSeverity as keyof typeof severityOrder]) {
      highestSeverity = conflict.severity
    }
  })

  return highestSeverity
}

/**
 * 根据冲突严重程度获取颜色
 */
function getConflictColor(severity: string): string {
  switch (severity) {
    case 'high':
      return '#dc2626' // 深红色
    case 'medium':
      return '#ea580c' // 深橙色
    case 'low':
      return '#eab308' // 黄色
    default:
      return '#ef4444' // 默认红色
  }
}

/**
 * 获取冲突描述
 */
function getConflictDescription(conflict: any): string {
  if (!conflict) return ''

  switch (conflict.type) {
    case 'time_overlap':
      return '时间重叠'
    case 'capacity_exceeded':
      return '容量超限'
    case 'equipment_conflict':
      return '设备冲突'
    case 'maintenance_conflict':
      return '维护冲突'
    default:
      return '预约冲突'
  }
}

// 响应式设计调整
function adjustForMobile() {
  if (!calendarApi.value || !isMobile.value) return

  const calendar = calendarApi.value

  // 移动端优化设置
  if (isMobile.value) {
    calendar.setOption('headerToolbar', {
      left: 'prev,next',
      center: 'title',
      right: 'dayGridDay,timeGridDay'
    })
    calendar.setOption('height', 'auto')
    calendar.setOption('slotMinTime', '08:00:00')
    calendar.setOption('slotMaxTime', '20:00:00')
    calendar.setOption('slotDuration', '00:15:00')
  } else {
    // 恢复桌面端设置
    calendar.setOption('headerToolbar', {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,dayGridDay,timeGridWeek,timeGridDay'
    })
    calendar.setOption('height', props.height)
    calendar.setOption('slotMinTime', '06:00:00')
    calendar.setOption('slotMaxTime', '24:00:00')
    calendar.setOption('slotDuration', '00:30:00')
  }
}

// 监听窗口大小变化
function handleResize() {
  nextTick(() => {
    adjustForMobile()
  })
}

// WebSocket 事件处理
function initializeWebSocket() {
  if (!socket.value) {
    console.warn('Socket.IO 未初始化')
    return
  }

  // 监听预约状态更新
  socket.value.on('reservation-updated', handleReservationUpdate)
  socket.value.on('connect', () => {
    realTimeEnabled.value = true
    console.log('实时更新已启用')

    // 加入当前关注的会议室房间
    props.roomIds.forEach(roomId => {
      socket.value?.emit('join-room', roomId)
    })
  })

  socket.value.on('disconnect', () => {
    realTimeEnabled.value = false
    console.log('实时更新已禁用')
  })
}

function handleReservationUpdate(data: any) {
  console.log('收到预约状态更新:', data)

  // 检查更新是否与当前显示的会议室相关
  if (!props.roomIds.includes(data.roomId)) {
    return
  }

  // 根据操作类型处理更新
  switch (data.action) {
    case 'created':
      handleReservationCreated(data)
      break
    case 'updated':
      handleReservationUpdated(data)
      break
    case 'deleted':
      handleReservationDeleted(data)
      break
  }
}

function handleReservationCreated(data: any) {
  if (!data.reservation) return

  // 将新预约转换为日历事件
  const event = transformReservationToEvent(data.reservation, data.roomId)
  if (event) {
    addEvent(event)

    // 显示通知
    showNotification('预约创建', `${event.title} 已创建`, 'success')
  }
}

function handleReservationUpdated(data: any) {
  if (!data.reservation) return

  // 查找现有事件
  const existingEvent = calendarApi.value?.getEventById(`reservation-${data.reservation.id}`)

  if (existingEvent) {
    // 更新现有事件
    updateEventFromReservation(existingEvent, data.reservation)
    showNotification('预约更新', `${existingEvent.title} 已更新`, 'info')
  } else {
    // 事件不存在，创建新事件
    const event = transformReservationToEvent(data.reservation, data.roomId)
    if (event) {
      addEvent(event)
      showNotification('预约更新', `${event.title} 已更新`, 'info')
    }
  }
}

function handleReservationDeleted(data: any) {
  if (!data.reservation) return

  // 移除对应的事件
  const eventId = `reservation-${data.reservation.id}`
  removeEvent(eventId)

  showNotification('预约取消', `预约已取消`, 'warning')
}

function transformReservationToEvent(reservation: any, roomId: string): any {
  if (!reservation || !reservation.startTime || !reservation.endTime) {
    return null
  }

  return {
    id: `reservation-${reservation.id}`,
    title: reservation.title || '未命名预约',
    start: new Date(reservation.startTime),
    end: new Date(reservation.endTime),
    backgroundColor: '#ef4444', // 红色 - 已预约
    textColor: '#ffffff',
    extendedProps: {
      status: 'unavailable',
      roomId: roomId,
      reservationId: reservation.id,
      userId: reservation.userId,
      description: reservation.description
    },
    editable: false
  }
}

function updateEventFromReservation(event: any, reservation: any) {
  if (!reservation.startTime || !reservation.endTime) return

  event.setProp('title', reservation.title || '未命名预约')
  event.setStart(new Date(reservation.startTime))
  event.setEnd(new Date(reservation.endTime))
  event.setExtendedProp('description', reservation.description)
}

function showNotification(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
  // 这里可以集成全局通知系统
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`)

  // 临时使用原生通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/favicon.ico'
    })
  }
}

function joinRoom(roomId: string) {
  if (socket.value && realTimeEnabled.value) {
    socket.value.emit('join-room', roomId)
  }
}

function leaveRoom(roomId: string) {
  if (socket.value && realTimeEnabled.value) {
    socket.value.emit('leave-room', roomId)
  }
}

// 生命周期
onMounted(async () => {
  const startTime = performance.now()

  // 等待下一个 tick 以确保 DOM 已渲染
  await nextTick()

  if (calendarApi.value) {
    // 初始化 WebSocket 连接
    if (process.client) {
      initializeWebSocket()
    }

    // 初始数据加载
    loadEvents()

    // 移动端适配
    adjustForMobile()

    // 监听窗口大小变化
    if (process.client) {
      window.addEventListener('resize', handleResize)
    }

    // 记录初始加载时间
    const loadTime = performance.now() - startTime
    performanceMetrics.value.initialLoadTime = loadTime

    console.log(`Calendar initialized in ${loadTime.toFixed(2)}ms`)

    // 性能检查
    if (loadTime > 1000) {
      console.warn('Calendar loading time exceeded 1 second target:', loadTime)
    }
  }
})

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('resize', handleResize)

    // 清理 WebSocket 事件监听器
    if (socket.value) {
      socket.value.off('reservation-updated', handleReservationUpdate)
      socket.value.off('connect')
      socket.value.off('disconnect')

      // 离开所有会议室房间
      props.roomIds.forEach(roomId => {
        leaveRoom(roomId)
      })
    }
  }
})

// 监听属性变化
watch(() => props.roomIds, (newRoomIds, oldRoomIds) => {
  // 处理 WebSocket 房间切换
  if (oldRoomIds) {
    oldRoomIds.forEach(roomId => {
      leaveRoom(roomId)
    })
  }

  if (socket.value && realTimeEnabled.value) {
    newRoomIds.forEach(roomId => {
      joinRoom(roomId)
    })
  }

  // 重新加载事件数据
  loadEvents()
}, { deep: true })

watch(() => props.viewMode, (newView) => {
  if (calendarApi.value) {
    changeView(newView)
  }
})

watch(() => props.height, (newHeight) => {
  if (calendarApi.value) {
    calendarApi.value.setOption('height', newHeight)
  }
})

// 暴露给父组件的方法和属性
defineExpose({
  calendarApi,
  changeView,
  today,
  prev,
  next,
  getDate,
  gotoDate,
  updateEvents,
  addEvent,
  removeEvent,
  getEvents,
  refetchEvents,
  loadEvents,
  loading: readonly(loading),
  currentView: readonly(currentView),
  currentRange: readonly(currentRange),
  performanceMetrics: readonly(performanceMetrics)
})
</script>

<template>
  <div class="calendar-view-container">
    <!-- 实时状态指示器 -->
    <div class="real-time-indicator top-2 right-2 z-20 flex items-center space-x-2 bg-white px-3 py-1 rounded-full shadow-md">
      <div
        :class="[
          'w-2 h-2 rounded-full',
          realTimeEnabled ? 'bg-green-500' : 'bg-gray-400'
        ]"
      ></div>
      <span class="text-sm text-gray-600">
        {{ realTimeEnabled ? '实时更新' : '离线' }}
      </span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="calendar-loading-overlay">
      <div class="loading-spinner">
        <i class="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>
    </div>

    <!-- FullCalendar 组件 -->
    <FullCalendar
      ref="calendarApi"
      :options="calendarOptions"
      :class="[
        'calendar-component',
        {
          'mobile-optimized': isMobile,
          'loading': loading
        }
      ]"
    />

    <!-- 性能指标（开发环境显示） -->
    <div
      v-if="$config.dev && performanceMetrics.initialLoadTime > 0"
      class="performance-metrics text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded"
    >
      <div>初始加载时间: {{ performanceMetrics.initialLoadTime.toFixed(2) }}ms</div>
      <div>事件数量: {{ performanceMetrics.eventCount }}</div>
      <div v-if="performanceMetrics.renderTime > 0">
        渲染时间: {{ performanceMetrics.renderTime.toFixed(2) }}ms
      </div>
      <div v-if="performanceMetrics.initialLoadTime > 1000" class="text-red-500">
        ⚠️ 加载时间超过1秒目标
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-view-container {
  @apply relative w-full;
}

.real-time-indicator {
  @apply absolute transition-all duration-300 ease-in-out;
}

.real-time-indicator .bg-green-500 {
  @apply animate-pulse;
}

.calendar-loading-overlay {
  @apply absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10;
}

.loading-spinner {
  @apply flex items-center space-x-2;
}

.calendar-component {
  @apply w-full;
}

.calendar-component :deep(.fc) {
  @apply font-sans;
}

.calendar-component :deep(.fc-toolbar-title) {
  @apply text-lg font-semibold text-gray-800;
}

.calendar-component :deep(.fc-button) {
  @apply bg-white border border-gray-300 text-gray-700 px-3 py-1 text-sm rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.calendar-component :deep(.fc-button-active) {
  @apply bg-blue-500 text-white border-blue-500 hover:bg-blue-600;
}

.calendar-component :deep(.fc-today-button) {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.calendar-component :deep(.fc-prev-button),
.calendar-component :deep(.fc-next-button) {
  @apply p-1;
}

.calendar-component :deep(.fc-daygrid-day-number) {
  @apply text-gray-700 font-medium;
}

.calendar-component :deep(.fc-day-today) {
  @apply bg-yellow-50;
}

.calendar-component :deep(.fc-day-today .fc-daygrid-day-number) {
  @apply bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs;
}

.calendar-component :deep(.fc-timegrid-slot) {
  @apply border-t border-gray-200;
}

.calendar-component :deep(.fc-timegrid-slot-label) {
  @apply text-xs text-gray-600;
}

.calendar-component :deep(.fc-event) {
  @apply border-none cursor-pointer;
}

.calendar-component :deep(.fc-event:hover) {
  @apply opacity-80;
}

.calendar-component :deep(.fc-more-link) {
  @apply text-blue-500 hover:text-blue-700 text-sm;
}

.calendar-component :deep(.fc-popover) {
  @apply border border-gray-200 rounded-lg shadow-lg;
}

.calendar-component :deep(.fc-popover-title) {
  @apply bg-gray-50 px-3 py-2 border-b border-gray-200 font-medium text-sm;
}

/* 移动端优化 */
.mobile-optimized :deep(.fc-toolbar) {
  @apply flex-col space-y-2;
}

.mobile-optimized :deep(.fc-toolbar-chunk) {
  @apply w-full flex justify-center;
}

.mobile-optimized :deep(.fc-header-toolbar) {
  @apply space-y-2;
}

.mobile-optimized :deep(.fc-daygrid) {
  @apply text-sm;
}

.mobile-optimized :deep(.fc-timegrid) {
  @apply text-sm;
}

.mobile-optimized :deep(.fc-timegrid-slot) {
  @apply h-12;
}

.mobile-optimized :deep(.fc-event) {
  @apply text-xs;
}

/* 加载状态样式 */
.calendar-component.loading :deep(.fc-view-harness) {
  @apply opacity-50;
}

/* 自定义事件样式 */
.calendar-component :deep(.calendar-event) {
  @apply text-xs leading-tight;
}

.calendar-component :deep(.event-title) {
  @apply font-medium truncate;
}

.calendar-component :deep(.event-room) {
  @apply opacity-80 truncate;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .calendar-component :deep(.fc-button) {
    @apply border-2 border-gray-600;
  }

  .calendar-component :deep(.fc-event) {
    @apply border-2 border-black;
  }
}

/* 冲突高亮样式 */
.calendar-component :deep(.calendar-event.has-conflict) {
  @apply border-2;
  animation: conflict-pulse 2s infinite;
}

.calendar-component :deep(.calendar-event.has-conflict .conflict-indicator) {
  animation: conflict-indicator-pulse 1s infinite;
}

/* 冲突动画 */
@keyframes conflict-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.9;
  }
}

@keyframes conflict-indicator-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

/* 高冲突时的红色脉冲 */
@keyframes pulse-red {
  0%, 100% {
    background-color: #dc2626;
  }
  50% {
    background-color: #ef4444;
  }
}

/* 鼠标悬浮时的冲突详情提示 */
.calendar-component :deep(.calendar-event.has-conflict:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
  transition: all 0.2s ease;
}

/* 冲突事件的可访问性支持 */
.calendar-component :deep(.calendar-event.has-conflict:focus) {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .calendar-component :deep(.fc) {
    @apply bg-gray-900 text-white;
  }

  .calendar-component :deep(.fc-toolbar-title) {
    @apply text-white;
  }

  .calendar-component :deep(.fc-button) {
    @apply bg-gray-800 border-gray-600 text-white hover:bg-gray-700;
  }

  .calendar-component :deep(.fc-daygrid-day-number) {
    @apply text-gray-300;
  }

  .calendar-component :deep(.fc-timegrid-slot-label) {
    @apply text-gray-400;
  }

  .calendar-component :deep(.calendar-event.has-conflict) {
    border-color: #f87171;
    box-shadow: 0 2px 4px rgba(248, 113, 113, 0.3);
  }
}
</style>