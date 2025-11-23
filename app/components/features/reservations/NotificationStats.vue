<template>
  <div class="notification-stats">
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-bar"></i>
            <span>通知统计</span>
          </div>
          <div class="flex items-center gap-2">
            <Dropdown
              v-model="selectedPeriod"
              :options="periodOptions"
              optionLabel="label"
              optionValue="value"
              @change="loadStats"
              class="w-32"
            />
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              text
              @click="loadStats"
              :loading="loading"
            />
          </div>
        </div>
      </template>

      <template #content>
        <div v-if="loading" class="flex justify-center py-8">
          <ProgressSpinner />
        </div>

        <div v-else-if="!statsData" class="text-center py-8">
          <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-600">暂无统计数据</p>
        </div>

        <div v-else class="space-y-6">
          <!-- 总体统计 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">总体统计</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-blue-600">{{ statsData.summary.totalSent }}</div>
                <div class="text-sm text-gray-600">总发送数</div>
                <div class="text-xs text-gray-500 mt-1">过去{{ selectedPeriod }}天</div>
              </div>
              <div class="bg-green-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-green-600">{{ statsData.summary.totalDelivered }}</div>
                <div class="text-sm text-gray-600">已送达</div>
                <div class="text-xs text-green-600 mt-1">{{ statsData.summary.deliveryRate }}%</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-purple-600">{{ statsData.summary.totalRead }}</div>
                <div class="text-sm text-gray-600">已阅读</div>
                <div class="text-xs text-purple-600 mt-1">{{ statsData.summary.readRate }}%</div>
              </div>
              <div class="bg-red-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-red-600">{{ statsData.summary.totalFailed }}</div>
                <div class="text-sm text-gray-600">发送失败</div>
                <div class="text-xs text-red-600 mt-1">{{ statsData.summary.failureRate }}%</div>
              </div>
            </div>
          </div>

          <!-- 按类型统计 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">按通知类型统计</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="typeStat in statsData.typeStats"
                :key="typeStat.type"
                class="bg-white border border-gray-200 p-4 rounded-lg"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" :class="getTypeColor(typeStat.type)"></div>
                    <span class="font-medium">{{ getTypeLabel(typeStat.type) }}</span>
                  </div>
                  <Badge :value="typeStat.totalSent" severity="info" />
                </div>
                <div class="grid grid-cols-3 gap-2 text-sm">
                  <div class="text-center">
                    <div class="font-semibold text-green-600">{{ typeStat.totalDelivered }}</div>
                    <div class="text-gray-500">已送达</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-purple-600">{{ typeStat.totalRead }}</div>
                    <div class="text-gray-500">已阅读</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-red-600">{{ typeStat.totalFailed }}</div>
                    <div class="text-gray-500">失败</div>
                  </div>
                </div>
                <div class="mt-2">
                  <ProgressBar
                    :value="parseFloat(typeStat.deliveryRate)"
                    class="h-2"
                  />
                  <div class="flex justify-between text-xs text-gray-500 mt-1">
                    <span>送达率: {{ typeStat.deliveryRate }}%</span>
                    <span>阅读率: {{ typeStat.readRate }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 按渠道统计 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">按通知渠道统计</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="channelStat in statsData.channelStats"
                :key="channelStat.channel"
                class="bg-white border border-gray-200 p-4 rounded-lg"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <i :class="getChannelIcon(channelStat.channel)" class="text-lg"></i>
                    <span class="font-medium">{{ getChannelLabel(channelStat.channel) }}</span>
                  </div>
                  <Badge :value="channelStat.totalSent" severity="info" />
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">送达率</span>
                    <span class="font-medium text-green-600">{{ channelStat.deliveryRate }}%</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">阅读率</span>
                    <span class="font-medium text-purple-600">{{ channelStat.readRate }}%</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">平均送达时间</span>
                    <span class="font-medium text-blue-600">{{ channelStat.avgDeliveryTime || 0 }}秒</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 每日统计图表 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">每日发送趋势</h3>
            <div class="bg-white border border-gray-200 p-4 rounded-lg">
              <div class="h-64 flex items-end justify-between gap-1">
                <div
                  v-for="(dayStat, index) in statsData.dailyStats"
                  :key="dayStat.date"
                  class="flex-1 bg-blue-500 hover:bg-blue-600 transition-colors rounded-t relative group"
                  :style="{ height: `${(dayStat.totalSent / Math.max(...statsData.dailyStats.map(d => d.totalSent))) * 100}%` }"
                >
                  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    <div>{{ formatDate(dayStat.date) }}</div>
                    <div>发送: {{ dayStat.totalSent }}</div>
                    <div>送达: {{ dayStat.totalDelivered }}</div>
                  </div>
                </div>
              </div>
              <div class="mt-4 flex justify-between text-xs text-gray-500">
                <span>{{ formatDate(statsData.dailyStats[0]?.date) }}</span>
                <span>{{ formatDate(statsData.dailyStats[statsData.dailyStats.length - 1]?.date) }}</span>
              </div>
            </div>
          </div>

          <!-- 最近通知活动 -->
          <div v-if="statsData.recentNotifications.length > 0">
            <h3 class="text-lg font-semibold mb-4">最近通知活动</h3>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="notification in statsData.recentNotifications.slice(0, 10)"
                :key="notification.id"
                class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex-shrink-0">
                  <i :class="getNotificationIcon(notification.type, notification.status)" class="text-lg"></i>
                </div>
                <div class="flex-grow">
                  <div class="font-medium">{{ notification.title }}</div>
                  <div class="text-sm text-gray-600">{{ getNotificationSubtitle(notification) }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium">{{ formatDateTime(notification.createdAt) }}</div>
                  <div class="text-xs">
                    <Badge
                      :value="getStatusLabel(notification.status)"
                      :severity="getStatusSeverity(notification.status)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import ProgressBar from 'primevue/progressbar'

// Toast
const toast = useToast()

// 响应式数据
const loading = ref(false)
const selectedPeriod = ref(30)
const statsData = ref<any>(null)

const periodOptions = [
  { label: '7天', value: 7 },
  { label: '30天', value: 30 },
  { label: '90天', value: 90 }
]

// 方法
const loadStats = async () => {
  try {
    loading.value = true

    const { useNotificationsStore } = await import('~/stores/notifications')
    const notificationsStore = useNotificationsStore()

    const response = await notificationsStore.getNotificationStats(selectedPeriod.value.toString())

    if (response) {
      statsData.value = response
    } else {
      throw new Error('加载统计数据失败')
    }
  } catch (error) {
    console.error('Failed to load notification stats:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: error.message || '无法加载通知统计数据',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const getTypeLabel = (type: string) => {
  const typeLabels: Record<string, string> = {
    'RESERVATION_REMINDER': '预约提醒',
    'RESERVATION_CONFIRMED': '预约确认',
    'RESERVATION_CANCELLED': '预约取消',
    'RESERVATION_MODIFIED': '预约修改',
    'RECURRING_REMINDER': '周期性预约提醒',
    'SYSTEM_ANNOUNCEMENT': '系统公告',
    'MAINTENANCE_NOTICE': '维护通知',
    'SECURITY_ALERT': '安全告警',
    'REMINDER_PREVIEW': '提醒预览'
  }
  return typeLabels[type] || type
}

const getTypeColor = (type: string) => {
  const typeColors: Record<string, string> = {
    'RESERVATION_REMINDER': 'bg-blue-500',
    'RESERVATION_CONFIRMED': 'bg-green-500',
    'RESERVATION_CANCELLED': 'bg-red-500',
    'RESERVATION_MODIFIED': 'bg-yellow-500',
    'RECURRING_REMINDER': 'bg-purple-500',
    'SYSTEM_ANNOUNCEMENT': 'bg-indigo-500',
    'MAINTENANCE_NOTICE': 'bg-orange-500',
    'SECURITY_ALERT': 'bg-red-600',
    'REMINDER_PREVIEW': 'bg-gray-500'
  }
  return typeColors[type] || 'bg-gray-500'
}

const getChannelLabel = (channel: string) => {
  const channelLabels: Record<string, string> = {
    'EMAIL': '邮件',
    'SYSTEM': '系统内',
    'WEBSOCKET': '实时推送',
    'SMS': '短信',
    'PUSH': '移动推送'
  }
  return channelLabels[channel] || channel
}

const getChannelIcon = (channel: string) => {
  const channelIcons: Record<string, string> = {
    'EMAIL': 'pi pi-envelope',
    'SYSTEM': 'pi pi-desktop',
    'WEBSOCKET': 'pi pi-wifi',
    'SMS': 'pi pi-mobile',
    'PUSH': 'pi pi-bell'
  }
  return channelIcons[channel] || 'pi pi-info-circle'
}

const getStatusLabel = (status: string) => {
  const statusLabels: Record<string, string> = {
    'PENDING': '待发送',
    'SENDING': '发送中',
    'SENT': '已发送',
    'DELIVERED': '已送达',
    'READ': '已阅读',
    'FAILED': '发送失败',
    'CANCELLED': '已取消'
  }
  return statusLabels[status] || status
}

const getStatusSeverity = (status: string) => {
  const statusSeverity: Record<string, any> = {
    'PENDING': 'secondary',
    'SENDING': 'info',
    'SENT': 'success',
    'DELIVERED': 'success',
    'READ': 'success',
    'FAILED': 'danger',
    'CANCELLED': 'secondary'
  }
  return statusSeverity[status] || 'secondary'
}

const getNotificationIcon = (type: string, status: string) => {
  const baseIcon = getChannelIcon('SYSTEM')
  const colorClass = status === 'FAILED' ? 'text-red-500' : status === 'READ' ? 'text-green-500' : 'text-blue-500'
  return `${baseIcon} ${colorClass}`
}

const getNotificationSubtitle = (notification: any) => {
  if (notification.reservation) {
    return `${notification.reservation.room} - ${formatDateTime(notification.reservation.startTime)}`
  }
  return getTypeLabel(notification.type)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.notification-stats {
  max-width: 1200px;
  margin: 0 auto;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .md\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.w-32 {
  width: 8rem;
}

.flex {
  display: flex;
}

.flex-1 {
  flex: 1 1 0%;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.flex-grow {
  flex-grow: 1;
}

.items-center {
  align-items: center;
}

.items-end {
  align-items: flex-end;
}

.justify-between {
  justify-content: space-between;
}

.justify-center {
  justify-content: center;
}

.gap-1 {
  gap: 0.25rem;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.p-2 {
  padding: 0.5rem;
}

.p-3 {
  padding: 0.75rem;
}

.p-4 {
  padding: 1rem;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.h-2 {
  height: 0.5rem;
}

.h-64 {
  height: 16rem;
}

.w-3 {
  width: 0.75rem;
}

.h-3 {
  height: 0.75rem;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.text-4xl {
  font-size: 2.25rem;
  line-height: 2.5rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

.font-bold {
  font-weight: 700;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.rounded-full {
  border-radius: 9999px;
}

.rounded-t {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

.bg-blue-50 {
  background-color: rgb(239 246 255);
}

.bg-blue-500 {
  background-color: rgb(59 130 246);
}

.bg-blue-600 {
  background-color: rgb(37 99 235);
}

.bg-green-50 {
  background-color: rgb(240 253 244);
}

.bg-purple-50 {
  background-color: rgb(250 245 255);
}

.bg-red-50 {
  background-color: rgb(254 242 242);
}

.bg-white {
  background-color: rgb(255 255 255);
}

.bg-gray-50 {
  background-color: rgb(249 250 251);
}

.bg-gray-800 {
  background-color: rgb(31 41 55);
}

.text-blue-600 {
  color: rgb(37 99 235);
}

.text-green-600 {
  color: rgb(34 197 94);
}

.text-purple-600 {
  color: rgb(147 51 234);
}

.text-red-500 {
  color: rgb(239 68 68);
}

.text-red-600 {
  color: rgb(220 38 38);
}

.text-gray-500 {
  color: rgb(107 114 128);
}

.text-gray-600 {
  color: rgb(75 85 99);
}

.text-white {
  color: rgb(255 255 255);
}

.border {
  border-width: 1px;
}

.border-gray-200 {
  border-color: rgb(229 231 235);
}

.hover\:bg-blue-600:hover {
  background-color: rgb(37 99 235);
}

.transition-colors {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.relative {
  position: relative;
}

.group:hover .group-hover\:block {
  display: block;
}

.bottom-full {
  bottom: 100%;
}

.left-1\/2 {
  left: 50%;
}

.transform {
  transform: translateX(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.-translate-x-1\/2 {
  --tw-translate-x: -50%;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.whitespace-nowrap {
  white-space: nowrap;
}

.z-10 {
  z-index: 10;
}

.hidden {
  display: none;
}

.max-h-64 {
  max-height: 16rem;
}

.overflow-y-auto {
  overflow-y: auto;
}
</style>