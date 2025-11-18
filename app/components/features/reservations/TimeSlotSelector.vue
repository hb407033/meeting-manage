<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { format, addMinutes, differenceInMinutes, isWithinInterval, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  status: 'available' | 'unavailable' | 'maintenance' | 'selected'
  roomId?: string
  reservationId?: string
  conflictInfo?: any
}

interface Props {
  availableSlots: TimeSlot[]
  selectedSlots: TimeSlot[]
  disabled?: boolean
  allowDragSelection?: boolean
  allowMultipleSelection?: boolean
  minSelectionDuration?: number // 最小选择时长（分钟）
  maxSelectionDuration?: number // 最大选择时长（分钟）
  timeSlotDuration?: number // 时间槽长度（分钟）
  showReservationDetails?: boolean
  roomId?: string
}

interface Emits {
  (e: 'slotSelect', slots: TimeSlot[]): void
  (e: 'slotDeselect', slots: TimeSlot[]): void
  (e: 'selectionComplete', selection: TimeSlot[]): void
  (e: 'selectionChange', selection: TimeSlot[]): void
}

const props = withDefaults(defineProps<Props>(), {
  availableSlots: () => [],
  selectedSlots: () => [],
  disabled: false,
  allowDragSelection: true,
  allowMultipleSelection: false,
  minSelectionDuration: 30,
  maxSelectionDuration: 480, // 8小时
  timeSlotDuration: 30,
  showReservationDetails: true
})

const emit = defineEmits<Emits>()

// 内部状态
const isDragging = ref(false)
const dragStartTime = ref<Date | null>(null)
const dragEndTime = ref<Date | null>(null)
const hoverSlot = ref<TimeSlot | null>(null)
const selectionPreview = ref<TimeSlot[]>([])

// DOM 引用
const containerRef = ref<HTMLElement>()

// 计算属性
const currentTime = ref(new Date())

// 按小时分组的时间槽
const slotsByHour = computed(() => {
  const groups: { [hour: string]: TimeSlot[] } = {}

  props.availableSlots.forEach(slot => {
    const hour = format(slot.startTime, 'HH:00', { locale: zhCN })
    if (!groups[hour]) {
      groups[hour] = []
    }
    groups[hour].push(slot)
  })

  return groups
})

// 当前选择的时间槽
const currentSelection = computed(() => {
  return props.selectedSlots
})

// 选择是否有效
const isSelectionValid = computed(() => {
  if (currentSelection.value.length === 0) return true

  const startSlot = currentSelection.value[0]
  const endSlot = currentSelection.value[currentSelection.value.length - 1]
  const duration = differenceInMinutes(endSlot.endTime, startSlot.startTime)

  return duration >= props.minSelectionDuration && duration <= props.maxSelectionDuration
})

// 选择时长
const selectionDuration = computed(() => {
  if (currentSelection.value.length === 0) return 0

  const startSlot = currentSelection.value[0]
  const endSlot = currentSelection.value[currentSelection.value.length - 1]
  return differenceInMinutes(endSlot.endTime, startSlot.startTime)
})

// 方法
function getSlotStatus(slot: TimeSlot): string {
  const isSelected = currentSelection.value.some(s => s.id === slot.id)
  if (isSelected) return 'selected'
  return slot.status
}

function getSlotColor(slot: TimeSlot): string {
  const status = getSlotStatus(slot)

  switch (status) {
    case 'available':
      return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800'
    case 'selected':
      return 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white'
    case 'unavailable':
      return 'bg-red-100 hover:bg-red-200 border-red-300 text-red-800'
    case 'maintenance':
      return 'bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800'
    default:
      return 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800'
  }
}

function isSlotInDragSelection(slot: TimeSlot): boolean {
  if (!isDragging.value || !dragStartTime.value || !dragEndTime.value) {
    return false
  }

  return isWithinInterval(slot.startTime, {
    start: dragStartTime.value,
    end: dragEndTime.value
  }) || isWithinInterval(slot.endTime, {
    start: dragStartTime.value,
    end: dragEndTime.value
  })
}

