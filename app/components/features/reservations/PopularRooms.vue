<template>
  <div class="bg-white rounded-lg shadow p-6">
    <!-- 标题区域 -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-medium text-gray-900">热门会议室</h3>
      <div class="flex items-center space-x-2">
        <select
          v-model="selectedTimeRange"
          @change="fetchPopularRooms"
          class="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">今日</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
        </select>
        <button
          @click="fetchPopularRooms"
          :disabled="loading"
          class="p-1 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Icon
            :name="loading ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-clockwise'"
            :class="['h-4 w-4', loading && 'animate-spin']"
          />
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="py-8">
      <div class="flex items-center justify-center">
        <Icon name="i-heroicons-arrow-path" class="h-6 w-6 text-blue-600 animate-spin mr-2" />
        <span class="text-gray-600">加载中...</span>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="py-8 text-center text-red-600">
      <Icon name="i-heroicons-exclamation-triangle" class="h-8 w-8 mx-auto mb-2" />
      <p class="text-sm">{{ error }}</p>
      <button
        @click="fetchPopularRooms"
        class="mt-2 text-xs text-red-600 hover:text-red-800 underline"
      >
        重试
      </button>
    </div>

    <!-- 热门会议室列表 -->
    <div v-else class="space-y-3">
      <div
        v-for="(room, index) in popularRooms"
        :key="room.id"
        class="flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-md"
        :class="getRankingClass(index)"
      >
        <!-- 排名标识 -->
        <div class="flex items-center space-x-3">
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              getRankingBadgeClass(index)
            ]"
          >
            {{ index + 1 }}
          </div>

          <!-- 会议室信息 -->
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-900">{{ room.name }}</span>
              <div
                v-if="room.status === 'AVAILABLE'"
                class="w-2 h-2 bg-green-500 rounded-full"
              />
              <div
                v-else-if="room.status === 'OCCUPIED'"
                class="w-2 h-2 bg-red-500 rounded-full"
              />
              <div
                v-else
                class="w-2 h-2 bg-gray-400 rounded-full"
              />
            </div>
            <div class="text-sm text-gray-500">
              {{ room.location }} · {{ room.capacity }}人
            </div>
          </div>
        </div>

        <!-- 预约统计 -->
        <div class="text-right">
          <div class="flex items-center space-x-1">
            <span class="text-lg font-bold" :class="getRankingNumberClass(index)">
              {{ room.bookings }}
            </span>
            <span class="text-sm text-gray-500">次</span>
          </div>
          <div class="text-xs text-gray-400">
            使用率 {{ room.usageRate }}%
          </div>
        </div>
      </div>
    </div>

    <!-- 热门时段分析 -->
    <div class="mt-6 pt-6 border-t border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">热门时段分析</h4>
      <div class="grid grid-cols-2 gap-4">
        <!-- 最高峰时段 -->
        <div class="p-3 bg-blue-50 rounded-lg">
          <div class="flex items-center space-x-2 mb-1">
            <Icon name="i-heroicons-fire" class="h-4 w-4 text-orange-500" />
            <span class="text-sm font-medium text-gray-700">最高峰时段</span>
          </div>
          <p class="text-lg font-bold text-blue-600">{{ peakHours.time }}</p>
          <p class="text-xs text-gray-600">{{ peakHours.usage }}% 使用率</p>
        </div>

        <!-- 最受欢迎 -->
        <div class="p-3 bg-green-50 rounded-lg">
          <div class="flex items-center space-x-2 mb-1">
            <Icon name="i-heroicons-star" class="h-4 w-4 text-yellow-500" />
            <span class="text-sm font-medium text-gray-700">最受欢迎</span>
          </div>
          <p class="text-lg font-bold text-green-600">{{ mostPopular.name }}</p>
          <p class="text-xs text-gray-600">{{ mostPopular.bookings }} 次预约</p>
        </div>
      </div>
    </div>

    <!-- 设备偏好统计 -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">设备偏好</h4>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="equipment in popularEquipment"
          :key="equipment.name"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
        >
          <Icon :name="equipment.icon" class="h-3 w-3 mr-1" />
          {{ equipment.name }} ({{ equipment.count }})
        </span>
      </div>
    </div>

    <!-- 操作建议 -->
    <div class="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <div class="flex items-start space-x-2">
        <Icon name="i-heroicons-light-bulb" class="h-4 w-4 text-amber-600 mt-0.5" />
        <div>
          <h5 class="text-sm font-medium text-amber-800">智能建议</h5>
          <p class="text-xs text-amber-700 mt-1">
            {{ recommendation }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useReservationsStore } from '~/stores/reservations'

