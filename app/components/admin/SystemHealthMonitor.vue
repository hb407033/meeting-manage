<template>
  <div class="system-health-monitor">
    <!-- 系统状态概览 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">系统状态</h3>
            <p class="text-gray-600 mt-1">整体健康度评估</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold" :class="getHealthColor(overallHealth)">
              {{ overallHealth }}%
            </div>
            <div class="text-sm text-gray-600">{{ getHealthStatus(overallHealth) }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">审计系统</h3>
            <p class="text-gray-600 mt-1">日志记录状态</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold" :class="getServiceStatusColor(auditServiceStatus)">
              {{ auditServiceStatus.queueLength }}
            </div>
            <div class="text-sm text-gray-600">队列待处理</div>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">告警系统</h3>
            <p class="text-gray-600 mt-1">活跃告警数量</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold" :class="getAlertStatusColor(alertStats.active)">
              {{ alertStats.active }}
            </div>
            <div class="text-sm text-gray-600">活跃告警</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务组件状态 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 核心服务状态 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-server text-blue-600"></i>
            <span>核心服务状态</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-3">
            <div
              v-for="service in coreServices"
              :key="service.name"
              class="flex items-center justify-between p-3 rounded-lg"
              :class="getServiceBgColor(service.status)"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="getServiceIconColor(service.status)">
                  <i :class="service.icon" class="text-lg"></i>
                </div>
                <div>
                  <div class="font-medium">{{ service.name }}</div>
                  <div class="text-sm text-gray-600">{{ service.description }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Tag
                  :value="service.status"
                  :severity="getStatusSeverity(service.status)"
                />
                <div v-if="service.responseTime" class="text-sm text-gray-500">
                  {{ service.responseTime }}ms
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- 系统资源状态 -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-pie text-green-600"></i>
            <span>系统资源状态</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div
              v-for="resource in systemResources"
              :key="resource.name"
              class="space-y-2"
            >
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700">{{ resource.name }}</span>
                <span class="text-sm text-gray-600">{{ resource.value }}{{ resource.unit }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getResourceBarColor(resource.percentage)"
                  :style="{ width: `${Math.min(resource.percentage, 100)}%` }"
                />
              </div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ resource.percentage }}% 使用率</span>
                <span :class="getResourceTextColor(resource.percentage)">
                  {{ getResourceStatus(resource.percentage) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 审计日志统计 -->
    <Card class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-line text-purple-600"></i>
            <span>审计日志活动趋势</span>
          </div>
          <Button
            @click="refreshStats"
            icon="pi pi-refresh"
            label="刷新"
            size="small"
            severity="secondary"
            outlined
            :loading="loading"
          />
        </div>
      </template>
      <template #content>
        <div class="h-64 flex items-center justify-center">
          <div v-if="loading" class="text-center">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
            <p class="text-gray-500 mt-2">正在加载数据...</p>
          </div>
          <div v-else-if="activityData.length === 0" class="text-center">
            <i class="pi pi-info-circle text-2xl text-gray-400"></i>
            <p class="text-gray-500 mt-2">暂无活动数据</p>
          </div>
          <div v-else class="w-full h-full">
            <!-- 简单的趋势图 -->
            <div class="flex items-end justify-between h-full px-2">
              <div
                v-for="(data, index) in activityData"
                :key="index"
                class="flex flex-col items-center justify-end"
                style="flex: 1; height: 100%;"
              >
                <div class="w-full bg-blue-500 rounded-t transition-all duration-300" :style="{ height: `${data.percentage}%` }"></div>
                <div class="text-xs text-gray-600 mt-1 text-center">
                  {{ formatTime(data.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- 最近事件 -->
    <Card class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-history text-orange-600"></i>
            <span>最近系统事件</span>
          </div>
          <Button
            @click="loadRecentEvents"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            outlined
          />
        </div>
      </template>
      <template #content>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="event in recentEvents"
            :key="event.id"
            class="flex items-start gap-3 p-3 border-l-4 rounded-lg"
            :class="getEventBorderColor(event.type)"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Tag
                  :value="getEventTypeLabel(event.type)"
                  :severity="getEventTypeSeverity(event.type)"
                />
                <span class="font-medium">{{ event.title }}</span>
                <Tag
                  v-if="event.severity"
                  :value="event.severity"
                  :severity="getSeveritySeverity(event.severity)"
                />
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ event.description }}</p>
              <div class="text-xs text-gray-500 mt-2">
                {{ formatDateTime(event.timestamp) }}
              </div>
            </div>
            <div class="text-xs text-gray-400">
              {{ formatRelativeTime(event.timestamp) }}
            </div>
          </div>
        </div>
        <div v-if="recentEvents.length === 0" class="text-center py-8">
          <i class="pi pi-inbox text-4xl text-gray-400"></i>
          <p class="text-gray-500 mt-2">暂无最近事件</p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ServiceStatus {
  name: string
  icon: string
  description: string
  status: 'healthy' | 'warning' | 'error'
  responseTime?: number
}

interface SystemResource {
  name: string
  value: number
  unit: string
  percentage: number
  threshold: {
    warning: number
    critical: number
  }
}

interface ActivityData {
  timestamp: string
  count: number
  percentage: number
}

interface SystemEvent {
  id: string
  type: 'system' | 'security' | 'performance' | 'audit'
  title: string
  description: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: string
}

const overallHealth = ref(100)
const loading = ref(false)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

const auditServiceStatus = ref({
  queueLength: 0,
  isProcessing: false
})

const alertStats = ref({
  active: 0,
  critical: 0,
  high: 0
})

const coreServices = ref<ServiceStatus[]>([
  {
    name: '数据库服务',
    icon: 'pi pi-database',
    description: 'MySQL数据库连接',
    status: 'healthy',
    responseTime: 12
  },
  {
    name: 'Redis缓存',
    icon: 'pi pi-mobile',
    description: 'Redis缓存服务',
    status: 'healthy',
    responseTime: 3
  },
  {
    name: '审计日志',
    icon: 'pi pi-file',
    description: '审计日志记录服务',
    status: 'healthy',
    responseTime: 8
  }
])

const systemResources = ref<SystemResource[]>([
  {
    name: 'CPU使用率',
    value: 45,
    unit: '%',
    percentage: 45,
    threshold: { warning: 70, critical: 90 }
  },
  {
    name: '内存使用率',
    value: 68,
    unit: '%',
    percentage: 68,
    threshold: { warning: 80, critical: 95 }
  },
  {
    name: '磁盘使用率',
    value: 25,
    unit: '%',
    percentage: 25,
    threshold: { warning: 80, critical: 95 }
  },
  {
    name: '网络带宽',
    value: 120,
    unit: 'Mbps',
    percentage: 30,
    threshold: { warning: 70, critical: 90 }
  }
])

const activityData = ref<ActivityData[]>([])
const recentEvents = ref<SystemEvent[]>([])

// 方法
const checkSystemHealth = async () => {
  try {
    // 模拟健康检查
    const response = await $fetch('/api/health')
    const healthData = response.data

    // 更新服务状态
    coreServices.value = coreServices.value.map(service => ({
      ...service,
      status: healthData.services[service.name]?.status || 'unknown',
      responseTime: healthData.services[service.name]?.responseTime || service.responseTime
    }))

    // 更新系统资源
    systemResources.value = systemResources.value.map(resource => ({
      ...resource,
      ...healthData.resources?.[resource.name] || {}
    }))

    // 计算整体健康度
    const services = coreServices.value
    const healthyCount = services.filter(s => s.status === 'healthy').length
    overallHealth.value = Math.round((healthyCount / services.length) * 100)

  } catch (error) {
    console.error('Failed to check system health:', error)
    overallHealth.value = 0
  }
}

const refreshStats = async () => {
  loading.value = true
  try {
    await checkSystemHealth()
    await loadActivityData()
    await loadRecentEvents()
  } finally {
    loading.value = false
  }
}

const loadActivityData = async () => {
  try {
    // 模拟活动数据
    const now = new Date()
    const data: ActivityData[] = []

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000) // 每小时
      data.push({
        timestamp: timestamp.toISOString(),
        count: Math.floor(Math.random() * 100) + 20,
        percentage: Math.random() * 100
      })
    }

    activityData.value = data
  } catch (error) {
    console.error('Failed to load activity data:', error)
  }
}

const loadRecentEvents = async () => {
  try {
    // 模拟最近事件
    const events: SystemEvent[] = [
      {
        id: '1',
        type: 'security',
        title: '可疑登录尝试',
        description: '检测到来自异常IP的多次登录失败',
        severity: 'MEDIUM',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'audit',
        title: '高风险操作记录',
        description: '用户执行了权限变更操作',
        severity: 'HIGH',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'system',
        title: '系统备份完成',
        description: '数据库自动备份任务执行成功',
        severity: 'LOW',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ]

    recentEvents.value = events
  } catch (error) {
    console.error('Failed to load recent events:', error)
  }
}

// 格式化函数
const getHealthColor = (score: number) => {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-blue-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

const getHealthStatus = (score: number) => {
  if (score >= 90) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 50) return '警告'
  return '异常'
}

const getServiceStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'text-green-600'
    case 'warning': return 'text-yellow-600'
    case 'error': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

const getAlertStatusColor = (count: number) => {
  if (count === 0) return 'text-green-600'
  if (count <= 5) return 'text-yellow-600'
  return 'text-red-600'
}

const getServiceBgColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-50'
    case 'warning': return 'bg-yellow-50'
    case 'error': return 'bg-red-50'
    default: return 'bg-gray-50'
  }
}

const getServiceIconColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-100 text-green-600'
    case 'warning': return 'bg-yellow-100 text-yellow-600'
    case 'error': return 'bg-red-100 text-red-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'healthy': return 'success'
    case 'warning': return 'warning'
    case 'error': return 'danger'
    default: return 'info'
  }
}

