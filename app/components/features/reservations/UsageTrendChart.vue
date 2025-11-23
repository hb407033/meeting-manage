<template>
  <div class="bg-white rounded-lg shadow p-6">
    <!-- 标题区域 -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-medium text-gray-900">使用率趋势</h3>
      <div class="flex items-center space-x-2">
        <select
          v-model="selectedPeriod"
          @change="fetchUsageData"
          class="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7">最近7天</option>
          <option value="30">最近30天</option>
          <option value="90">最近90天</option>
        </select>
        <button
          @click="fetchUsageData"
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

    <!-- 图表区域 -->
    <div class="h-64 relative">
      <!-- 加载状态 -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
        <div class="text-center">
          <Icon name="i-heroicons-arrow-path" class="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p class="text-sm text-gray-600">加载中...</p>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center text-red-600">
          <Icon name="i-heroicons-exclamation-triangle" class="h-8 w-8 mx-auto mb-2" />
          <p class="text-sm">{{ error }}</p>
          <button
            @click="fetchUsageData"
            class="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            重试
          </button>
        </div>
      </div>

      <!-- 图表容器 -->
      <div v-else class="h-full">
        <canvas ref="chartCanvas" class="w-full h-full"></canvas>
      </div>
    </div>

    <!-- 统计摘要 -->
    <div class="mt-6 grid grid-cols-3 gap-4">
      <div class="text-center">
        <p class="text-2xl font-bold text-blue-600">{{ statistics.averageUsage }}%</p>
        <p class="text-sm text-gray-600">平均使用率</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-green-600">{{ statistics.peakUsage }}%</p>
        <p class="text-sm text-gray-600">最高使用率</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-purple-600">{{ statistics.totalMeetings }}</p>
        <p class="text-sm text-gray-600">总会议数</p>
      </div>
    </div>

    <!-- 时间段分析 -->
    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
      <h4 class="text-sm font-medium text-gray-900 mb-3">最佳时间段</h4>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex items-center">
          <Icon name="i-heroicons-sun" class="h-4 w-4 text-yellow-500 mr-2" />
          <span class="text-sm text-gray-700">
            上午: {{ bestTimeSlots.morning }} ({{ bestTimeSlotStats.morning }}% 使用率)
          </span>
        </div>
        <div class="flex items-center">
          <Icon name="i-heroicons-cloud" class="h-4 w-4 text-blue-500 mr-2" />
          <span class="text-sm text-gray-700">
            下午: {{ bestTimeSlots.afternoon }} ({{ bestTimeSlotStats.afternoon }}% 使用率)
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 组件属性
interface Props {
  period?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  period: 7,
  autoRefresh: true,
  refreshInterval: 300000 // 5分钟刷新一次
})

// 组件事件
interface Emits {
  dataLoaded: [data: UsageData]
  error: [error: string]
}

const emit = defineEmits<Emits>()

// 接口定义
interface UsageData {
  date: string
  usage: number
  meetings: number
}

interface TimeSlotStats {
  morning: number
  afternoon: number
}

// 响应式数据
const loading = ref(false)
const error = ref('')
const selectedPeriod = ref(props.period.toString())
const chartCanvas = ref<HTMLCanvasElement | null>(null)
const chartInstance = ref<any>(null)

const usageData = ref<UsageData[]>([])
const statistics = ref({
  averageUsage: 0,
  peakUsage: 0,
  totalMeetings: 0
})

const bestTimeSlots = ref({
  morning: '09:00-11:00',
  afternoon: '14:00-16:00'
})

const bestTimeSlotStats = ref<TimeSlotStats>({
  morning: 0,
  afternoon: 0
})

// 计算属性
const chartLabels = computed(() => {
  return usageData.value.map(item => {
    const date = new Date(item.date)
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  })
})

const chartValues = computed(() => {
  return usageData.value.map(item => item.usage)
})

// 方法
const fetchUsageData = async () => {
  loading.value = true
  error.value = ''

  try {
    const { useAdminStore } = await import('~/stores/admin')
    const adminStore = useAdminStore()

    const response = await adminStore.getUsageTrend(parseInt(selectedPeriod.value))

    usageData.value = response || []

    // 计算统计数据
    calculateStatistics()

    // 绘制图表
    await nextTick()
    drawChart()

    emit('dataLoaded', response.data)
  } catch (err: any) {
    error.value = err.message || '获取使用率数据失败'
    console.error('获取使用率数据失败:', err)
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

const calculateStatistics = () => {
  if (usageData.value.length === 0) return

  const usages = usageData.value.map(item => item.usage)
  statistics.value.averageUsage = Math.round(
    usages.reduce((sum, usage) => sum + usage, 0) / usages.length
  )
  statistics.value.peakUsage = Math.max(...usages)
  statistics.value.totalMeetings = usageData.value.reduce(
    (sum, item) => sum + item.meetings, 0
  )

  // 模拟时间段统计
  bestTimeSlotStats.value = {
    morning: Math.round(65 + Math.random() * 20),
    afternoon: Math.round(45 + Math.random() * 25)
  }
}

const drawChart = () => {
  if (!chartCanvas.value) return

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  // 清除之前的图表
  ctx.clearRect(0, 0, chartCanvas.value.width, chartCanvas.value.height)

  const width = chartCanvas.value.width
  const height = chartCanvas.value.height
  const padding = 40

  // 绘制简单的折线图
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 2
  ctx.beginPath()

  const maxValue = Math.max(...chartValues.value, 100)
  const xStep = (width - padding * 2) / Math.max(chartValues.value.length - 1, 1)
  const yScale = (height - padding * 2) / maxValue

  chartValues.value.forEach((value, index) => {
    const x = padding + index * xStep
    const y = height - padding - (value * yScale)

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }

    // 绘制数据点
    ctx.fillStyle = '#3B82F6'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.stroke()

  // 绘制坐标轴
  ctx.strokeStyle = '#E5E7EB'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height - padding)
  ctx.lineTo(width - padding, height - padding)
  ctx.stroke()

  // 绘制标签
  ctx.fillStyle = '#6B7280'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'

  chartLabels.value.forEach((label, index) => {
    const x = padding + index * xStep
    ctx.fillText(label, x, height - padding + 20)
  })
}

// 自动刷新
let refreshTimer: NodeJS.Timeout | null = null

const startRefreshTimer = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer = setInterval(fetchUsageData, props.refreshInterval)
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
  fetchUsageData()
  startRefreshTimer()
})

onUnmounted(() => {
  stopRefreshTimer()
})
</script>

<style scoped>
/* 图表容器样式 */
canvas {
  max-width: 100%;
  height: auto;
}

/* 动画效果 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.bg-white {
  animation: fadeIn 0.5s ease-out;
}

/* 统计卡片悬停效果 */
.grid > div {
  transition: all 0.2s ease-in-out;
}

.grid > div:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>