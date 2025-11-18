<script setup lang="ts">
import { ref, computed } from 'vue'

interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  status: 'available' | 'unavailable' | 'maintenance' | 'selected'
}

interface Props {
  availableSlots: TimeSlot[]
  selectedSlots: TimeSlot[]
}

interface Emits {
  (e: 'selectionChange', slots: TimeSlot[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function handleSlotClick(slot: TimeSlot) {
  if (slot.status !== 'available') return

  const isSelected = props.selectedSlots.some(s => s.id === slot.id)

  if (isSelected) {
    // 取消选择
    const newSelection = props.selectedSlots.filter(s => s.id !== slot.id)
    emit('selectionChange', newSelection)
  } else {
    // 添加选择
    const newSelection = [...props.selectedSlots, slot]
    emit('selectionChange', newSelection)
  }
}

function getSlotColor(slot: TimeSlot): string {
  const isSelected = props.selectedSlots.some(s => s.id === slot.id)

  if (isSelected) return 'bg-blue-500 text-white'

  switch (slot.status) {
    case 'available':
      return 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
    case 'unavailable':
      return 'bg-red-100 text-red-800 border border-red-300'
    case 'maintenance':
      return 'bg-orange-100 text-orange-800 border border-orange-300'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300'
  }
}

function formatTimeSlot(slot: TimeSlot): string {
  const start = slot.startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const end = slot.endTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return `${start} - ${end}`
}
</script>

<template>
  <div class="time-slot-selector-simple">
    <div class="mb-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-700">选择时间段</h3>
        <div v-if="selectedSlots.length > 0" class="text-sm text-blue-600">
          已选择 {{ selectedSlots.length }} 个时间段
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="slot in availableSlots"
        :key="slot.id"
        :class="[
          'p-3 rounded-lg cursor-pointer transition-all duration-200 border',
          'hover:shadow-md hover:scale-105',
          getSlotColor(slot),
          slot.status !== 'available' ? 'cursor-not-allowed opacity-60' : ''
        ]"
        @click="handleSlotClick(slot)"
      >
        <div class="text-sm font-medium">
          {{ formatTimeSlot(slot) }}
        </div>
        <div class="text-xs mt-1">
          <span v-if="slot.status === 'available'" class="text-green-600">✓ 可用</span>
          <span v-else-if="slot.status === 'unavailable'" class="text-red-600">✗ 已预约</span>
          <span v-else-if="slot.status === 'maintenance'" class="text-orange-600">⚠ 维护中</span>
        </div>
      </div>
    </div>

    <div v-if="availableSlots.length === 0" class="text-center py-8 text-gray-500">
      <p class="text-sm">暂无可选时间段</p>
    </div>
  </div>
</template>

<style scoped>
.time-slot-selector-simple {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>