const getResourceBarColor = (percentage: number) => {
  if (percentage < 60) return 'bg-green-500'
  if (percentage < 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getResourceTextColor = (percentage: number) => {
  if (percentage < 60) return 'text-green-600'
  if (percentage < 80) return 'text-yellow-600'
  return 'text-red-600'
}

const getResourceStatus = (percentage: number) => {
  if (percentage < 60) return '正常'
  if (percentage < 80) return '注意'
  return '警告'
}

const getEventBorderColor = (type: string) => {
  switch (type) {
    case 'system': return 'border-blue-500 bg-blue-50'
    case 'security': return 'border-red-500 bg-red-50'
    case 'performance': return 'border-yellow-500 bg-yellow-50'
    case 'audit': return 'border-purple-500 bg-purple-50'
    default: return 'border-gray-500 bg-gray-50'
  }
}

const getEventTypeLabel = (type: string) => {
  const labels = {
    system: '系统',
    security: '安全',
    performance: '性能',
    audit: '审计'
  }
  return labels[type as keyof typeof labels] || type
}

const getEventTypeSeverity = (type: string) => {
  switch (type) {
    case 'system': return 'info'
    case 'security': return 'danger'
    case 'performance': return 'warning'
    case 'audit': return 'secondary'
    default: return 'info'
  }
}

const getSeveritySeverity = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'danger'
    case 'HIGH': return 'warning'
    case 'MEDIUM': return 'info'
    case 'LOW': return 'success'
    default: return 'info'
  }
}

const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatRelativeTime = (timestamp: string) => {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  checkSystemHealth()
  loadActivityData()
  loadRecentEvents()

  // 设置定期刷新
  refreshInterval.value = setInterval(() => {
    checkSystemHealth()
  }, 60000) // 每分钟刷新一次
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.system-health-monitor {
  @apply space-y-6;
}
</style>