function handleSlotClick(slot: TimeSlot, event: MouseEvent) {
  if (props.disabled || slot.status === 'unavailable' || slot.status === 'maintenance') {
    return
  }

  const isSelected = currentSelection.value.some(s => s.id === slot.id)

  if (isSelected) {
    // 取消选择
    const newSelection = currentSelection.value.filter(s => s.id !== slot.id)
    emit('slotDeselect', [slot])
    emit('selectionChange', newSelection)
  } else {
    // 添加选择
    if (!props.allowMultipleSelection) {
      // 单选模式，清除之前的选择
      emit('slotSelect', [slot])
      emit('selectionChange', [slot])
    } else {
      // 多选模式，添加到现有选择
      const newSelection = [...currentSelection.value, slot]
      emit('slotSelect', [slot])
      emit('selectionChange', newSelection)
    }
  }
}

function handleMouseDown(slot: TimeSlot, event: MouseEvent) {
  if (!props.allowDragSelection || props.disabled || slot.status === 'unavailable' || slot.status === 'maintenance') {
    return
  }

  isDragging.value = true
  dragStartTime.value = slot.startTime
  dragEndTime.value = slot.startTime

  event.preventDefault()
}

function handleMouseEnter(slot: TimeSlot, event: MouseEvent) {
  hoverSlot.value = slot

  if (isDragging.value && dragStartTime.value) {
    dragEndTime.value = slot.endTime
    updateSelectionPreview()
  }
}

function handleMouseUp(event: MouseEvent) {
  if (isDragging.value && dragStartTime.value && dragEndTime.value) {
    // 完成拖拽选择
    const selectedSlots = getSlotsInTimeRange(dragStartTime.value, dragEndTime.value)
      .filter(slot => slot.status === 'available')

    if (selectedSlots.length > 0) {
      if (!props.allowMultipleSelection) {
        emit('slotSelect', selectedSlots)
        emit('selectionChange', selectedSlots)
      } else {
        const newSelection = [...currentSelection.value, ...selectedSlots]
          .filter((slot, index, arr) => arr.findIndex(s => s.id === slot.id) === index) // 去重
        emit('slotSelect', selectedSlots)
        emit('selectionChange', newSelection)
      }

      emit('selectionComplete', selectedSlots)
    }
  }

  // 重置拖拽状态
  isDragging.value = false
  dragStartTime.value = null
  dragEndTime.value = null
  selectionPreview.value = []
}

function updateSelectionPreview() {
  if (!dragStartTime.value || !dragEndTime.value) {
    selectionPreview.value = []
    return
  }

  selectionPreview.value = getSlotsInTimeRange(dragStartTime.value, dragEndTime.value)
    .filter(slot => slot.status === 'available')
}

function getSlotsInTimeRange(startTime: Date, endTime: Date): TimeSlot[] {
  return props.availableSlots.filter(slot => {
    return (isWithinInterval(slot.startTime, { start: startTime, end: endTime }) ||
            isWithinInterval(slot.endTime, { start: startTime, end: endTime }) ||
            (slot.startTime <= startTime && slot.endTime >= endTime))
  })
}

function clearSelection() {
  emit('slotDeselect', currentSelection.value)
  emit('selectionChange', [])
}

function selectAllAvailable() {
  if (!props.allowMultipleSelection) return

  const availableSlots = props.availableSlots.filter(slot => slot.status === 'available')
  emit('slotSelect', availableSlots)
  emit('selectionChange', availableSlots)
}

function formatTimeRange(slot: TimeSlot): string {
  return `${format(slot.startTime, 'HH:mm', { locale: zhCN })} - ${format(slot.endTime, 'HH:mm', { locale: zhCN })}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`
}

function getSlotAriaLabel(slot: TimeSlot): string {
  const status = getSlotStatus(slot)
  const timeRange = formatTimeRange(slot)
  const baseLabel = `${timeRange}, 状态: ${status}`

  if (slot.reservationId && props.showReservationDetails) {
    return `${baseLabel}, 已预约`
  }

  return baseLabel
}