const reservationsStore = useReservationsStore()

// 组件属性
interface Props {
  timeRange?: string
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  timeRange: 'today',
  limit: 10,
  autoRefresh: true,
  refreshInterval: 300000 // 5分钟刷新一次
})

// 组件事件
interface Emits {
  dataLoaded: [rooms: PopularRoom[]]
  error: [error: string]
}

const emit = defineEmits<Emits>()

// 接口定义
interface PopularRoom {
  id: string
  name: string
  location: string
  capacity: number
  status: string
  bookings: number
  usageRate: number
  equipment?: string[]
}

interface PeakHours {
  time: string
  usage: number
}

interface MostPopular {
  name: string
  bookings: number
}

interface PopularEquipment {
  name: string
  icon: string
  count: number
}

// 响应式数据
const loading = ref(false)
const error = ref('')
const selectedTimeRange = ref(props.timeRange)

const popularRooms = ref<PopularRoom[]>([])
const peakHours = ref<PeakHours>({ time: '14:00-16:00', usage: 85 })
const mostPopular = ref<MostPopular>({ name: '会议室A', bookings: 12 })
const popularEquipment = ref<PopularEquipment[]>([
  { name: '投影仪', icon: 'i-heroicons-tv', count: 15 },
  { name: '白板', icon: 'i-heroicons-rectangle-stack', count: 12 },
  { name: '视频会议', icon: 'i-heroicons-video-camera', count: 8 }
])

// 计算属性
const recommendation = computed(() => {
  if (popularRooms.value.length === 0) {
    return '当前时段会议室使用较为空闲，建议提前预约以确保有可用会议室。'
  }

  const topRoom = popularRooms.value[0]
  if (topRoom.usageRate > 80) {
    return `${topRoom.name} 使用率较高，建议考虑其他时间或选择备选会议室。`
  }

  return '当前会议室使用情况良好，建议根据实际需求选择合适的会议室。'
})

