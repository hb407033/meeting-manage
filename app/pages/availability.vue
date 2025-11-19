<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, addDays, startOfWeek, endOfWeek, isToday, isAfter, isBefore } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 导入store
import { useReservationStore } from '~/stores/reservations'
import { useRoomStore } from '~/stores/rooms'

// 使用store
const reservationStore = useReservationStore()
const roomStore = useRoomStore()

// 页面设置
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

// 选择的条件
const selectedRoom = ref<string>('')
const selectedDate = ref<string>(format(new Date(), 'yyyy-MM-dd'))
const viewMode = ref<'daily' | 'weekly'>('daily')

// 时间段数据
interface TimeSlot {
  roomId: string
  startTime: Date
  endTime: Date
  status: 'available' | 'occupied' | 'maintenance'
  reservation?: {
    title: string
    organizer: string
  }
}

const timeSlots = ref<TimeSlot[]>([])

// 生成时间槽数据 - 从store获取真实数据
const generateTimeSlots = async (): Promise<TimeSlot[]> => {
  const slots: TimeSlot[] = []
  const targetDate = new Date(selectedDate.value)
  const startTime = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString()
  const endTime = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString()

  if (!selectedRoom.value || selectedRoom.value === '') {
    // 如果选择了全部会议室，为每个会议室获取数据
    const roomIds = roomStore.rooms.map(room => room.id)

    try {
      await reservationStore.fetchAvailability({
        roomIds,
        startTime,
        endTime
      })

      // 从store获取可用性数据并转换为TimeSlot格式
      roomIds.forEach(roomId => {
        const roomAvailability = reservationStore.getRoomAvailability(roomId)
        if (roomAvailability) {
          // 添加可用时间段
          roomAvailability.availableSlots?.forEach((slot, index) => {
            slots.push({
              roomId,
              startTime: new Date(slot.startTime),
              endTime: new Date(slot.endTime),
              status: 'available'
            })
          })

          // 添加已预约时间段
          roomAvailability.reservations?.forEach((reservation, index) => {
            slots.push({
              roomId,
              startTime: new Date(reservation.startTime),
              endTime: new Date(reservation.endTime),
              status: 'occupied',
              reservation: {
                title: reservation.title,
                organizer: reservation.organizer?.name || reservation.organizerName || '未知'
              }
            })
          })
        }
      })
    } catch (error) {
      console.error('获取可用性数据失败:', error)
    }
  } else {
    // 为特定会议室获取数据
    try {
      await reservationStore.fetchAvailability({
        roomIds: [selectedRoom.value],
        startTime,
        endTime
      })

      const roomAvailability = reservationStore.getRoomAvailability(selectedRoom.value)
      if (roomAvailability) {
        // 添加可用时间段
        roomAvailability.availableSlots?.forEach((slot, index) => {
          slots.push({
            roomId: selectedRoom.value,
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime),
            status: 'available'
          })
        })

        // 添加已预约时间段
        roomAvailability.reservations?.forEach((reservation, index) => {
          slots.push({
            roomId: selectedRoom.value,
            startTime: new Date(reservation.startTime),
            endTime: new Date(reservation.endTime),
            status: 'occupied',
            reservation: {
              title: reservation.title,
              organizer: reservation.organizer?.name || reservation.organizerName || '未知'
            }
          })
        })
      }
    } catch (error) {
      console.error('获取可用性数据失败:', error)
    }
  }

  return slots
}

// 刷新时间槽
async function refreshTimeSlots() {
  try {
    timeSlots.value = await generateTimeSlots()
  } catch (error) {
    console.error('刷新时间槽失败:', error)
    timeSlots.value = []
  }
}

// 计算属性
const filteredRooms = computed(() => {
  if (!selectedRoom.value) return roomStore.rooms
  return roomStore.rooms.filter(room => room.id === selectedRoom.value)
})

const timeSlotsByRoom = computed(() => {
  const slotsByRoom = new Map<string, TimeSlot[]>()

  filteredRooms.value.forEach(room => {
    slotsByRoom.set(room.id, timeSlots.value.filter(slot => slot.roomId === room.id))
  })

  return slotsByRoom
})