// 键盘支持
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    clearSelection()
  }
}

// 全局鼠标事件监听
function handleGlobalMouseUp(event: MouseEvent) {
  if (isDragging.value) {
    handleMouseUp(event)
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('mouseup', handleGlobalMouseUp)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  document.removeEventListener('keydown', handleKeydown)
})

// 监听选择变化
watch(currentSelection, (newSelection) => {
  if (newSelection.length > 0 && isSelectionValid.value) {
    // 可以在这里触发自动完成选择
  }
}, { deep: true })

// 暴露给父组件的方法
defineExpose({
  clearSelection,
  selectAllAvailable,
  currentSelection,
  isSelectionValid,
  selectionDuration
})
</script>

<template>
  <div
    ref="containerRef"
    class="time-slot-selector"
    :class="{
      'disabled': disabled,
      'dragging': isDragging
    }"
  >
    <!-- 工具栏 -->
    <div v-if="!disabled" class="selector-toolbar mb-4 p-3 bg-gray-50 rounded-lg border">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h3 class="text-sm font-medium text-gray-700">选择时间段</h3>

          <!-- 选择状态 -->
          <div v-if="currentSelection.length > 0" class="selection-info">
            <span class="text-sm text-blue-600">
              已选择 {{ currentSelection.length }} 个时间段
            </span>
            <span class="text-sm text-gray-500 ml-2">
              ({{ formatDuration(selectionDuration) }})
            </span>
            <span v-if="!isSelectionValid" class="text-sm text-red-500 ml-2">
              时长不符合要求 ({{ minSelectionDuration }}-{{ maxSelectionDuration }}分钟)
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            v-if="allowMultipleSelection && currentSelection.length > 0"
            @click="clearSelection"
            class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            :disabled="disabled"
          >
            清除选择
          </button>

          <button
            v-if="allowMultipleSelection"
            @click="selectAllAvailable"
            class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            :disabled="disabled"
          >
            全选可用
          </button>
        </div>
      </div>
    </div>

    <!-- 时间槽网格 -->
    <div class="time-slots-grid">
      <div
        v-for="(slots, hour) in slotsByHour"
        :key="hour"
        class="hour-group mb-4"
      >
        <div class="hour-label">
          <span class="text-sm font-medium text-gray-600 sticky top-0 bg-gray-50 px-2 py-1">
            {{ hour }}
          </span>
        </div>

        <div class="slots-container grid gap-2">
          <div
            v-for="slot in slots"
            :key="slot.id"
            class="time-slot-item"
            :class="[
              getSlotColor(slot),
              {
                'in-drag-selection': isSlotInDragSelection(slot),
                'hover-slot': hoverSlot?.id === slot.id,
                'disabled': disabled || slot.status === 'unavailable' || slot.status === 'maintenance',
                'selected': currentSelection.some(s => s.id === slot.id)
              }
            ]"
            @click="handleSlotClick(slot, $event)"
            @mousedown="handleMouseDown(slot, $event)"
            @mouseenter="handleMouseEnter(slot, $event)"
            @mouseup="handleMouseUp($event)"
            :aria-label="getSlotAriaLabel(slot)"
            :aria-selected="currentSelection.some(s => s.id === slot.id)"
            :aria-disabled="disabled || slot.status === 'unavailable' || slot.status === 'maintenance'"
            role="button"
            tabindex="0"
          >
            <!-- 时间范围 -->
            <div class="time-range text-xs font-medium">
              {{ formatTimeRange(slot) }}
            </div>

            <!-- 状态指示器 -->
            <div class="status-indicator">
              <span v-if="slot.status === 'available'" class="text-green-600">
                <i class="pi pi-check-circle"></i> 可用
              </span>
              <span v-else-if="slot.status === 'unavailable'" class="text-red-600">
                <i class="pi pi-times-circle"></i> 已预约
              </span>
              <span v-else-if="slot.status === 'maintenance'" class="text-orange-600">
                <i class="pi pi-exclamation-triangle"></i> 维护中
              </span>
              <span v-else-if="slot.status === 'selected'" class="text-blue-600">
                <i class="pi pi-check"></i> 已选择
              </span>
            </div>

            <!-- 预约详情 -->
            <div v-if="showReservationDetails && slot.reservationId" class="reservation-details text-xs opacity-75">
              <div class="truncate">预约ID: {{ slot.reservationId }}</div>
              <div v-if="slot.conflictInfo" class="text-red-500 truncate">
                <i class="pi pi-exclamation-triangle"></i> {{ slot.conflictInfo.description }}
              </div>
            </div>

            <!-- 选中标记 -->
            <div v-if="currentSelection.some(s => s.id === slot.id)" class="selected-mark">
              <i class="pi pi-check text-white"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 拖拽选择预览 -->
    <div
      v-if="isDragging && selectionPreview.length > 0"
      class="drag-selection-overlay"
    >
      <div class="selection-preview">
        <span class="text-sm text-blue-600">
          正在选择 {{ selectionPreview.length }} 个时间段
        </span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="availableSlots.length === 0" class="empty-state text-center py-8">
      <div class="text-gray-500">
        <i class="pi pi-calendar-times text-4xl mb-2"></i>
        <p class="text-sm">暂无可选时间段</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.time-slot-selector {
  @apply relative;
}

