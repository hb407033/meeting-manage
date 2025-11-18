<template>
  <div class="calendar-placeholder">
    <div class="p-6 bg-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-4">日历视图</h2>
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-blue-800">
          <i class="pi pi-info-circle mr-2"></i>
          日历组件正在修复中...
        </p>
        <p class="text-sm text-blue-600 mt-2">
          FullCalendar Vue 3 兼容性问题已识别，正在处理中。
        </p>
      </div>

      <!-- 临时的时间选择界面 -->
      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-3">快速时间选择</h3>
        <div class="grid grid-cols-3 gap-4">
          <button
            v-for="slot in timeSlots"
            :key="slot.id"
            @click="selectTimeSlot(slot)"
            class="p-3 border rounded-lg hover:bg-blue-50 transition-colors"
          >
            <div class="font-medium">{{ slot.start }}</div>
            <div class="text-sm text-gray-600">{{ slot.end }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TimeSlot {
  id: string
  start: string
  end: string
  available: boolean
}

interface Props {
  roomIds?: string[]
  selectedTimeRange?: {
    start: Date
    end: Date
  }
  viewMode?: string
  height?: string | number
  selectable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true
})

const emit = defineEmits<{
  selectTimeRange: [{ start: Date; end: Date }]
  eventClick: [event: any]
}>()

// 临时的时间段数据
const timeSlots: TimeSlot[] = [
  { id: '1', start: '09:00', end: '10:00', available: true },
  { id: '2', start: '10:00', end: '11:00', available: true },
  { id: '3', start: '11:00', end: '12:00', available: false },
  { id: '4', start: '14:00', end: '15:00', available: true },
  { id: '5', start: '15:00', end: '16:00', available: true },
  { id: '6', start: '16:00', end: '17:00', available: false },
]

function selectTimeSlot(slot: TimeSlot) {
  if (!slot.available) return

  const now = new Date()
  const startDate = new Date(now)
  const [startHour, startMin] = slot.start.split(':')
  startDate.setHours(parseInt(startHour), parseInt(startMin), 0, 0)

  const endDate = new Date(now)
  const [endHour, endMin] = slot.end.split(':')
  endDate.setHours(parseInt(endHour), parseInt(endMin), 0, 0)

  emit('selectTimeRange', { start: startDate, end: endDate })
}
</script>

<style scoped>
.calendar-placeholder {
  min-height: 400px;
}
</style>