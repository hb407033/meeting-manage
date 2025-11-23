<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { format, addDays, startOfDay, addHours, addMinutes, isToday, isTomorrow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRoute, useRouter } from 'vue-router'

// 导入时间选择器组件
import TimeSlotSelector from '~/components/features/reservations/TimeSlotSelectorSimple.vue'

// 导入store
import { useReservationStore } from '~/stores/reservations'
import { useRoomStore } from '~/stores/rooms'

// 导入认证composable
import { useAuth } from '~/composables/useAuth'

// 使用路由
const route = useRoute()
const router = useRouter()

// 检查是否为编辑模式
const isEditMode = computed(() => !!route.query.edit)
const editReservationId = computed(() => route.query.edit as string)

// 页面设置
definePageMeta({
  layout: 'default',
  title: computed(() => isEditMode.value ? '编辑预约' : '快速预约'),
  description: computed(() => isEditMode.value ? '编辑会议室预约信息' : '查看会议室可用时间并创建预约')
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

// 使用store
const reservationStore = useReservationStore()
const roomStore = useRoomStore()

// 使用认证composable
const { canAccess: _canAccess } = useAuth()

// 生成时间槽数据 - 基于选择的日期和会议室设置
const generateTimeSlots = async (roomId: string, targetDate: Date): Promise<TimeSlot[]> => {
  const slots: TimeSlot[] = []

  try {
    // 获取会议室的可用性数据
    const startTime = startOfDay(targetDate)
    const endTime = addDays(startTime, 1)

    const response = await reservationStore.checkRoomAvailability([roomId], startTime.toISOString(), endTime.toISOString())

    // 处理API返回的可用性数据
    if (response && response.data && response.data[roomId]) {
      const roomAvailability = response.data[roomId]

      // 将时间段转换为TimeSlot格式
      roomAvailability.availableSlots?.forEach((slot: any, index: number) => {
        slots.push({
          id: `${roomId}-${index}`,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          status: 'available',
          roomId
        })
      })

      // 添加已预约的时间段
      roomAvailability.reservations?.forEach((reservation: any, index: number) => {
        slots.push({
          id: `${roomId}-reserved-${index}`,
          startTime: new Date(reservation.startTime),
          endTime: new Date(reservation.endTime),
          status: 'unavailable',
          roomId,
          reservationId: reservation.id
        })
      })
    }

    // 如果API调用失败，使用默认的时间段生成
    if (slots.length === 0) {
      // 默认营业时间 9:00-18:00
      let currentTime = addHours(targetDate, 9)
      const dayEndTime = addHours(targetDate, 18)

      while (currentTime < dayEndTime) {
        const slotEndTime = addMinutes(currentTime, 30)

        slots.push({
          id: `${roomId}-${currentTime.getTime()}`,
          startTime: currentTime,
          endTime: slotEndTime,
          status: 'available',
          roomId
        })

        currentTime = slotEndTime
      }
    }

  } catch (error) {
    console.error('获取可用性数据失败:', error)
    // 返回默认时间段
    let currentTime = addHours(targetDate, 9)
    const dayEndTime = addHours(targetDate, 18)

    while (currentTime < dayEndTime) {
      const slotEndTime = addMinutes(currentTime, 30)

      slots.push({
        id: `${roomId}-${currentTime.getTime()}`,
        startTime: currentTime,
        endTime: slotEndTime,
        status: 'available',
        roomId
      })

      currentTime = slotEndTime
    }
  }

  return slots
}

// 可用时间槽数据
const availableTimeSlots = ref<TimeSlot[]>([])

// 生成可用时间槽的函数
const generateAvailableTimeSlots = async () => {
  if (!selectedRoom.value || !reservationDate.value) {
    availableTimeSlots.value = []
    return
  }

  const targetDate = new Date(reservationDate.value)

  // 根据会议室预约规则设置时间范围，而不是硬编码0:00-24:00
  const getDefaultTimeRange = () => {
    return {
      start: '00:00',
      end: '23:59'
    }
  }

  // 为会议室设置基于预约规则的时间范围
  const getRoomTimeRange = (room: any) => {
    if (room?.rules?.allowedTimeRange) {
      return {
        start: room.rules.allowedTimeRange.start,
        end: room.rules.allowedTimeRange.end
      }
    }
    // 如果没有预约规则，使用营业时间
    if (room?.operatingHours) {
      return {
        start: room.operatingHours.start || '09:00',
        end: room.operatingHours.end || '18:00'
      }
    }
    // 默认时间范围
    return getDefaultTimeRange()
  }

  // 获取所选会议室并使用其时间范围
  const room = roomStore.rooms.find(r => r.id === selectedRoom.value)
  const timeRange = getRoomTimeRange(room)
  const [startHour, startMinute] = timeRange.start.split(':')
  const [endHour, endMinute] = timeRange.end.split(':')

  const startDate = new Date(targetDate)
  startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)

  const endDate = new Date(targetDate)
  endDate.setHours(parseInt(endHour), parseInt(endMinute), 59, 999)

  const startTime = startDate.toISOString()
  const endTime = endDate.toISOString()

  try {
    await reservationStore.fetchAvailability({
      roomIds: [selectedRoom.value],
      startTime,
      endTime
    })

    const roomAvailability = reservationStore.getRoomAvailability(selectedRoom.value)
    if (roomAvailability) {
      // 转换为TimeSlot格式
      const slots: TimeSlot[] = []

      // 添加可用时间段
      roomAvailability.availableSlots?.forEach((slot, index) => {
        slots.push({
          id: `${selectedRoom.value}-${index}`,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          status: 'available',
          roomId: selectedRoom.value
        })
      })

      // 添加已预约时间段
      roomAvailability.reservations?.forEach((reservation, index) => {
        slots.push({
          id: `${selectedRoom.value}-reserved-${index}`,
          startTime: new Date(reservation.startTime),
          endTime: new Date(reservation.endTime),
          status: 'unavailable',
          roomId: selectedRoom.value,
          reservationId: reservation.id
        })
      })

      availableTimeSlots.value = slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    } else {
      // 如果没有数据，生成默认时间段
      const slots = await generateTimeSlots(selectedRoom.value, targetDate)
      availableTimeSlots.value = slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    }
  } catch (error) {
    console.error('生成时间槽失败:', error)
    availableTimeSlots.value = []
  }
}

// 方法
function handleTimeSlotSelection(slots: TimeSlot[]) {
  selectedTimeSlots.value = slots
  if (slots.length > 0) {
    message.value = `已选择 ${slots.length} 个时间段`
  }
}

async function handleRoomChange() {
  // 清空之前的时间选择
  selectedTimeSlots.value = []
  const room = roomStore.rooms.find(r => r.id === selectedRoom.value)
  if (room) {
    message.value = `已选择会议室：${room.name}`
  }

  // 重新生成可用时间槽
  await generateAvailableTimeSlots()
}

async function handleDateChange() {
  // 日期变更时清空时间选择
  selectedTimeSlots.value = []
  message.value = `已选择日期：${format(new Date(reservationDate.value), 'MM月dd日', { locale: zhCN })}`

  // 重新生成可用时间槽
  await generateAvailableTimeSlots()
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
  message.value = isEditMode.value ? '正在更新预约...' : '正在提交预约...'

  try {
    // 获取最早和最晚时间作为开始和结束时间
    const startTime = new Date(Math.min(...selectedTimeSlots.value.map(slot => slot.startTime.getTime())))
    const endTime = new Date(Math.max(...selectedTimeSlots.value.map(slot => slot.endTime.getTime())))

    const reservationData = {
      title: reservationTitle.value.trim(),
      roomId: selectedRoom.value,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendeeCount: reservationAttendees.value.length + 1, // +1 for host
      description: reservationDescription.value.trim(),
      organizerName: reservationHost.value.trim(),
      attendees: reservationAttendees.value.map(name => ({ name }))
    }

    let response
    if (isEditMode.value && editReservationId.value) {
      // 编辑模式：更新现有预约
      response = await reservationStore.updateReservation(editReservationId.value, reservationData)
      console.warn('预约更新成功:', response)
      message.value = '预约更新成功！'
    } else {
      // 创建模式：创建新预约
      response = await reservationStore.createReservation(reservationData)
      console.warn('预约创建成功:', response)
      message.value = '预约创建成功！'
    }

    // 只有在创建模式下才重置表单
    if (!isEditMode.value) {
      selectedRoom.value = ''
      reservationDate.value = format(new Date(), 'yyyy-MM-dd')
      selectedTimeSlots.value = []
      reservationTitle.value = ''
      reservationHost.value = ''
      reservationAttendees.value = []
      reservationDescription.value = ''
    }

  } catch (err: any) {
    console.error(isEditMode.value ? '预约更新失败:' : '预约创建失败:', err)
    message.value = `${isEditMode.value ? '更新' : '创建'}预约失败: ${err.message || '未知错误'}`
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

// 加载会议室数据
async function loadRooms() {
  try {
    await roomStore.fetchRooms()
  } catch (err: any) {
    console.error('加载会议室失败:', err)
    message.value = `加载会议室失败: ${err.message}`
  }
}

// 加载编辑模式的预约数据
async function loadEditReservation() {
  if (!isEditMode.value || !editReservationId.value) return

  try {
    message.value = '正在加载预约数据...'
    await reservationStore.fetchReservation(editReservationId.value)

    const reservation = reservationStore.currentReservation
    if (!reservation) {
      message.value = '预约不存在或已被删除'
      router.push('/reservations/my')
      return
    }

    // 检查权限：只有预约组织者可以编辑
    const { user } = useAuth()
    const isOrganizer = reservation.organizerId === user?.id ||
                       reservation.organizer?.email === user?.email

    if (!isOrganizer) {
      message.value = '您没有权限编辑此预约'
      router.push('/reservations/my')
      return
    }

    // 填充表单数据
    selectedRoom.value = reservation.roomId || ''
    reservationTitle.value = reservation.title || ''
    reservationHost.value = reservation.organizerName || user?.name || ''
    reservationDescription.value = reservation.description || ''
    reservationAttendees.value = reservation.attendees?.map(a => a.name) || []

    // 设置日期
    if (reservation.startTime) {
      reservationDate.value = format(new Date(reservation.startTime), 'yyyy-MM-dd')
    }

    // 设置时间选择器的时间段
    if (reservation.startTime && reservation.endTime) {
      const startTime = new Date(reservation.startTime)
      const endTime = new Date(reservation.endTime)

      // 创建一个时间段来表示当前预约的时间
      const timeSlot: TimeSlot = {
        id: `edit-${reservation.id}`,
        startTime,
        endTime,
        status: 'selected',
        roomId: reservation.roomId,
        reservationId: reservation.id
      }

      selectedTimeSlots.value = [timeSlot]
      console.warn('🔄 已设置编辑时间段:', timeSlot)
    }

    message.value = '预约数据加载完成！您可以修改信息并选择新的时间'

  } catch (error: any) {
    console.error('加载预约数据失败:', error)
    message.value = `加载预约数据失败: ${error.message}`
  }
}

// 生命周期
onMounted(async () => {
  console.log('✅ Reservations page mounted successfully!')

  // 根据模式显示不同消息
  if (isEditMode.value) {
    message.value = '正在加载编辑数据...'
  } else {
    message.value = '页面加载成功！请填写左侧表单并选择时间'
  }

  // 加载会议室数据
  await loadRooms()

  // 如果是编辑模式，加载预约数据
  if (isEditMode.value) {
    await loadEditReservation()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <UniversalHeader />

    <!-- 状态消息 -->
    <div v-if="message" class="container mx-auto my-0 px-4 py-3">
      <div :class="[
        'rounded-lg p-4 flex items-center gap-3',
        message.includes('成功') ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
      ]">
        <i :class="message.includes('成功') ? 'pi pi-check-circle text-green-600' : 'pi pi-info-circle text-blue-600'"></i>
        <span :class="message.includes('成功') ? 'text-green-800' : 'text-blue-800'">{{ message }}</span>
      </div>
    </div>

    <!-- 预约类型选择 -->
    <div class="container mx-auto px-4 py-6">
      <!-- <div class="mb-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <i class="pi pi-question-circle"></i>
                预约方式选择
              </h3>
              <p class="text-blue-700 mt-1">选择适合您需求的预约方式</p>
            </div>
            <Button
              label="使用详细配置"
              icon="pi pi-cog"
              class="p-button-outlined"
              @click="$router.push('/reservations/detailed')"
            />
          </div>
        </div>
      </div> -->

      <!-- 主要内容区域：左右两列布局 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- 左侧：预约表单信息 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <i class="pi pi-file-edit text-blue-600"></i>
            快速预约
          </h2>

          <form @submit.prevent="handleReservationSubmit" class="space-y-3">
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
                  v-for="room in roomStore.rooms.filter(r => r.status === 'AVAILABLE')"
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
              <span v-else>快速创建预约</span>
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

      <!-- 快速预约功能说明 -->
      <div class="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <i class="pi pi-bolt text-yellow-600"></i>
          快速预约特点
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-700">
          <div class="flex items-start gap-2">
            <i class="pi pi-check text-green-600 mt-0.5"></i>
            <span>基础信息填写，快速完成预约</span>
          </div>
          <div class="flex items-start gap-2">
            <i class="pi pi-check text-green-600 mt-0.5"></i>
            <span>支持会议室选择和时间安排</span>
          </div>
          <div class="flex items-start gap-2">
            <i class="pi pi-check text-green-600 mt-0.5"></i>
            <span>适合简单会议和临时预约</span>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-200">
          <p class="text-xs text-gray-600">
            <i class="pi pi-info-circle mr-1"></i>
            需要更多功能？<NuxtLink to="/reservations/detailed" class="text-blue-600 hover:text-blue-800 underline">使用详细预约配置</NuxtLink>支持设备选择、服务预订、材料上传等完整功能。
          </p>
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