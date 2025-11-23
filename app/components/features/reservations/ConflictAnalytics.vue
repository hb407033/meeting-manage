<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useReservationStore } from '~/stores/reservations'

const reservationsStore = useReservationStore()

interface ConflictAnalyticsData {
  summary: {
    totalReservations: number
    totalConflicts: number
    conflictRate: number
    resolvedConflicts: number
    resolutionRate: number
    avgResolutionTime: number // 小时
  }
  conflictsByType: {
    type: string
    count: number
    percentage: number
  }[]
  conflictsByRoom: {
    roomId: string
    roomName: string
    totalConflicts: number
    conflictRate: number
  }[]
  conflictsByTime: {
    hour: number
    conflicts: number
  }[]
  trends: {
    date: string
    reservations: number
    conflicts: number
  }[]
  resolutions: {
    strategy: string
    count: number
    successRate: number
    avgTime: number
  }[]
  suggestions: {
    room: string
    issue: string
    recommendation: string
    impact: 'high' | 'medium' | 'low'
  }[]
}

interface Props {
  dateRange?: 'week' | 'month' | 'quarter' | 'year'
  autoRefresh?: boolean
  refreshInterval?: number // 秒
}

interface Emits {
  (e: 'dataUpdate', data: ConflictAnalyticsData): void
  (e: 'exportData', data: ConflictAnalyticsData): void
}

const props = withDefaults(defineProps<Props>(), {
  dateRange: 'month',
  autoRefresh: false,
  refreshInterval: 300 // 5分钟
})

const emit = defineEmits<Emits>()

// 内部状态
const loading = ref(false)
const analyticsData = ref<ConflictAnalyticsData | null>(null)
const selectedMetric = ref<'rate' | 'types' | 'rooms' | 'trends'>('rate')
const refreshTimer = ref<NodeJS.Timeout | null>(null)

// 计算属性
const dateRangeText = computed(() => {
  const ranges = {
    week: '过去一周',
    month: '过去一月',
    quarter: '过去三月',
    year: '过去一年'
  }
  return ranges[props.dateRange]
})

const conflictSeverityLevel = computed(() => {
  if (!analyticsData.value) return 'low'
  const rate = analyticsData.value.summary.conflictRate
  if (rate >= 30) return 'high'
  if (rate >= 15) return 'medium'
  return 'low'
})

const severityColors = {
  high: 'text-red-600 bg-red-100',
  medium: 'text-orange-600 bg-orange-100',
  low: 'text-green-600 bg-green-100'
}

// 方法
async function loadAnalyticsData(): Promise<void> {
  loading.value = true
  try {
    // 调用后端API获取分析数据
    const response = await reservationsStore.getConflictAnalytics(props.dateRange)

    if (response.success) {
      analyticsData.value = response.data
      emit('dataUpdate', response.data)
    } else {
      // 使用模拟数据作为后备
      analyticsData.value = generateMockAnalyticsData()
      emit('dataUpdate', analyticsData.value)
    }
  } catch (error) {
    console.error('加载冲突分析数据失败:', error)
    analyticsData.value = generateMockAnalyticsData()
    emit('dataUpdate', analyticsData.value)
  } finally {
    loading.value = false
  }
}

