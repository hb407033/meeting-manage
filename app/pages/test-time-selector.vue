<script setup lang="ts">
import { ref, computed } from 'vue'
import { format, addDays, startOfDay, addHours, addMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 导入时间选择器组件
import TimeSlotSelector from '~/components/features/reservations/TimeSlotSelectorSimple.vue'

// 页面设置
definePageMeta({
  layout: 'default',
  title: '时间选择器测试',
  description: '测试时间选择器组件的样式和功能'
})

// 时间选择器接口类型
interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  status: 'available' | 'unavailable' | 'maintenance' | 'selected'
  roomId?: string
  reservationId?: string
  conflictInfo?: any
}

// 响应式数据
const selectedRoom = ref('1')
const selectedTimeSlots = ref<TimeSlot[]>([])
const testMessage = ref('时间选择器测试页面')

// 模拟会议室数据
const mockRooms = ref([
  { id: '1', name: '会议室 A', capacity: 10, status: 'available' },
  { id: '2', name: '会议室 B', capacity: 6, status: 'available' },
  { id: '3', name: '会议室 C', capacity: 20, status: 'available' }
])

// 生成模拟时间槽数据
const generateTimeSlots = (roomId: string): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const startDate = startOfDay(new Date())

  // 生成今天和明天的时间槽
  for (let day = 0; day < 2; day++) {
    const currentDay = addDays(startDate, day)

    // 生成 8:00 - 18:00 的时间槽，每个30分钟
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = addMinutes(addHours(currentDay, hour), minute)
        const endTime = addMinutes(startTime, 30)

        // 生成一些固定的可用和不可用时间段，便于测试
        let status: 'available' | 'unavailable' | 'maintenance' = 'available'

        // 上午10-12点设为不可用
        if (hour >= 10 && hour < 12) {
          status = 'unavailable'
        }
        // 下午3-4点设为维护
        else if (hour >= 15 && hour < 16) {
          status = 'maintenance'
        }

        slots.push({
          id: `${roomId}-${startTime.getTime()}`,
          startTime,
          endTime,
          status,
          roomId
        })
      }
    }
  }

  return slots
}

// 计算可用时间槽
const availableTimeSlots = computed(() => {
  if (!selectedRoom.value) return []
  return generateTimeSlots(selectedRoom.value)
})

// 方法
function handleTimeSlotSelection(slots: TimeSlot[]) {
  selectedTimeSlots.value = slots
  if (slots.length > 0) {
    testMessage.value = `✅ 已选择 ${slots.length} 个时间段 - 时间选择器工作正常！`
    console.log('时间选择器测试成功:', slots)
  } else {
    testMessage.value = '时间选择器已重置'
  }
}

function handleRoomChange() {
  // 清空之前的时间选择
  selectedTimeSlots.value = []
  testMessage.value = `已切换到会议室：${mockRooms.value.find(r => r.id === selectedRoom.value)?.name}`
}

function testFormSubmit() {
  if (selectedTimeSlots.value.length === 0) {
    testMessage.value = '❌ 请先选择时间段'
    return
  }

  testMessage.value = `✅ 提交测试成功！选择了 ${selectedTimeSlots.value.length} 个时间段`
  console.log('表单提交测试成功:', {
    room: selectedRoom.value,
    timeSlots: selectedTimeSlots.value,
    timestamp: new Date()
  })
}

function formatTimeSlot(slot: TimeSlot): string {
  return `${format(slot.startTime, 'MM/dd HH:mm', { locale: zhCN })} - ${format(slot.endTime, 'HH:mm', { locale: zhCN })}`
}

function getTotalDuration(): string {
  if (selectedTimeSlots.value.length === 0) return '0分钟'

  const totalMinutes = selectedTimeSlots.value.reduce((total, slot) => {
    return total + (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60)
  }, 0)

  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)}分钟`
  } else {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto px-4 max-w-6xl">
      <!-- 页面标题 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">⏰ 时间选择器测试页面</h1>
        <p class="text-gray-600">测试时间选择器组件的样式和交互功能</p>
      </div>

      <!-- 测试状态消息 -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center gap-3">
          <i class="pi pi-info-circle text-blue-600"></i>
          <span class="text-blue-800 font-medium">{{ testMessage }}</span>
        </div>
      </div>

      <!-- 测试控制面板 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">🎛️ 测试控制</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 会议室选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">选择测试会议室</label>
            <select
              v-model="selectedRoom"
              @change="handleRoomChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option
                v-for="room in mockRooms"
                :key="room.id"
                :value="room.id"
              >
                {{ room.name }} ({{ room.capacity }}人)
              </option>
            </select>
          </div>

          <!-- 测试提交按钮 -->
          <div class="flex items-end">
            <button
              @click="testFormSubmit"
              :disabled="selectedTimeSlots.length === 0"
              class="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              🧪 测试提交功能
            </button>
          </div>
        </div>

        <!-- 选择状态汇总 -->
        <div v-if="selectedTimeSlots.length > 0" class="mt-4 p-3 bg-green-50 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-green-900">
              ✅ 已选择 {{ selectedTimeSlots.length }} 个时间段
            </span>
            <span class="text-sm text-green-700">
              总时长：{{ getTotalDuration() }}
            </span>
          </div>
          <div class="space-y-1">
            <div
              v-for="(slot, index) in selectedTimeSlots.slice(0, 5)"
              :key="slot.id"
              class="text-xs text-green-700"
            >
              {{ index + 1 }}. {{ formatTimeSlot(slot) }} ({{ slot.status }})
            </div>
            <div
              v-if="selectedTimeSlots.length > 5"
              class="text-xs text-green-600 italic"
            >
              还有 {{ selectedTimeSlots.length - 5 }} 个时间段...
            </div>
          </div>
        </div>
      </div>

      <!-- 时间选择器测试区域 -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">🎨 时间选择器组件测试</h2>

        <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <TimeSlotSelector
            :available-slots="availableTimeSlots"
            :selected-slots="selectedTimeSlots"
            @selection-change="handleTimeSlotSelection"
            :allow-drag-selection="true"
            :allow-multiple-selection="true"
            :min-selection-duration="30"
            :max-selection-duration="240"
            :time-slot-duration="30"
            :show-reservation-details="true"
          />
        </div>
      </div>

      <!-- 测试说明 -->
      <div class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-yellow-900 mb-2">📋 测试说明</h3>
        <ul class="text-sm text-yellow-800 space-y-1">
          <li>• <strong>点击测试</strong>：点击绿色可用时间段查看选择效果</li>
          <li>• <strong>拖拽测试</strong>：按住鼠标拖拽选择多个时间段</li>
          <li>• <strong>样式测试</strong>：观察时间段的颜色、悬浮效果和选中状态</li>
          <li>• <strong>功能测试</strong>：选择时间段后点击"测试提交功能"按钮</li>
          <li>• <strong>状态说明</strong>：绿色=可用，红色=已预约，橙色=维护中，蓝色=已选择</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  @apply max-w-6xl;
}
</style>