// 统计数据
const availabilityStats = computed(() => {
  const stats = new Map<string, { available: number; occupied: number; maintenance: number; total: number }>()

  timeSlotsByRoom.value.forEach((slots, roomId) => {
    const roomStats = {
      available: slots.filter(s => s.status === 'available').length,
      occupied: slots.filter(s => s.status === 'occupied').length,
      maintenance: slots.filter(s => s.status === 'maintenance').length,
      total: slots.length
    }
    stats.set(roomId, roomStats)
  })

  return stats
})

// 时间格式化
function formatTime(date: Date): string {
  return format(date, 'HH:mm', { locale: zhCN })
}

function formatDate(date: string): string {
  return format(new Date(date), 'yyyy年MM月dd日', { locale: zhCN })
}

// 获取状态颜色
function getStatusColor(status: 'available' | 'occupied' | 'maintenance'): string {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'occupied':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'maintenance':
      return 'bg-orange-100 text-orange-800 border-orange-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function getStatusText(status: 'available' | 'occupied' | 'maintenance'): string {
  switch (status) {
    case 'available':
      return '可用'
    case 'occupied':
      return '已占用'
    case 'maintenance':
      return '维护中'
    default:
      return '未知'
  }
}

// 获取状态图标
function getStatusIcon(status: 'available' | 'occupied' | 'maintenance'): string {
  switch (status) {
    case 'available':
      return 'pi-check-circle'
    case 'occupied':
      return 'pi-times-circle'
    case 'maintenance':
      return 'pi-exclamation-triangle'
    default:
      return 'pi-question-circle'
  }
}

// 加载会议室数据
async function loadRooms() {
  try {
    await roomStore.fetchRooms()
  } catch (err: any) {
    console.error('加载会议室失败:', err)
  }
}

// 生命周期
onMounted(async () => {
  console.log('✅ Admin room availability page mounted successfully!')

  // 先加载会议室数据，再刷新时间槽
  await loadRooms()
  await refreshTimeSlots()
})

