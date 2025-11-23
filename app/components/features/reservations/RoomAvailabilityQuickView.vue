<template>
  <div class="bg-white rounded-lg shadow">
    <!-- 头部 -->
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">会议室可用性</h2>
        <div class="flex items-center space-x-2">
          <!-- 视图切换 -->
          <div class="flex rounded-md shadow-sm">
            <button
              @click="viewMode = 'list'"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-l-md border transition-colors',
                viewMode === 'list'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              ]"
            >
              列表
            </button>
            <button
              @click="viewMode = 'calendar'"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-r-md border transition-colors',
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              ]"
            >
              日历
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- 日期选择 -->
        <div>
          <label for="date-filter" class="block text-sm font-medium text-gray-700 mb-1">
            日期
          </label>
          <input
            id="date-filter"
            v-model="selectedDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- 位置筛选 -->
        <div>
          <label for="location-filter" class="block text-sm font-medium text-gray-700 mb-1">
            位置
          </label>
          <select
            id="location-filter"
            v-model="selectedLocation"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部位置</option>
            <option
              v-for="location in availableLocations"
              :key="location"
              :value="location"
            >
              {{ location }}
            </option>
          </select>
        </div>

        <!-- 容量筛选 -->
        <div>
          <label for="capacity-filter" class="block text-sm font-medium text-gray-700 mb-1">
            最小容量
          </label>
          <select
            id="capacity-filter"
            v-model="minCapacity"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">不限</option>
            <option value="2">2人以上</option>
            <option value="4">4人以上</option>
            <option value="6">6人以上</option>
            <option value="10">10人以上</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="p-6">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <Icon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-gray-400 mr-2" />
        <span class="text-gray-600">加载中...</span>
      </div>

      <!-- 列表视图 -->
      <div v-else-if="viewMode === 'list'" class="space-y-4">
        <div
          v-for="room in filteredRooms"
          :key="room.id"
          class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <!-- 会议室信息 -->
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h3 class="text-lg font-medium text-gray-900">{{ room.name }}</h3>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="roomStatusClass(room.status)"
                >
                  {{ room.statusText }}
                </span>
              </div>

              <div class="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div class="flex items-center">
                  <Icon name="i-heroicons-map-pin" class="h-4 w-4 mr-1" />
                  {{ room.location }}
                </div>
                <div class="flex items-center">
                  <Icon name="i-heroicons-users" class="h-4 w-4 mr-1" />
                  容量: {{ room.capacity }}人
                </div>
                <div class="flex items-center">
                  <Icon name="i-heroicons-wifi" class="h-4 w-4 mr-1" />
                  {{ room.hasWifi ? '有WiFi' : '无WiFi' }}
                </div>
                <div class="flex items-center">
                  <Icon name="i-heroicons-tv" class="h-4 w-4 mr-1" />
                  {{ room.hasProjector ? '有投影仪' : '无投影仪' }}
                </div>
              </div>

              <!-- 今日预约时间段 -->
              <div v-if="room.todayBookings && room.todayBookings.length > 0" class="mt-3">
                <p class="text-sm font-medium text-gray-700 mb-2">今日预约时段:</p>
                <div class="space-y-1">
                  <div
                    v-for="booking in room.todayBookings"
                    :key="booking.id"
                    class="flex items-center text-sm text-gray-600"
                  >
                    <Icon name="i-heroicons-clock" class="h-4 w-4 mr-1" />
                    {{ formatTime(booking.startTime) }} - {{ formatTime(booking.endTime) }}
                    <span class="ml-2 text-gray-500">{{ booking.title }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-col space-y-2 ml-4">
              <button
                @click="quickReserve(room)"
                :disabled="room.status !== 'AVAILABLE'"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="i-heroicons-calendar-plus" class="h-4 w-4 mr-1" />
                快速预约
              </button>
              <button
                @click="viewDetails(room)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Icon name="i-heroicons-eye" class="h-4 w-4 mr-1" />
                查看详情
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 日历视图 -->
      <div v-else class="space-y-6">
        <!-- 时间轴 -->
        <div class="overflow-x-auto">
          <div class="min-w-full">
            <!-- 时间标签 -->
            <div class="grid grid-cols-8 gap-2 mb-4">
              <div class="text-sm font-medium text-gray-700">时间</div>
              <div
                v-for="room in filteredRooms.slice(0, 7)"
                :key="room.id"
                class="text-sm font-medium text-gray-700 text-center"
              >
                {{ room.name }}
              </div>
            </div>

            <!-- 预约时间段 -->
            <div class="space-y-2">
              <div
                v-for="hour in timeSlots"
                :key="hour"
                class="grid grid-cols-8 gap-2"
              >
                <div class="text-sm text-gray-600 py-2">{{ hour }}:00</div>
                <div
                  v-for="room in filteredRooms.slice(0, 7)"
                  :key="room.id"
                  class="border border-gray-200 rounded p-2 text-center"
                  :class="getTimeSlotClass(room, hour)"
                >
                  <div class="text-xs">
                    {{ getTimeSlotText(room, hour) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredRooms.length === 0" class="text-center py-8">
        <Icon name="i-heroicons-building-office-2" class="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <h3 class="text-lg font-medium text-gray-900 mb-1">暂无符合条件的会议室</h3>
        <p class="text-gray-600">请调整筛选条件后重试</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

// 组件属性
interface Props {
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  refreshInterval: 60000 // 60秒刷新一次
})

// 组件事件
interface Emits {
  roomSelected: [room: any]
  quickReserve: [room: any]
  error: [error: Error]
}

const emit = defineEmits<Emits>()

// 响应式数据
const router = useRouter()
const loading = ref(false)
const error = ref<Error | null>(null)
const rooms = ref<any[]>([])
const viewMode = ref<'list' | 'calendar'>('list')
const selectedDate = ref('')
const selectedLocation = ref('')
const minCapacity = ref('')

// 计算属性
const filteredRooms = computed(() => {
  let filtered = rooms.value

  // 位置筛选
  if (selectedLocation.value) {
    filtered = filtered.filter(room => room.location === selectedLocation.value)
  }

  // 容量筛选
  if (minCapacity.value) {
    filtered = filtered.filter(room => room.capacity >= parseInt(minCapacity.value))
  }

  return filtered
})

const availableLocations = computed(() => {
  const locations = [...new Set(rooms.value.map(room => room.location))]
  return locations.sort()
})

const timeSlots = computed(() => {
  const slots = []
  for (let hour = 8; hour <= 20; hour++) {
    slots.push(hour)
  }
  return slots
})

// 方法
const loadRoomAvailability = async () => {
  try {
    loading.value = true
    error.value = null

    const date = selectedDate.value || new Date().toISOString().split('T')[0]

    const { useRoomsStore } = await import('~/stores/rooms')
    const roomsStore = useRoomsStore()

    const response = await roomsStore.getRoomAvailability(date, true)

    rooms.value = response || []
  } catch (err) {
    error.value = err as Error
    console.error('加载会议室可用性失败:', err)
    emit('error', err as Error)
  } finally {
    loading.value = false
  }
}

const quickReserve = (room: any) => {
  emit('quickReserve', room)
  // 这里可以触发快捷预约对话框，并预填会议室信息
}

const viewDetails = (room: any) => {
  emit('roomSelected', room)
  router.push(`/rooms/${room.id}`)
}

// 状态相关方法
const roomStatusClass = (status: string) => {
  const classMap = {
    'AVAILABLE': 'bg-green-100 text-green-800',
    'OCCUPIED': 'bg-red-100 text-red-800',
    'MAINTENANCE': 'bg-yellow-100 text-yellow-800',
    'RESERVED': 'bg-blue-100 text-blue-800'
  }
  return classMap[status as keyof typeof classMap] || 'bg-gray-100 text-gray-800'
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 日历视图相关方法
const getTimeSlotClass = (room: any, hour: number) => {
  const booking = room.todayBookings?.find((b: any) => {
    const startHour = new Date(b.startTime).getHours()
    const endHour = new Date(b.endTime).getHours()
    return hour >= startHour && hour < endHour
  })

  if (booking) {
    return 'bg-red-100 border-red-200 text-red-800'
  }

  return 'bg-green-100 border-green-200 text-green-800'
}

const getTimeSlotText = (room: any, hour: number) => {
  const booking = room.todayBookings?.find((b: any) => {
    const startHour = new Date(b.startTime).getHours()
    const endHour = new Date(b.endTime).getHours()
    return hour >= startHour && hour < endHour
  })

  if (booking) {
    return booking.title
  }

  return '可用'
}

// 设置默认日期
const setDefaultDate = () => {
  const today = new Date()
  selectedDate.value = today.toISOString().split('T')[0]
}

// 定时刷新
let refreshTimer: NodeJS.Timeout | null = null

const startRefreshTimer = () => {
  if (props.refreshInterval > 0) {
    refreshTimer = setInterval(loadRoomAvailability, props.refreshInterval)
  }
}

const stopRefreshTimer = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 监听器
watch([selectedDate, selectedLocation, minCapacity], () => {
  loadRoomAvailability()
})

// 生命周期
onMounted(() => {
  setDefaultDate()
  loadRoomAvailability()
  startRefreshTimer()
})

onUnmounted(() => {
  stopRefreshTimer()
})
</script>

<style scoped>
/* 日历视图样式 */
.grid {
  gap: 0.5rem;
}

.grid > div {
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 动画效果 */
.border:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;
}

/* 加载动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>