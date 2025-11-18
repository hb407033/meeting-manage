<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { format, addDays, startOfDay, addHours, addMinutes, isToday, isTomorrow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 导入时间选择器组件
import TimeSlotSelector from '~/components/features/reservations/TimeSlotSelectorSimple.vue'

// 页面设置
definePageMeta({
  layout: 'default',
  title: '会议室预约',
  description: '查看会议室可用时间并创建预约'
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
const message = ref('欢迎使用会议室预约系统!')
const selectedRoom = ref('')
const selectedTimeSlots = ref<TimeSlot[]>([])
const reservationTitle = ref('')
const reservationDate = ref(format(new Date(), 'yyyy-MM-dd'))
const reservationHost = ref('')
const reservationAttendees = ref<string[]>([])
const attendeeInput = ref('')
const reservationDescription = ref('')
const isSubmitting = ref(false)

// 模拟会议室数据
const mockRooms = ref([
  {
    id: '1',
    name: '会议室 A',
    capacity: 10,
    status: 'available',
    operatingHours: {
      start: '09:00',  // 上午9点开始
      end: '18:00'     // 下午6点结束
    }
  },
  {
    id: '2',
    name: '会议室 B',
    capacity: 6,
    status: 'available',
    operatingHours: {
      start: '08:00',  // 上午8点开始
      end: '20:00'     // 晚上8点结束
    }
  },
  {
    id: '3',
    name: '会议室 C',
    capacity: 20,
    status: 'available',
    operatingHours: {
      start: '08:30',  // 上午8:30开始
      end: '17:30'     // 下午5:30结束
    }
  }
])

// 生成模拟时间槽数据 - 基于选择的日期和会议室设置
const generateTimeSlots = (roomId: string, targetDate: Date): TimeSlot[] => {
  const slots: TimeSlot[] = []

  // 获取会议室的营业时间设置
  const room = mockRooms.value.find(r => r.id === roomId)
  if (!room) return slots

  const { start: startHourStr, end: endHourStr } = room.operatingHours
  const startHour = parseInt(startHourStr.split(':')[0])
  const startMinute = parseInt(startHourStr.split(':')[1])
  const endHour = parseInt(endHourStr.split(':')[0])
  const endMinute = parseInt(endHourStr.split(':')[1])

  // 生成指定日期的时间槽 - 根据会议室的营业时间
  let currentTime = addMinutes(addHours(targetDate, startHour), startMinute)
  const endTime = addMinutes(addHours(targetDate, endHour), endMinute)

  while (currentTime < endTime) {
    const slotEndTime = addMinutes(currentTime, 30)

    // 确保不超出营业时间
    if (slotEndTime > endTime) break

    // 随机生成一些不可用的时间段（工作时间的30%不可用）
    const currentHour = currentTime.getHours()
    let isUnavailable = Math.random() < 0.3

    // 午餐时间（12:00-13:30）不可用性更高
    if (currentHour >= 12 && currentHour < 13.5) {
      isUnavailable = Math.random() < 0.7
    }

    // 清晨和傍晚时段不可用性较低
    if ((currentHour >= startHour && currentHour < startHour + 1) ||
        (currentHour >= endHour - 1 && currentHour < endHour)) {
      isUnavailable = Math.random() < 0.1
    }

    const isMaintenance = Math.random() < 0.02

    slots.push({
      id: `${roomId}-${currentTime.getTime()}`,
      startTime: currentTime,
      endTime: slotEndTime,
      status: isUnavailable ? 'unavailable' : (isMaintenance ? 'maintenance' : 'available'),
      roomId
    })

    currentTime = slotEndTime
  }

  return slots
}

// 计算可用时间槽 - 基于选择的日期
const availableTimeSlots = computed(() => {
  if (!selectedRoom.value || !reservationDate.value) return []
  const targetDate = new Date(reservationDate.value)
  return generateTimeSlots(selectedRoom.value, targetDate)
})

// 方法
function handleTimeSlotSelection(slots: TimeSlot[]) {
  selectedTimeSlots.value = slots
  if (slots.length > 0) {
    message.value = `已选择 ${slots.length} 个时间段`
  }
}

function handleRoomChange() {
  // 清空之前的时间选择
  selectedTimeSlots.value = []
  const room = mockRooms.value.find(r => r.id === selectedRoom.value)
  if (room) {
    message.value = `已选择会议室：${room.name} (${room.operatingHours.start} - ${room.operatingHours.end})`
  }
}

function handleDateChange() {
  // 日期变更时清空时间选择
  selectedTimeSlots.value = []
  message.value = `已选择日期：${format(new Date(reservationDate.value), 'MM月dd日', { locale: zhCN })}`
}

function addAttendee() {
  const attendee = attendeeInput.value.trim()
  if (attendee && !reservationAttendees.value.includes(attendee)) {
    reservationAttendees.value.push(attendee)
    attendeeInput.value = ''
  }
}

function removeAttendee(attendee: string) {
  const index = reservationAttendees.value.indexOf(attendee)
  if (index > -1) {
    reservationAttendees.value.splice(index, 1)
  }
}

async function handleReservationSubmit() {
  if (!selectedRoom.value) {
    message.value = '请选择会议室'
    return
  }

  if (!reservationDate.value) {
    message.value = '请选择会议日期'
    return
  }

  if (selectedTimeSlots.value.length === 0) {
    message.value = '请选择预约时间'
    return
  }

  if (!reservationTitle.value.trim()) {
    message.value = '请输入会议主题'
    return
  }

  if (!reservationHost.value.trim()) {
    message.value = '请输入会议主持人'
    return
  }

  isSubmitting.value = true
  message.value = '正在提交预约...'

  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))

    const reservation = {
      roomId: selectedRoom.value,
      title: reservationTitle.value,
      date: reservationDate.value,
      host: reservationHost.value,
      attendees: reservationAttendees.value,
      description: reservationDescription.value,
      timeSlots: selectedTimeSlots.value,
      createdAt: new Date()
    }

    console.log('预约创建成功:', reservation)

    // 重置表单
    selectedRoom.value = ''
    reservationDate.value = format(new Date(), 'yyyy-MM-dd')
    selectedTimeSlots.value = []
    reservationTitle.value = ''
    reservationHost.value = ''
    reservationAttendees.value = []
    reservationDescription.value = ''

    message.value = '预约创建成功！'

  } catch (error) {
    console.error('预约创建失败:', error)
    message.value = '预约创建失败，请重试'
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

// 监听日期变化
watch(reservationDate, (newDate) => {
  if (newDate) {
    selectedTimeSlots.value = []
  }
})

// 生命周期
onMounted(() => {
  console.log('✅ Reservations page mounted successfully!')
  message.value = '页面加载成功！请填写左侧表单并选择时间'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面标题 -->
    <div class="bg-white shadow-sm border-b">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">会议室预约</h1>
            <p class="mt-1 text-gray-600">填写预约信息并选择时间</p>
          </div>
          <div class="flex gap-3">
            <NuxtLink
              to="/reservations"
              class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-list"></i>
              预约列表
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

    <!-- 状态消息 -->
    <div v-if="message" class="container mx-auto px-4 py-3">
      <div :class="[
        'rounded-lg p-4 flex items-center gap-3',
        message.includes('成功') ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
      ]">
        <i :class="message.includes('成功') ? 'pi pi-check-circle text-green-600' : 'pi pi-info-circle text-blue-600'"></i>
        <span :class="message.includes('成功') ? 'text-green-800' : 'text-blue-800'">{{ message }}</span>
      </div>
    </div>

    <!-- 主要内容区域：左右两列布局 -->
    <div class="container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- 左侧：预约表单信息 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <i class="pi pi-file-edit text-blue-600"></i>
            预约信息
          </h2>

          <form @submit.prevent="handleReservationSubmit" class="space-y-6">
            <!-- 会议室选择 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                选择会议室 <span class="text-red-500">*</span>
              </label>
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

            <!-- 会议主题 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                会议主题 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="reservationTitle"
                type="text"
                placeholder="请输入会议主题"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <!-- 会议日期 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                会议日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="reservationDate"
                type="date"
                :min="format(new Date(), 'yyyy-MM-dd')"
                @change="handleDateChange"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <!-- 会议主持人 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                会议主持人 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="reservationHost"
                type="text"
                placeholder="请输入主持人姓名"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <!-- 会议参与人 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                会议参与人
              </label>
              <div class="space-y-2">
                <div class="flex gap-2">
                  <input
                    v-model="attendeeInput"
                    type="text"
                    placeholder="输入参与人姓名后按回车添加"
                    @keydown.enter.prevent="addAttendee"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    @click="addAttendee"
                    class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                  >
                    <i class="pi pi-plus"></i>
                  </button>
                </div>

                <!-- 已添加的参与人标签 -->
                <div v-if="reservationAttendees.length > 0" class="flex flex-wrap gap-2">
                  <span
                    v-for="attendee in reservationAttendees"
                    :key="attendee"
                    class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {{ attendee }}
                    <button
                      type="button"
                      @click="removeAttendee(attendee)"
                      class="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </span>
                </div>
              </div>
            </div>

            <!-- 会议描述 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                会议描述
              </label>
              <textarea
                v-model="reservationDescription"
                placeholder="请输入会议详细描述（可选）"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              ></textarea>
            </div>

            <!-- 提交按钮 -->
            <button
              type="submit"
              :disabled="isSubmitting || !selectedRoom || !reservationDate || selectedTimeSlots.length === 0"
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

        <!-- 右侧：时间选择组件 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <i class="pi pi-clock text-blue-600"></i>
            时间选择
          </h2>

          <!-- 显示选择的日期 -->
          <div v-if="reservationDate" class="mb-4 p-3 bg-blue-50 rounded-lg">
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar text-blue-600"></i>
              <span class="text-sm font-medium text-blue-900">
                选择日期：{{ format(new Date(reservationDate), 'yyyy年MM月dd日', { locale: zhCN }) }}
              </span>
            </div>
          </div>

          <!-- 时间选择器 -->
          <div v-if="selectedRoom && reservationDate">
            <div class="mb-4">
              <p class="text-sm text-gray-600">请点击选择时间段：</p>
            </div>

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

            <!-- 选择汇总 -->
            <div v-if="selectedTimeSlots.length > 0" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-green-900">
                  <i class="pi pi-check-circle mr-1"></i>
                  已选择 {{ selectedTimeSlots.length }} 个时间段
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
                  {{ formatTimeSlot(slot) }}
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

          <!-- 提示信息 -->
          <div v-else-if="!selectedRoom" class="text-center py-12">
            <i class="pi pi-info-circle text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">请先在左侧选择会议室</p>
          </div>

          <div v-else-if="!reservationDate" class="text-center py-12">
            <i class="pi pi-calendar text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">请先在左侧选择会议日期</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  @apply max-w-7xl;
}
</style>