// 监听日期变化
watch([selectedDate, selectedRoom], async () => {
  await refreshTimeSlots()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <UniversalHeader/>
    <!-- 页面标题 -->
    <div class="bg-white shadow-sm border-b">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">会议室可用时间管理</h1>
            <p class="mt-1 text-gray-600">查看和管理各会议室的时间安排和可用情况</p>
          </div>
          <div class="flex gap-3">
            <NuxtLink
              to="/admin/rooms"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-arrow-left"></i>
              返回会议室管理
            </NuxtLink>
            <NuxtLink
              to="/reservations/create"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-plus"></i>
              新建预约
            </NuxtLink>
            <NuxtLink
              to="/reservations"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <i class="pi pi-list"></i>
              预约列表
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="container mx-auto px-4 py-6">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <i class="pi pi-filter text-blue-600"></i>
          查询条件
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 会议室选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">会议室</label>
            <select
              v-model="selectedRoom"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部会议室</option>
              <option
                v-for="room in roomStore.rooms"
                :key="room.id"
                :value="room.id"
              >
                {{ room.name }} ({{ room.capacity }}人)
              </option>
            </select>
          </div>

          <!-- 日期选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">查询日期</label>
            <input
              v-model="selectedDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>

          <!-- 刷新按钮 -->
          <div class="flex items-end">
            <button
              @click="refreshTimeSlots"
              :disabled="reservationStore.availabilityLoading"
              class="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 text-blue-700 disabled:text-gray-500 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <i :class="['pi', reservationStore.availabilityLoading ? 'pi-spin pi-spinner' : 'pi-refresh']"></i>
              {{ reservationStore.availabilityLoading ? '加载中...' : '刷新数据' }}
            </button>
          </div>
        </div>

        <!-- 日期信息 -->
        <div v-if="selectedDate" class="mt-4 p-3 bg-blue-50 rounded-lg">
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar text-blue-600"></i>
            <span class="text-sm font-medium text-blue-900">
              查询日期：{{ formatDate(selectedDate) }}
              <span v-if="isToday(new Date(selectedDate))" class="ml-2 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                今天
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 可用时间统计 -->
    <div class="container mx-auto px-4 pb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="room in filteredRooms"
          :key="room.id"
          class="bg-white rounded-lg shadow-sm border p-6"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ room.name }}</h3>
            <span class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="room.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
              {{ room.status === 'AVAILABLE' ? '可用' : '维护中' }}
            </span>
          </div>

          <div class="space-y-2 text-sm text-gray-600 mb-4">
            <div class="flex items-center gap-2">
              <i class="pi pi-users text-gray-400"></i>
              <span>容量：{{ room.capacity }}人</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-map-marker text-gray-400"></i>
              <span>位置：{{ room.location || '未设置' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-gray-400"></i>
              <span>营业时间：{{ room.operatingHours?.start || '09:00' }} - {{ room.operatingHours?.end || '18:00' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-cog text-gray-400"></i>
              <span>设备：{{ (room.equipment && room.equipment.length > 0) ? room.equipment.join('、') : '基础设备' }}</span>
            </div>
          </div>

          <!-- 统计信息 -->
          <div v-if="availabilityStats.get(room.id)" class="border-t pt-4">
            <h4 class="text-sm font-medium text-gray-900 mb-3">今日时间统计</h4>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="bg-green-50 rounded-lg p-2">
                <div class="text-lg font-semibold text-green-800">
                  {{ availabilityStats.get(room.id)?.available }}
                </div>
                <div class="text-xs text-green-600">可用时段</div>
              </div>
              <div class="bg-red-50 rounded-lg p-2">
                <div class="text-lg font-semibold text-red-800">
                  {{ availabilityStats.get(room.id)?.occupied }}
                </div>
                <div class="text-xs text-red-600">已占用</div>
              </div>
              <div class="bg-orange-50 rounded-lg p-2">
                <div class="text-lg font-semibold text-orange-800">
                  {{ availabilityStats.get(room.id)?.maintenance }}
                </div>
                <div class="text-xs text-orange-600">维护中</div>
              </div>
            </div>
            <div class="mt-2 text-center text-xs text-gray-500">
              总计 {{ availabilityStats.get(room.id)?.total }} 个时段 (每段30分钟)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详细时间表 -->
    <div class="container mx-auto px-4 pb-6">
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <i class="pi pi-clock text-blue-600"></i>
            详细时间表
          </h2>
        </div>

        <div v-if="filteredRooms.length === 0" class="p-8 text-center text-gray-500">
          请选择要查看的会议室
        </div>

        <div v-else class="divide-y divide-gray-200">
          <div
            v-for="room in filteredRooms"
            :key="room.id"
            class="p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
                <i class="pi pi-home text-blue-600"></i>
                {{ room.name }} - {{ formatDate(selectedDate) }}
              </h3>
              <div class="flex gap-2">
                <NuxtLink
                  :to="`/admin/rooms/${room.id}`"
                  class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-1"
                >
                  <i class="pi pi-eye"></i>
                  查看详情
                </NuxtLink>
                <NuxtLink
                  :to="`/admin/rooms/${room.id}/edit`"
                  class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1"
                >
                  <i class="pi pi-pencil"></i>
                  编辑
                </NuxtLink>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              <div
                v-for="slot in timeSlotsByRoom.get(room.id)"
                :key="`${slot.roomId}-${slot.startTime.getTime()}`"
                :class="[
                  'p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md',
                  getStatusColor(slot.status)
                ]"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium text-sm">
                    {{ formatTime(slot.startTime) }} - {{ formatTime(slot.endTime) }}
                  </span>
                  <i :class="['pi', getStatusIcon(slot.status), 'text-sm']"></i>
                </div>

                <div class="text-xs">
                  <span class="font-medium">{{ getStatusText(slot.status) }}</span>
                  <div v-if="slot.reservation" class="mt-1 text-gray-600">
                    <div>{{ slot.reservation.title }}</div>
                    <div>{{ slot.reservation.organizer }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-availability {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>