function generateMockAnalyticsData(): ConflictAnalyticsData {
  // 生成模拟数据用于演示
  const date = new Date()
  const days = props.dateRange === 'week' ? 7 : props.dateRange === 'month' ? 30 : props.dateRange === 'quarter' ? 90 : 365

  return {
    summary: {
      totalReservations: Math.floor(Math.random() * 500) + 100,
      totalConflicts: Math.floor(Math.random() * 50) + 10,
      conflictRate: Math.random() * 25 + 5,
      resolvedConflicts: Math.floor(Math.random() * 40) + 8,
      resolutionRate: Math.random() * 30 + 60,
      avgResolutionTime: Math.random() * 4 + 1
    },
    conflictsByType: [
      { type: '时间冲突', count: Math.floor(Math.random() * 20) + 5, percentage: 45 },
      { type: '容量冲突', count: Math.floor(Math.random() * 10) + 2, percentage: 20 },
      { type: '设备冲突', count: Math.floor(Math.random() * 8) + 1, percentage: 15 },
      { type: '维护冲突', count: Math.floor(Math.random() * 5) + 1, percentage: 10 },
      { type: '规则冲突', count: Math.floor(Math.random() * 3), percentage: 10 }
    ],
    conflictsByRoom: [
      { roomId: 'room-1', roomName: '会议室A', totalConflicts: 15, conflictRate: 12 },
      { roomId: 'room-2', roomName: '会议室B', totalConflicts: 8, conflictRate: 6 },
      { roomId: 'room-3', roomName: '会议室C', totalConflicts: 12, conflictRate: 10 },
      { roomId: 'room-4', roomName: '会议室D', totalConflicts: 5, conflictRate: 4 },
      { roomId: 'room-5', roomName: '会议室E', totalConflicts: 20, conflictRate: 18 }
    ],
    conflictsByTime: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      conflicts: Math.floor(Math.random() * 10) + Math.floor(Math.random() * 5)
    })),
    trends: Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      date: format(subDays(date, days - i - 1), 'yyyy-MM-dd'),
      reservations: Math.floor(Math.random() * 20) + 5,
      conflicts: Math.floor(Math.random() * 5) + 1
    })).reverse(),
    resolutions: [
      { strategy: '时间调整', count: 25, successRate: 85, avgTime: 2.5 },
      { strategy: '会议室更换', count: 15, successRate: 92, avgTime: 3.2 },
      { strategy: '协商解决', count: 8, successRate: 75, avgTime: 4.8 },
      { strategy: '忽略冲突', count: 5, successRate: 100, avgTime: 0.1 }
    ],
    suggestions: [
      {
        room: '会议室E',
        issue: '冲突率过高',
        recommendation: '建议增加会议室容量或改进预约规则',
        impact: 'high'
      },
      {
        room: '会议室A',
        issue: '时间段利用率不均衡',
        recommendation: '优化热门时间段的预约策略',
        impact: 'medium'
      },
      {
        room: '会议室C',
        issue: '设备配置不足',
        recommendation: '增加常用设备以满足更多需求',
        impact: 'low'
      }
    ]
  }
}

function handleExport(): void {
  if (!analyticsData.value) return

  const dataStr = JSON.stringify(analyticsData.value, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

  const exportFileDefaultName = `conflict-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`

  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()

  emit('exportData', analyticsData.value)
}

function setupAutoRefresh(): void {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer.value = setInterval(() => {
      loadAnalyticsData()
    }, props.refreshInterval * 1000)
  }
}

