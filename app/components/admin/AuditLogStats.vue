<template>
  <div class="audit-log-stats">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- 操作结果分布 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-pie text-blue-600"></i>
            <span>操作结果分布</span>
          </div>
        </template>
        <template #content>
          <div v-if="statsData" class="space-y-3">
            <div
              v-for="(count, result) in statsData.distributions.result"
              :key="result"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <Tag
                  :value="result"
                  :severity="getResultSeverity(result)"
                />
                <span class="text-gray-600">{{ count.toLocaleString() }} 次</span>
              </div>
              <div class="text-sm text-gray-500">
                {{ ((count / statsData.summary.totalLogs) * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
          </div>
        </template>
      </Card>

      <!-- 风险级别分布 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle text-yellow-600"></i>
            <span>风险级别分布</span>
          </div>
        </template>
        <template #content>
          <div v-if="statsData" class="space-y-3">
            <div
              v-for="(count, riskLevel) in statsData.distributions.riskLevel"
              :key="riskLevel"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <Tag
                  :value="riskLevel"
                  :severity="getRiskSeverity(riskLevel)"
                />
                <span class="text-gray-600">{{ count.toLocaleString() }} 次</span>
              </div>
              <div class="text-sm text-gray-500">
                {{ ((count / statsData.summary.totalLogs) * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
          </div>
        </template>
      </Card>

      <!-- 资源类型分布 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-folder text-green-600"></i>
            <span>资源类型分布</span>
          </div>
        </template>
        <template #content>
          <div v-if="statsData" class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="resource in statsData.distributions.resources"
              :key="resource.resourceType"
              class="flex items-center justify-between py-2 border-b border-gray-100"
            >
              <div>
                <span class="font-medium">{{ resource.resourceType }}</span>
                <span class="text-gray-600 ml-2">{{ resource.count.toLocaleString() }} 次</span>
              </div>
              <div class="text-sm text-gray-500">
                {{ ((resource.count / statsData.summary.totalLogs) * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
          </div>
        </template>
      </Card>

      <!-- 热门操作 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-cog text-purple-600"></i>
            <span>热门操作 TOP 10</span>
          </div>
        </template>
        <template #content>
          <div v-if="statsData" class="space-y-2">
            <div
              v-for="(action, index) in statsData.distributions.actions"
              :key="action.action"
              class="flex items-center gap-3"
            >
              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                {{ index + 1 }}
              </div>
              <div class="flex-1">
                <div class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {{ action.action }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ action.count.toLocaleString() }} 次
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
          </div>
        </template>
      </Card>

      <!-- 活跃用户 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-indigo-600"></i>
            <span>活跃用户 TOP 10</span>
          </div>
        </template>
        <template #content>
          <div v-if="statsData" class="space-y-3">
            <div
              v-for="(user, index) in statsData.userActivity"
              :key="user.userId"
              class="flex items-center gap-3"
            >
              <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-600">
                {{ index + 1 }}
              </div>
              <div class="flex-1">
                <div class="font-medium">
                  {{ user.user?.name || '未知用户' }}
                </div>
                <div v-if="user.user?.email" class="text-xs text-gray-500">
                  {{ user.user.email }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ user.count.toLocaleString() }} 次操作
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
          </div>
        </template>
      </Card>

      <!-- 最近高风险活动 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-shield text-red-600"></i>
            <span>最近高风险活动</span>
          </div>
        </template>
        <template #content>
          <div v-if="statsData" class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="activity in statsData.recentHighRiskActivities"
              :key="activity.id"
              class="border-l-4 border-red-500 pl-4 py-2"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="activity.riskLevel"
                      :severity="getRiskSeverity(activity.riskLevel)"
                    />
                    <Tag
                      :value="activity.result"
                      :severity="getResultSeverity(activity.result)"
                    />
                  </div>
                  <div class="mt-1">
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded">
                      {{ activity.action }}
                    </code>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ activity.resourceType }}
                    <span v-if="activity.resourceId">({{ activity.resourceId }})</span>
                  </div>
                  <div v-if="activity.user" class="text-xs text-gray-500 mt-1">
                    {{ activity.user.name }}
                  </div>
                </div>
                <div class="text-xs text-gray-400 text-right">
                  {{ formatDateTime(activity.timestamp) }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
          </div>
        </template>
      </Card>
    </div>

    <!-- 每日活动趋势 -->
    <Card class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-line text-blue-600"></i>
            <span>每日活动趋势</span>
          </div>
          <div class="text-sm text-gray-500">
            最近 {{ statsData?.dailyActivity.length || 0 }} 天
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="statsData" class="space-y-4">
          <div class="grid grid-cols-4 gap-4 text-center">
            <div class="bg-blue-50 p-3 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">
                {{ statsData.trends.recentWeekAverage.toFixed(0) }}
              </div>
              <div class="text-sm text-gray-600">最近7天日均</div>
            </div>
            <div class="bg-green-50 p-3 rounded-lg">
              <div class="text-2xl font-bold text-green-600">
                {{ statsData.trends.previousWeekAverage.toFixed(0) }}
              </div>
              <div class="text-sm text-gray-600">前7天日均</div>
            </div>
            <div class="bg-purple-50 p-3 rounded-lg">
              <div class="text-2xl font-bold text-purple-600">
                {{ calculateTrendChange() }}%
              </div>
              <div class="text-sm text-gray-600">趋势变化</div>
            </div>
            <div class="bg-orange-50 p-3 rounded-lg">
              <div class="text-2xl font-bold text-orange-600">
                {{ statsData.summary.totalLogs.toLocaleString() }}
              </div>
              <div class="text-sm text-gray-600">总操作数</div>
            </div>
          </div>

          <!-- 简化的趋势图 -->
          <div class="mt-6">
            <div class="space-y-2">
              <div
                v-for="(day, index) in statsData.dailyActivity.slice(0, 14)"
                :key="day.date"
                class="flex items-center gap-3"
              >
                <div class="w-20 text-sm text-gray-600 text-right">
                  {{ formatDate(day.date) }}
                </div>
                <div class="flex-1 relative">
                  <div class="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
                      :style="{
                        width: `${(day.total / Math.max(...statsData.dailyActivity.map(d => d.total))) * 100}%`
                      }"
                    />
                  </div>
                </div>
                <div class="w-16 text-sm text-gray-700 text-right font-medium">
                  {{ day.total.toLocaleString() }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface StatsData {
  summary: {
    totalLogs: number
    periodDays: number
    startDate: string
    endDate: string
  }
  distributions: {
    result: Record<string, number>
    riskLevel: Record<string, number>
    actions: Array<{ action: string; count: number }>
    resources: Array<{ resourceType: string; count: number }>
  }
  userActivity: Array<{
    userId: string
    count: number
    user?: { name: string; email: string }
  }>
  recentHighRiskActivities: Array<{
    id: string
    action: string
    resourceType: string
    resourceId?: string
    riskLevel: string
    result: string
    timestamp: string
    user?: { name: string; email: string }
  }>
  dailyActivity: Array<{
    date: string
    total: number
    success: number
    failure: number
    highRisk: number
  }>
  trends: {
    recentWeekAverage: number
    previousWeekAverage: number
  }
}

// 响应式数据
const statsData = ref<StatsData | null>(null)
const loading = ref(false)

// 事件
const emit = defineEmits<{
  refresh: []
}>()

// 方法
const loadStats = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/v1/admin/audit-logs/stats?days=30')
    statsData.value = response.data
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loading.value = false
  }
}

const calculateTrendChange = () => {
  if (!statsData.value) return 0
  const { recentWeekAverage, previousWeekAverage } = statsData.value.trends
  if (previousWeekAverage === 0) return 0
  return Math.round(((recentWeekAverage - previousWeekAverage) / previousWeekAverage) * 100)
}

// 格式化函数
const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

const getResultSeverity = (result: string) => {
  switch (result) {
    case 'SUCCESS': return 'success'
    case 'FAILURE': return 'danger'
    case 'PARTIAL': return 'warning'
    case 'ERROR': return 'danger'
    default: return 'info'
  }
}

const getRiskSeverity = (riskLevel: string) => {
  switch (riskLevel) {
    case 'LOW': return 'success'
    case 'MEDIUM': return 'info'
    case 'HIGH': return 'warning'
    case 'CRITICAL': return 'danger'
    default: return 'info'
  }
}

// 生命周期
onMounted(() => {
  loadStats()
})

// 暴露方法供父组件调用
defineExpose({
  loadStats
})
</script>

<style scoped>
.audit-log-stats {
  @apply space-y-4;
}
</style>