<template>
  <div class="anomaly-detection">
    <!-- 风险评分总览 -->
    <Card class="mb-6">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">系统风险评分</h3>
            <p class="text-gray-600 mt-1">基于最近 {{ analysisPeriod }} 小时的安全分析</p>
          </div>

          <div class="flex items-center gap-6">
            <div class="text-center">
              <div class="text-4xl font-bold" :class="getRiskScoreColor(riskScore)">
                {{ riskScore }}
              </div>
              <div class="text-sm text-gray-600">风险评分</div>
            </div>

            <div class="text-right">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" :class="getRiskStatusColor(riskScore)"></div>
                <span class="font-medium" :class="getRiskTextColor(riskScore)">
                  {{ getRiskStatus(riskScore) }}
                </span>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                {{ summary.totalAnomalies }} 个异常
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- 分析控制 -->
    <Card class="mb-6">
      <template #content>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">分析时间范围</label>
              <Dropdown
                v-model="selectedHours"
                :options="timeRangeOptions"
                optionLabel="label"
                optionValue="value"
                @change="runAnalysis"
                class="w-40"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">严重程度</label>
              <Dropdown
                v-model="selectedSeverity"
                :options="severityOptions"
                optionLabel="label"
                optionValue="value"
                @change="runAnalysis"
                class="w-32"
              />
            </div>
          </div>

          <Button
            @click="runAnalysis"
            icon="pi pi-refresh"
            label="重新分析"
            :loading="loading"
          />
        </div>
      </template>
    </Card>

    <!-- 安全建议 -->
    <Card v-if="recommendations.length > 0" class="mb-6">
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-info-circle text-blue-600"></i>
          <span>安全建议</span>
        </div>
      </template>
      <template #content>
        <div class="space-y-3">
          <div
            v-for="(recommendation, index) in recommendations"
            :key="index"
            class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
          >
            <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0">
              {{ index + 1 }}
            </div>
            <p class="text-gray-700">{{ recommendation }}</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- 异常详情 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 频繁失败操作 -->
      <Card v-if="anomalies.frequentFailures?.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-times-circle text-red-600"></i>
            <span>频繁失败操作</span>
            <Badge :value="anomalies.frequentFailures.length" severity="danger" />
          </div>
        </template>
        <template #content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="item in anomalies.frequentFailures"
              :key="`${item.userId}-${item.action}`"
              class="border-l-4 border-red-500 pl-4 py-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="item.risk"
                      :severity="getRiskSeverity(item.risk)"
                    />
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded">
                      {{ item.action }}
                    </code>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    用户: {{ item.userId }}
                  </p>
                  <p class="text-sm text-gray-600">
                    失败 {{ item.failureCount }} 次，影响 {{ item.affectedDays }} 天
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    最后发生: {{ formatDateTime(item.lastOccurrence) }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mt-2">{{ item.description }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- 可疑IP地址 -->
      <Card v-if="anomalies.suspiciousIPs?.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-shield text-yellow-600"></i>
            <span>可疑IP地址</span>
            <Badge :value="anomalies.suspiciousIPs.length" severity="warning" />
          </div>
        </template>
        <template #content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="item in anomalies.suspiciousIPs"
              :key="item.ipAddress"
              class="border-l-4 border-yellow-500 pl-4 py-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="item.risk"
                      :severity="getRiskSeverity(item.risk)"
                    />
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                      {{ item.ipAddress }}
                    </code>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ item.userCount }} 个用户，{{ item.totalRequests }} 次请求
                  </p>
                  <p class="text-sm text-gray-600">
                    失败 {{ item.failureCount }} 次，高风险 {{ item.highRiskCount }} 次
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mt-2">{{ item.description }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- 异常访问模式 -->
      <Card v-if="anomalies.unusualAccessPatterns?.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-purple-600"></i>
            <span>异常访问模式</span>
            <Badge :value="anomalies.unusualAccessPatterns.length" severity="info" />
          </div>
        </template>
        <template #content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="item in anomalies.unusualAccessPatterns"
              :key="`${item.userId}-${item.resourceType}`"
              class="border-l-4 border-purple-500 pl-4 py-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="item.risk"
                      :severity="getRiskSeverity(item.risk)"
                    />
                    <span class="font-medium">{{ item.resourceType }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    用户: {{ item.userId }}
                  </p>
                  <p class="text-sm text-gray-600">
                    访问 {{ item.accessCount }} 次，活跃 {{ item.activeHours }} 小时
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatDateTime(item.firstAccess) }} - {{ formatDateTime(item.lastAccess) }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mt-2">{{ item.description }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- 权限升级尝试 -->
      <Card v-if="anomalies.privilegeEscalations?.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-lock text-red-600"></i>
            <span>权限升级尝试</span>
            <Badge :value="anomalies.privilegeEscalations.length" severity="danger" />
          </div>
        </template>
        <template #content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="item in anomalies.privilegeEscalations"
              :key="item.id"
              class="border-l-4 border-red-500 pl-4 py-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="item.risk"
                      :severity="getRiskSeverity(item.risk)"
                    />
                    <Tag
                      :value="item.result"
                      :severity="getResultSeverity(item.result)"
                    />
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded">
                      {{ item.action }}
                    </code>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    用户: {{ item.userName || item.userId }}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatDateTime(item.timestamp) }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mt-2">{{ item.description }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- 高风险操作激增 -->
      <Card v-if="anomalies.highRiskOperations?.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle text-orange-600"></i>
            <span>高风险操作激增</span>
            <Badge :value="anomalies.highRiskOperations.length" severity="warning" />
          </div>
        </template>
        <template #content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="item in anomalies.highRiskOperations"
              :key="`${item.hour}-${item.action}`"
              class="border-l-4 border-orange-500 pl-4 py-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="item.risk"
                      :severity="getRiskSeverity(item.risk)"
                    />
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded">
                      {{ item.action }}
                    </code>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    时间: {{ formatDateTime(item.hour) }}
                  </p>
                  <p class="text-sm text-gray-600">
                    操作次数: {{ item.operationCount }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mt-2">{{ item.description }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- 时间基异常 -->
      <Card v-if="anomalies.timeBasedAnomalies?.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar text-indigo-600"></i>
            <span>非工作时间访问</span>
            <Badge :value="anomalies.timeBasedAnomalies.length" severity="info" />
          </div>
        </template>
        <template #content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="item in anomalies.timeBasedAnomalies"
              :key="item.userId"
              class="border-l-4 border-indigo-500 pl-4 py-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="item.risk"
                      :severity="getRiskSeverity(item.risk)"
                    />
                    <span class="font-medium">用户 {{ item.userId }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    非工作时间访问 {{ item.afterHoursAccess }} 次
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    首次访问: {{ formatDateTime(item.firstAfterHoursAccess) }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mt-2">{{ item.description }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- 错误激增 -->
      <Card v-if="anomalies.errorSpike?.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-bolt text-red-600"></i>
            <span>错误激增</span>
            <Badge :value="anomalies.errorSpike.length" severity="danger" />
          </div>
        </template>
        <template #content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="item in anomalies.errorSpike"
              :key="`${item.hour}-${item.resourceType}`"
              class="border-l-4 border-red-500 pl-4 py-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Tag
                      :value="item.risk"
                      :severity="getRiskSeverity(item.risk)"
                    />
                    <span class="font-medium">{{ item.resourceType }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    时间: {{ formatDateTime(item.hour) }}
                  </p>
                  <p class="text-sm text-gray-600">
                    错误次数: {{ item.errorCount }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mt-2">{{ item.description }}</p>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 无异常数据 -->
    <div v-if="!loading && !hasAnyAnomalies" class="text-center py-12">
      <i class="pi pi-check-circle text-6xl text-green-500 mb-4"></i>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">安全状况良好</h3>
      <p class="text-gray-600">在最近 {{ analysisPeriod }} 小时内未检测到异常活动</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '~/stores/admin'

const adminStore = useAdminStore()

interface AnomalyData {
  frequentFailures: Array<{
    userId: string
    action: string
    failureCount: number
    affectedDays: number
    lastOccurrence: string
    risk: string
    description: string
  }>
  suspiciousIPs: Array<{
    ipAddress: string
    userCount: number
    totalRequests: number
    failureCount: number
    highRiskCount: number
    risk: string
    description: string
  }>
  unusualAccessPatterns: Array<{
    userId: string
    resourceType: string
    accessCount: number
    activeHours: number
    firstAccess: string
    lastAccess: string
    risk: string
    description: string
  }>
  privilegeEscalations: Array<{
    id: string
    userId: string
    userName?: string
    action: string
    result: string
    riskLevel: string
    timestamp: string
    risk: string
    description: string
  }>
  highRiskOperations: Array<{
    hour: string
    action: string
    operationCount: number
    risk: string
    description: string
  }>
  timeBasedAnomalies: Array<{
    userId: string
    afterHoursAccess: number
    firstAfterHoursAccess: string
    risk: string
    description: string
  }>
  errorSpike: Array<{
    hour: string
    resourceType: string
    errorCount: number
    risk: string
    description: string
  }>
}

// 响应式数据
const anomalies = ref<AnomalyData>({
  frequentFailures: [],
  suspiciousIPs: [],
  unusualAccessPatterns: [],
  privilegeEscalations: [],
  highRiskOperations: [],
  timeBasedAnomalies: [],
  errorSpike: []
})

const riskScore = ref(0)
const recommendations = ref<string[]>([])
const analysisPeriod = ref(24)
const loading = ref(false)

const selectedHours = ref(24)
const selectedSeverity = ref('all')

// 选项数据
const timeRangeOptions = ref([
  { label: '1小时', value: 1 },
  { label: '6小时', value: 6 },
  { label: '12小时', value: 12 },
  { label: '24小时', value: 24 },
  { label: '3天', value: 72 },
  { label: '7天', value: 168 }
])

const severityOptions = ref([
  { label: '全部', value: 'all' },
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' }
])

// 计算属性
const hasAnyAnomalies = computed(() => {
  return Object.values(anomalies.value).some(arr => arr.length > 0)
})

const summary = computed(() => {
  const totalAnomalies = Object.values(anomalies.value).reduce(
    (sum, arr) => sum + arr.length, 0
  )
  const highRiskCount = Object.values(anomalies.value).reduce(
    (sum, arr) => sum + arr.filter(item => item.risk === 'HIGH' || item.risk === 'CRITICAL').length, 0
  )
  const criticalRiskCount = Object.values(anomalies.value).reduce(
    (sum, arr) => sum + arr.filter(item => item.risk === 'CRITICAL').length, 0
  )

  return {
    totalAnomalies,
    highRiskCount,
    criticalRiskCount
  }
})

// 事件
const emit = defineEmits<{
  refresh: []
}>()

// 方法
const runAnalysis = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      hours: selectedHours.value.toString(),
      severity: selectedSeverity.value
    })

    const data = await adminStore.getAnomalyDetection({
      timeRange: selectedTimeRange.value,
      severity: selectedSeverity.value,
      type: selectedType.value,
      limit: 100
    })

    anomalies.value = data.anomalies
    riskScore.value = data.riskScore
    recommendations.value = data.recommendations
    analysisPeriod.value = data.analysisPeriod.hours
  } catch (error) {
    console.error('Failed to analyze anomalies:', error)
  } finally {
    loading.value = false
  }
}

// 格式化函数
const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getRiskSeverity = (risk: string) => {
  switch (risk) {
    case 'CRITICAL': return 'danger'
    case 'HIGH': return 'warning'
    case 'MEDIUM': return 'info'
    case 'LOW': return 'success'
    default: return 'info'
  }
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

const getRiskScoreColor = (score: number) => {
  if (score >= 80) return 'text-red-600'
  if (score >= 60) return 'text-orange-600'
  if (score >= 40) return 'text-yellow-600'
  if (score >= 20) return 'text-blue-600'
  return 'text-green-600'
}

const getRiskStatusColor = (score: number) => {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-yellow-500'
  if (score >= 20) return 'bg-blue-500'
  return 'bg-green-500'
}

const getRiskStatus = (score: number) => {
  if (score >= 80) return '严重风险'
  if (score >= 60) return '高风险'
  if (score >= 40) return '中风险'
  if (score >= 20) return '低风险'
  return '安全'
}

const getRiskTextColor = (score: number) => {
  if (score >= 80) return 'text-red-600'
  if (score >= 60) return 'text-orange-600'
  if (score >= 40) return 'text-yellow-600'
  if (score >= 20) return 'text-blue-600'
  return 'text-green-600'
}

// 生命周期
onMounted(() => {
  runAnalysis()
})

// 暴露方法
defineExpose({
  runAnalysis
})
</script>

<style scoped>
.anomaly-detection {
  @apply space-y-4;
}
</style>