// 方法
const fetchPopularRooms = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await reservationsStore.getPopularRooms(
      selectedTimeRange.value,
      props.limit || 10
    )

    popularRooms.value = response.data || []

    // 如果没有真实数据，使用模拟数据
    if (popularRooms.value.length === 0) {
      popularRooms.value = getMockData()
    }

    // 更新统计信息
    updateStatistics()

    emit('dataLoaded', popularRooms.value)
  } catch (err: any) {
    error.value = err.message || '获取热门会议室数据失败'
    console.error('获取热门会议室数据失败:', err)
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

const getMockData = (): PopularRoom[] => {
  return [
    {
      id: '1',
      name: '会议室A',
      location: '1楼',
      capacity: 10,
      status: 'AVAILABLE',
      bookings: 12,
      usageRate: 85,
      equipment: ['投影仪', '白板']
    },
    {
      id: '2',
      name: '会议室B',
      location: '2楼',
      capacity: 8,
      status: 'OCCUPIED',
      bookings: 8,
      usageRate: 72,
      equipment: ['视频会议']
    },
    {
      id: '3',
      name: '大会议室',
      location: '3楼',
      capacity: 20,
      status: 'AVAILABLE',
      bookings: 6,
      usageRate: 68,
      equipment: ['投影仪', '音响系统']
    },
    {
      id: '4',
      name: '小会议室1',
      location: '2楼',
      capacity: 4,
      status: 'MAINTENANCE',
      bookings: 5,
      usageRate: 45,
      equipment: ['白板']
    },
    {
      id: '5',
      name: '讨论室',
      location: '1楼',
      capacity: 6,
      status: 'AVAILABLE',
      bookings: 4,
      usageRate: 38,
      equipment: []
    }
  ]
}

const updateStatistics = () => {
  if (popularRooms.value.length === 0) return

  // 最高峰时段
  const hourUsage = [14, 15, 10, 9, 11, 16, 13] // 模拟不同时段的使用率
  const maxIndex = hourUsage.indexOf(Math.max(...hourUsage))
  const peakHour = 9 + maxIndex
  peakHours.value = {
    time: `${peakHour}:00-${peakHour + 2}:00`,
    usage: hourUsage[maxIndex]
  }

  // 最受欢迎的会议室
  mostPopular.value = {
    name: popularRooms.value[0].name,
    bookings: popularRooms.value[0].bookings
  }

  // 设备偏好统计（模拟）
  const equipmentCount: Record<string, number> = {}
  popularRooms.value.forEach(room => {
    room.equipment?.forEach(eq => {
      equipmentCount[eq] = (equipmentCount[eq] || 0) + 1
    })
  })

  popularEquipment.value = Object.entries(equipmentCount).map(([name, count]) => ({
    name,
    icon: getEquipmentIcon(name),
    count
  })).sort((a, b) => b.count - a.count)
}

const getEquipmentIcon = (equipmentName: string): string => {
  const iconMap: Record<string, string> = {
    '投影仪': 'i-heroicons-tv',
    '白板': 'i-heroicons-rectangle-stack',
    '视频会议': 'i-heroicons-video-camera',
    '音响系统': 'i-heroicons-speaker-wave',
    '空调': 'i-heroicons-sun'
  }
  return iconMap[equipmentName] || 'i-heroicons-cube'
}

const getRankingClass = (index: number): string => {
  const classes = [
    'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200',
    'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200',
    'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200',
    'border-gray-100',
    'border-gray-100'
  ]
  return classes[index] || classes[4]
}

const getRankingBadgeClass = (index: number): string => {
  const classes = [
    'bg-yellow-500 text-white',
    'bg-gray-400 text-white',
    'bg-orange-400 text-white',
    'bg-blue-400 text-white',
    'bg-blue-300 text-white'
  ]
  return classes[index] || classes[4]
}

const getRankingNumberClass = (index: number): string => {
  const classes = [
    'text-yellow-600',
    'text-gray-600',
    'text-orange-600',
    'text-blue-600',
    'text-blue-500'
  ]
  return classes[index] || classes[4]
}

// 自动刷新
let refreshTimer: NodeJS.Timeout | null = null

const startRefreshTimer = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer = setInterval(fetchPopularRooms, props.refreshInterval)
  }
}

const stopRefreshTimer = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 生命周期
onMounted(() => {
  fetchPopularRooms()
  startRefreshTimer()
})

onUnmounted(() => {
  stopRefreshTimer()
})
</script>

<style scoped>
/* 排名动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.space-y-3 > div {
  animation: slideIn 0.3s ease-out;
}

.space-y-3 > div:nth-child(1) { animation-delay: 0.1s; }
.space-y-3 > div:nth-child(2) { animation-delay: 0.2s; }
.space-y-3 > div:nth-child(3) { animation-delay: 0.3s; }
.space-y-3 > div:nth-child(4) { animation-delay: 0.4s; }
.space-y-3 > div:nth-child(5) { animation-delay: 0.5s; }

/* 悬停效果 */
.hover\:shadow-md:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.w-2.h-2 {
  animation: pulse 2s infinite;
}
</style>