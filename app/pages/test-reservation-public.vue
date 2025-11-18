<script setup lang="ts">
import { ref, computed } from 'vue'
import { format, addDays, startOfDay, addHours, addMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 页面设置 - 不需要认证
definePageMeta({
  layout: 'default',
  title: '会议室预约测试',
  description: '会议室预约功能测试页面（公开访问）'
})

// 导入时间选择器组件
import TimeSlotSelector from '~/components/features/reservations/TimeSlotSelectorSimple.vue'

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
const selectedRoom = ref('')
const selectedTimeSlots = ref<TimeSlot[]>([])
const reservationTitle = ref('')
const reservationDescription = ref('')
const isSubmitting = ref(false)
const submitMessage = ref('')

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

        // 生成一些固定的可用和不可用时间段
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
  submitMessage.value = slots.length > 0 ? `已选择 ${slots.length} 个时间段` : ''
}

function handleRoomChange() {
  // 清空之前的时间选择
  selectedTimeSlots.value = []
  submitMessage.value = `已选择会议室：${mockRooms.value.find(r => r.id === selectedRoom.value)?.name}`
}

async function handleReservationSubmit() {
  if (!selectedRoom.value) {
    submitMessage.value = '❌ 请选择会议室'
    return
  }

  if (selectedTimeSlots.value.length === 0) {
    submitMessage.value = '❌ 请选择预约时间'
    return
  }

  if (!reservationTitle.value.trim()) {
    submitMessage.value = '❌ 请输入会议主题'
    return
  }

  isSubmitting.value = true
  submitMessage.value = '正在提交预约...'

  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))

    const reservation = {
      roomId: selectedRoom.value,
      title: reservationTitle.value,
      description: reservationDescription.value,
      timeSlots: selectedTimeSlots.value,
      createdAt: new Date()
    }

    console.log('预约创建成功:', reservation)

    // 重置表单
    selectedRoom.value = ''
    selectedTimeSlots.value = []
    reservationTitle.value = ''
    reservationDescription.value = ''

    submitMessage.value = `✅ 预约创建成功！会议室：${reservation.roomId}，主题：${reservation.title}`

  } catch (error) {
    console.error('预约创建失败:', error)
    submitMessage.value = '❌ 预约创建失败，请重试'
  } finally {
    isSubmitting.value = false
  }
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
    <div class="container mx-auto px-4 max-w-4xl">
      <!-- 页面标题 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">会议室预约系统</h1>
        <p class="text-gray-600">选择会议室和时间段，创建会议预约</p>
      </div>

      <!-- 状态消息 -->
      <div v-if="submitMessage" class="mb-6 p-4 rounded-lg border" :class="[
        submitMessage.includes('✅') ? 'bg-green-50 border-green-200 text-green-800' :
        submitMessage.includes('❌') ? 'bg-red-50 border-red-200 text-red-800' :
        'bg-blue-50 border-blue-200 text-blue-800'
      ]">
        <div class="flex items-center gap-2">
          <i :class="[
            submitMessage.includes('✅') ? 'pi pi-check-circle text-green-600' :
            submitMessage.includes('❌') ? 'pi pi-times-circle text-red-600' :
            'pi pi-info-circle text-blue-600'
          ]"></i>
          <span>{{ submitMessage }}</span>
        </div>
      </div>

      <!-- 预约表单 -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <form @submit.prevent="handleReservationSubmit" class="space-y-6">
          <!-- 会议室选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">选择会议室 *</label>
            <select
              v-model="selectedRoom"
              @change="handleRoomChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">请选择会议室</option>
              <option
                v-for="room in mockRooms.filter(r => r.status === 'available')"
                :key="room.id"
                :value="room.id"
              >
                {{ room.name }} ({{ room.capacity }}人)
              </option>
            </select>
          </div>

          <!-- 时间选择 -->
          <div v-if="selectedRoom">
            <label class="block text-sm font-medium text-gray-700 mb-2">选择预约时间 *</label>
            <div class="border rounded-lg p-4 bg-gray-50">
              <TimeSlotSelector
                :available-slots="availableTimeSlots"
                :selected-slots="selectedTimeSlots"
                @selection-change="handleTimeSlotSelection"
              />
            </div>

            <!-- 选择汇总 -->
            <div v-if="selectedTimeSlots.length > 0" class="mt-3 p-3 bg-blue-50 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-blue-900">
                  已选择 {{ selectedTimeSlots.length }} 个时间段
                </span>
                <span class="text-sm text-blue-700">
                  总时长：{{ getTotalDuration() }}
                </span>
              </div>
              <div class="space-y-1">
                <div
                  v-for="(slot, index) in selectedTimeSlots.slice(0, 3)"
                  :key="slot.id"
                  class="text-xs text-blue-700"
                >
                  {{ index + 1 }}. {{ formatTimeSlot(slot) }}
                </div>
                <div
                  v-if="selectedTimeSlots.length > 3"
                  class="text-xs text-blue-600 italic"
                >
                  还有 {{ selectedTimeSlots.length - 3 }} 个时间段...
                </div>
              </div>
            </div>
          </div>

          <!-- 会议信息 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">会议主题 *</label>
            <input
              v-model="reservationTitle"
              type="text"
              placeholder="请输入会议主题"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">会议描述</label>
            <textarea
              v-model="reservationDescription"
              placeholder="请输入会议详细描述（可选）"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>

          <!-- 提交按钮 -->
          <button
            type="submit"
            :disabled="isSubmitting || !selectedRoom || selectedTimeSlots.length === 0"
            class="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center">
              <i class="pi pi-spin pi-spinner mr-2"></i>
              正在提交...
            </span>
            <span v-else>创建预约</span>
          </button>
        </form>
      </div>

      <!-- 使用说明 -->
      <div class="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-900 mb-2">💡 使用说明</h3>
        <ul class="text-sm text-gray-700 space-y-1">
          <li>• 选择一个会议室查看可用时间段</li>
          <li>• 点击绿色时间段进行选择</li>
          <li>• 红色表示已预约，橙色表示维护中</li>
          <li>• 填写会议主题后提交预约</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  @apply max-w-4xl;
}
</style>