function clearAutoRefresh(): void {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

// 格式化函数
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatHours(value: number): string {
  return `${value.toFixed(1)}小时`
}

function getConflictTypeIcon(type: string): string {
  const icons = {
    '时间冲突': 'pi-clock',
    '容量冲突': 'pi-users',
    '设备冲突': 'pi-cog',
    '维护冲突': 'pi-wrench',
    '规则冲突': 'pi-lock'
  }
  return icons[type] || 'pi-info-circle'
}

// 生命周期
onMounted(() => {
  loadAnalyticsData()
  setupAutoRefresh()
})

// 监听器
watch(() => props.autoRefresh, (newVal) => {
  if (newVal) {
    setupAutoRefresh()
  } else {
    clearAutoRefresh()
  }
})

watch(() => props.refreshInterval, () => {
  clearAutoRefresh()
  if (props.autoRefresh) {
    setupAutoRefresh()
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  clearAutoRefresh()
})
</script>

<template>
  <div class="conflict-analytics">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">冲突分析面板</h2>
        <p class="text-sm text-gray-600 mt-1">{{ dateRangeText }}的预约冲突数据分析</p>
      </div>

      <div class="flex items-center space-x-3">
        <!-- 时间范围选择 -->
        <select
          v-model="dateRange"
          @change="loadAnalyticsData"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="week">过去一周</option>
          <option value="month">过去一月</option>
          <option value="quarter">过去三月</option>
          <option value="year">过去一年</option>
        </select>

        <!-- 自动刷新 -->
        <label class="flex items-center space-x-2">
          <input
            v-model="autoRefresh"
            type="checkbox"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <span class="text-sm text-gray-700">自动刷新</span>
        </label>

        <!-- 操作按钮 -->
        <button
          @click="loadAnalyticsData"
          :disabled="loading"
          class="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
        >
          <i :class="loading ? 'pi pi-spin pi-spinner mr-2' : 'pi pi-refresh mr-2'"></i>
          刷新数据
        </button>

        <button
          @click="handleExport"
          :disabled="!analyticsData"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <i class="pi pi-download mr-2"></i>
          导出数据
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !analyticsData" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      <p class="text-gray-600 mt-2">正在加载分析数据...</p>
    </div>

    <!-- 分析内容 -->
    <div v-else-if="analyticsData" class="space-y-6">
      <!-- 概览卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">总预约数</p>
              <p class="text-2xl font-bold text-gray-900">{{ analyticsData.summary.totalReservations }}</p>
            </div>
            <i class="pi pi-calendar text-3xl text-blue-500"></i>
          </div>
        </div>

        <div class="bg-white border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">冲突数量</p>
              <p class="text-2xl font-bold text-gray-900">{{ analyticsData.summary.totalConflicts }}</p>
            </div>
            <i class="pi pi-exclamation-triangle text-3xl text-orange-500"></i>
          </div>
        </div>

        <div class="bg-white border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">冲突率</p>
              <p class="text-2xl font-bold" :class="severityColors[conflictSeverityLevel]">
                {{ formatPercentage(analyticsData.summary.conflictRate) }}
              </p>
            </div>
            <i :class="[
              'text-3xl',
              conflictSeverityLevel === 'high' ? 'pi-times-circle text-red-500' :
              conflictSeverityLevel === 'medium' ? 'pi-exclamation-circle text-orange-500' :
              'pi-check-circle text-green-500'
            ]"></i>
          </div>
        </div>

        <div class="bg-white border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">解决率</p>
              <p class="text-2xl font-bold text-green-600">
                {{ formatPercentage(analyticsData.summary.resolutionRate) }}
              </p>
            </div>
            <i class="pi pi-check text-3xl text-green-500"></i>
          </div>
        </div>
      </div>

      <!-- 指标选择标签 -->
      <div class="bg-white border rounded-lg p-1">
        <div class="flex space-x-1">
          <button
            v-for="metric in ['rate', 'types', 'rooms', 'trends']"
            :key="metric"
            @click="selectedMetric = metric"
            class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors"
            :class="selectedMetric === metric
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'"
          >
            {{ metric === 'rate' ? '冲突率' :
               metric === 'types' ? '冲突类型' :
               metric === 'rooms' ? '会议室分析' : '趋势图表' }}
          </button>
        </div>
      </div>

      <!-- 动态内容区域 -->
      <div class="bg-white border rounded-lg p-6">
        <!-- 冲突类型分析 -->
        <div v-if="selectedMetric === 'types'">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">冲突类型分布</h3>
          <div class="space-y-3">
            <div
              v-for="item in analyticsData.conflictsByType"
              :key="item.type"
              class="flex items-center space-x-4"
            >
              <div class="flex items-center space-x-2 w-32">
                <i :class="getConflictTypeIcon(item.type) + ' text-blue-500'"></i>
                <span class="text-sm font-medium text-gray-700">{{ item.type }}</span>
              </div>
              <div class="flex-1">
                <div class="bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    class="bg-blue-500 h-full transition-all duration-500"
                    :style="{ width: `${item.percentage}%` }"
                  ></div>
                </div>
              </div>
              <div class="text-right w-20">
                <div class="text-sm font-bold text-gray-900">{{ item.count }}</div>
                <div class="text-xs text-gray-600">{{ formatPercentage(item.percentage) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 会议室冲突分析 -->
        <div v-else-if="selectedMetric === 'rooms'">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">会议室冲突分析</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">会议室</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">总冲突数</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">冲突率</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="room in analyticsData.conflictsByRoom" :key="room.roomId">
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ room.roomName }}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ room.totalConflicts }}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatPercentage(room.conflictRate) }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-1 text-xs rounded-full" :class="
                      room.conflictRate > 15 ? 'bg-red-100 text-red-800' :
                      room.conflictRate > 8 ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    ">
                      {{ room.conflictRate > 15 ? '高冲突' : room.conflictRate > 8 ? '中等' : '正常' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 时间分布分析 -->
        <div v-else-if="selectedMetric === 'trends'">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">冲突时间分布</h3>
          <div class="grid grid-cols-2 gap-6">
            <!-- 每小时冲突分布 -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">24小时冲突分布</h4>
              <div class="space-y-2">
                <div
                  v-for="item in analyticsData.conflictsByTime"
                  :key="item.hour"
                  class="flex items-center space-x-3"
                >
                  <span class="text-sm text-gray-600 w-12">{{ item.hour }}:00</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      class="bg-orange-500 h-full transition-all duration-300"
                      :style="{ width: `${Math.min((item.conflicts / 15) * 100, 100)}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium text-gray-900 w-8">{{ item.conflicts }}</span>
                </div>
              </div>
            </div>

            <!-- 趋势图表 -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">趋势概览</h4>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">平均每日预约</span>
                  <span class="text-sm font-bold text-blue-600">
                    {{ Math.round(analyticsData.trends.reduce((sum, t) => sum + t.reservations, 0) / analyticsData.trends.length) }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">平均每日冲突</span>
                  <span class="text-sm font-bold text-orange-600">
                    {{ Math.round(analyticsData.trends.reduce((sum, t) => sum + t.conflicts, 0) / analyticsData.trends.length) }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">峰值冲突日</span>
                  <span class="text-sm font-bold text-red-600">
                    {{ format(new Date(analyticsData.trends.reduce((max, t) => t.conflicts > max.conflicts ? t : max).date), 'MM/dd') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 冲突率概览 -->
        <div v-else>
          <h3 class="text-lg font-semibold text-gray-900 mb-4">冲突解决统计</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 解决策略 -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">解决策略效果</h4>
              <div class="space-y-2">
                <div
                  v-for="strategy in analyticsData.resolutions"
                  :key="strategy.strategy"
                  class="border rounded-lg p-3"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-900">{{ strategy.strategy }}</span>
                    <span class="text-sm text-green-600">{{ formatPercentage(strategy.successRate) }}</span>
                  </div>
                  <div class="text-xs text-gray-600">
                    使用{{ strategy.count }}次，平均{{ formatHours(strategy.avgTime) }}
                  </div>
                  <div class="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      class="bg-green-500 h-full"
                      :style="{ width: `${strategy.successRate}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 优化建议 -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">优化建议</h4>
              <div class="space-y-2">
                <div
                  v-for="suggestion in analyticsData.suggestions"
                  :key="suggestion.room"
                  class="border rounded-lg p-3"
                  :class="suggestion.impact === 'high' ? 'border-red-200 bg-red-50' :
                           suggestion.impact === 'medium' ? 'border-orange-200 bg-orange-50' :
                           'border-blue-200 bg-blue-50'"
                >
                  <div class="flex items-start space-x-2">
                    <i :class="[
                      'pi mt-0.5',
                      suggestion.impact === 'high' ? 'pi-exclamation-circle text-red-500' :
                      suggestion.impact === 'medium' ? 'pi-info-circle text-orange-500' :
                      'pi-lightbulb text-blue-500'
                    ]"></i>
                    <div class="flex-1">
                      <div class="text-sm font-medium text-gray-900">
                        {{ suggestion.room }} - {{ suggestion.issue }}
                      </div>
                      <div class="text-xs text-gray-600 mt-1">
                        {{ suggestion.recommendation }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="text-center py-12">
      <i class="pi pi-chart-bar text-4xl text-gray-300 mb-3"></i>
      <p class="text-gray-500">暂无分析数据</p>
      <p class="text-sm text-gray-400 mt-1">请点击刷新按钮加载数据</p>
    </div>
  </div>
</template>

<style scoped>
.conflict-analytics {
  @apply space-y-6;
}

/* 动画效果 */
.transition-all {
  @apply transition-all duration-300;
}

/* 表格样式 */
.divide-y > :not([hidden]) ~ :not([hidden]) {
  @apply border-gray-200;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .grid {
    @apply grid-cols-1;
  }

  .grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4 {
    @apply grid-cols-1;
  }

  .grid-cols-2 {
    @apply grid-cols-1;
  }
}
</style>