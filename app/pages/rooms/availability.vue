<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, addDays, startOfWeek, endOfWeek, isToday, isAfter, isBefore } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 模拟会议室数据
const rooms = ref([
  {
    id: '1',
    name: '会议室 A',
    capacity: 10,
    location: '1楼东侧',
    operatingHours: {
      start: '09:00',
      end: '18:00'
    },
    equipment: ['投影仪', '白板', '音响'],
    status: 'available'
  },
  {
    id: '2',
    name: '会议室 B',
    capacity: 6,
    location: '2楼西侧',
    operatingHours: {
      start: '08:00',
      end: '20:00'
    },
    equipment: ['电视', '视频会议设备'],
    status: 'available'
  },
  {
    id: '3',
    name: '会议室 C',
    capacity: 20,
    location: '3楼中央',
    operatingHours: {
      start: '08:30',
      end: '17:30'
    },
    equipment: ['投影仪', '音响', '麦克风', '视频会议设备'],
    status: 'maintenance'
  }
])

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

// 生成时间槽数据
const generateTimeSlots = () => {
  const slots: TimeSlot[] = []
  const targetDate = new Date(selectedDate.value)

  rooms.value.forEach(room => {
    const { start: startHourStr, end: endHourStr } = room.operatingHours
    const startHour = parseInt(startHourStr.split(':')[0])
    const startMinute = parseInt(startHourStr.split(':')[1])
    const endHour = parseInt(endHourStr.split(':')[0])
    const endMinute = parseInt(endHourStr.split(':')[1])

    let currentTime = new Date(targetDate)
    currentTime.setHours(startHour, startMinute, 0, 0)
    const endTime = new Date(targetDate)
    endTime.setHours(endHour, endMinute, 0, 0)

    while (currentTime < endTime) {
      const slotEndTime = new Date(currentTime.getTime() + 30 * 60 * 1000)

      if (slotEndTime > endTime) break

      let status: 'available' | 'occupied' | 'maintenance' = 'available'
      let reservation

      // 模拟一些占用时间
      const currentHour = currentTime.getHours()
      const randomValue = Math.random()

      if (room.status === 'maintenance' || (currentHour >= 12 && currentHour < 13 && randomValue < 0.8)) {
        status = 'maintenance'
      } else if (randomValue < 0.4) {
        status = 'occupied'
        reservation = {
          title: '部门会议',
          organizer: '张经理'
        }
      }

      slots.push({
        roomId: room.id,
        startTime: new Date(currentTime),
        endTime: slotEndTime,
        status,
        reservation
      })

      currentTime = slotEndTime
    }
  })

  return slots
}

// 刷新时间槽
function refreshTimeSlots() {
  timeSlots.value = generateTimeSlots()
}

// 计算属性
const filteredRooms = computed(() => {
  if (!selectedRoom.value) return rooms.value
  return rooms.value.filter(room => room.id === selectedRoom.value)
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

// 生命周期
onMounted(() => {
  refreshTimeSlots()
  console.log('✅ Room availability page mounted successfully!')
})

// 监听日期变化
watch([selectedDate, selectedRoom], () => {
  refreshTimeSlots()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面标题 -->
    <div class="bg-white shadow-sm border-b">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">会议室可用时间</h1>
            <p class="mt-1 text-gray-600">查看各会议室的时间安排和可用情况</p>
          </div>
          <div class="flex gap-3">
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
                v-for="room in rooms"
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
              class="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <i class="pi pi-refresh"></i>
              刷新数据
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
                  :class="room.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
              {{ room.status === 'available' ? '可用' : '维护中' }}
            </span>
          </div>

          <div class="space-y-2 text-sm text-gray-600 mb-4">
            <div class="flex items-center gap-2">
              <i class="pi pi-users text-gray-400"></i>
              <span>容量：{{ room.capacity }}人</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-map-marker text-gray-400"></i>
              <span>位置：{{ room.location }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-gray-400"></i>
              <span>营业时间：{{ room.operatingHours.start }} - {{ room.operatingHours.end }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-cog text-gray-400"></i>
              <span>设备：{{ room.equipment.join('、') }}</span>
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
            <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <i class="pi pi-home text-blue-600"></i>
              {{ room.name }} - {{ formatDate(selectedDate) }}
            </h3>

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