.time-slot-selector.disabled {
  @apply opacity-60 pointer-events-none;
}

.time-slot-selector.dragging {
  @apply select-none;
}

.selector-toolbar {
  @apply sticky top-0 z-10 backdrop-blur-sm;
}

.hour-group {
  @apply border-l-2 border-gray-200 pl-4;
}

.hour-label {
  @apply mb-2 -ml-2;
}

.slots-container {
  @apply grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}

.time-slot-item {
  @apply relative p-3 border rounded-lg cursor-pointer transition-all duration-200;
  @apply hover:shadow-md hover:scale-105;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

.time-slot-item.disabled {
  @apply cursor-not-allowed hover:scale-100 hover:shadow-none;
}

.time-slot-item.selected {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

.time-slot-item.in-drag-selection {
  @apply bg-blue-100 border-blue-400;
}

.time-slot-item.hover-slot:not(.disabled) {
  @apply shadow-lg transform -translate-y-1;
}

.time-range {
  @apply font-mono;
}

.status-indicator {
  @apply flex items-center space-x-1 mt-1;
}

.reservation-details {
  @apply mt-1 space-y-1;
}

.selected-mark {
  @apply absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center;
}

.drag-selection-overlay {
  @apply fixed inset-0 bg-blue-50 bg-opacity-20 pointer-events-none z-50 flex items-center justify-center;
}

.selection-preview {
  @apply bg-white px-4 py-2 rounded-lg shadow-lg border border-blue-300;
}

.empty-state {
  @apply text-gray-500;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .slots-container {
    @apply grid-cols-1;
  }

  .selector-toolbar {
    @apply flex-col space-y-2;
  }

  .selector-toolbar > div {
    @apply flex-col space-y-2;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .time-slot-item {
    @apply border-2;
  }

  .time-slot-item.selected {
    @apply border-blue-600;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .selector-toolbar {
    @apply bg-gray-800 border-gray-700;
  }

  .hour-label span {
    @apply bg-gray-800 text-gray-300;
  }

  .time-slot-item {
    @apply border-gray-600;
  }

  .empty-state {
    @apply text-gray-400;
  }
}

/* 动画效果 */
.time-slot-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 拖拽选择时的视觉反馈 */
.time-slot-selector.dragging .time-slot-item:not(.disabled) {
  @apply cursor-crosshair;
}

/* 无障碍支持 */
.time-slot-item:focus-visible {
  @apply ring-2 ring-blue-500 ring-offset-2;
}
</style>