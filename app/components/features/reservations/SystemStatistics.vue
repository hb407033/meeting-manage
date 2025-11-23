<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- 总会议室数 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 bg-blue-100 rounded-full">
          <Icon name="i-heroicons-building-office-2" class="h-6 w-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">总会议室数</p>
          <p class="text-2xl font-bold text-gray-900">{{ statistics.totalRooms }}</p>
        </div>
      </div>
    </div>

    <!-- 今日开放预约数 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 bg-green-100 rounded-full">
          <Icon name="i-heroicons-calendar-days" class="h-6 w-6 text-green-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">今日预约</p>
          <p class="text-2xl font-bold text-gray-900">{{ statistics.todayReservations }}</p>
        </div>
      </div>
    </div>

    <!-- 当前可预约会议室数 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 bg-yellow-100 rounded-full">
          <Icon name="i-heroicons-clock" class="h-6 w-6 text-yellow-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">当前可用</p>
          <p class="text-2xl font-bold text-gray-900">{{ statistics.availableRooms }}</p>
        </div>
      </div>
    </div>

    <!-- 预约成功率 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 bg-purple-100 rounded-full">
          <Icon name="i-heroicons-chart-bar" class="h-6 w-6 text-purple-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">使用率</p>
          <p class="text-2xl font-bold text-gray-900">{{ statistics.usageRate }}%</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 详细统计图表 -->
  <div v-if="showDetails" class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- 使用率趋势图 -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">使用率趋势</h3>
      <div class="h-64 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <Icon name="i-heroicons-chart-line" class="h-12 w-12 mx-auto mb-2" />
          <p>图表加载中...</p>
        </div>
      </div>
    </div>

    <!-- 热门会议室 -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">热门会议室</h3>
      <div class="space-y-3">
        <div v-for="room in popularRooms" :key="room.id" class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            <span class="text-sm font-medium text-gray-900">{{ room.name }}</span>
          </div>
          <span class="text-sm text-gray-500">{{ room.bookings }}次预约</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

// 组件属性
interface Props {
  showDetails?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  refreshInterval: 60000 // 60秒刷新一次
})

// 组件事件
interface Emits {
  refresh: [statistics: SystemStatistics]
  error: [error: Error]
}

const emit = defineEmits<Emits>()

// 统计数据接口
interface SystemStatistics {
  totalRooms: number
  todayReservations: number
  availableRooms: number
  usageRate: number
  lastUpdated: Date
}

interface PopularRoom {
  id: string
  name: string
  bookings: number
}

// 响应式数据
const statistics = ref<SystemStatistics>({
  totalRooms: 0,
  todayReservations: 0,
  availableRooms: 0,
  usageRate: 0,
  lastUpdated: new Date()
})

const popularRooms = ref<PopularRoom[]>([
  { id: '1', name: '会议室A', bookings: 12 },
  { id: '2', name: '会议室B', bookings: 8 },
  { id: '3', name: '会议室C', bookings: 6 }
])

const loading = ref(false)
const error = ref<Error | null>(null)

// 权限检查
const { canAccess } = useAuth()

// 计算属性
const canViewStatistics = computed(() => {
  return canAccess('statistics', 'read')
})

// 方法
const fetchStatistics = async () => {
  if (!canViewStatistics.value) return

  try {
    loading.value = true
    error.value = null

    // 使用 admin store 获取系统统计
    const { useAdminStore } = await import('~/stores/admin')
    const adminStore = useAdminStore()

    const response = await adminStore.getSystemStatistics()

    statistics.value = {
      totalRooms: response.totalRooms || 0,
      todayReservations: response.todayReservations || 0,
      availableRooms: response.availableRooms || 0,
      usageRate: response.usageRate || 0,
      lastUpdated: new Date()
    }

    emit('refresh', statistics.value)
  } catch (err) {
    error.value = err as Error
    console.error('获取统计数据失败:', err)
    emit('error', err as Error)
  } finally {
    loading.value = false
  }
}

// 定时刷新
let refreshTimer: NodeJS.Timeout | null = null

const startRefreshTimer = () => {
  if (props.refreshInterval > 0) {
    refreshTimer = setInterval(fetchStatistics, props.refreshInterval)
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
  fetchStatistics()
  startRefreshTimer()
})

onUnmounted(() => {
  stopRefreshTimer()
})

// 监听刷新间隔变化
watch(() => props.refreshInterval, () => {
  stopRefreshTimer()
  startRefreshTimer()
})
</script>

<style scoped>
/* 统计卡片动画效果 */
.grid > div {
  transition: transform 0.2s ease-in-out;
}

.grid > div:hover {
  transform: translateY(-2px);
}

/* 图表容器 */
.h-64 {
  min-height: 16rem;
}
</style>