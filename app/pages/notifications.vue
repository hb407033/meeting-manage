<template>
  <div class="notifications-page">
    <div class="container mx-auto px-4 py-8">
      <!-- 页面头部 -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">通知中心</h1>
          <p class="text-gray-600 mt-2">管理您的通知偏好和提醒设置</p>
        </div>
        <div class="flex items-center gap-4">
          <Badge :value="unreadCount" severity="danger">
            <Button
              label="刷新"
              icon="pi pi-refresh"
              severity="secondary"
              @click="refreshAll"
              :loading="loading"
            />
          </Badge>
        </div>
      </div>

      <!-- 通知列表 -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span>通知列表 ({{ notifications.length }})</span>
            <span v-if="unreadCount > 0" class="text-sm text-blue-600">
              {{ unreadCount }} 条未读
            </span>
          </div>
        </template>
        <template #content>
          <div v-if="loading" class="flex justify-center py-8">
            <ProgressSpinner />
          </div>
          <div v-else-if="notifications.length === 0" class="text-center py-8">
            <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
            <p class="text-gray-600">暂无通知</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              :class="[
                'flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors',
                notification.readAt
                  ? 'bg-white border-gray-200 hover:bg-gray-50'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              ]"
              @click="handleNotificationClick(notification)"
            >
              <div class="flex-shrink-0 mt-1">
                <i :class="getNotificationIcon(notification.type, notification.status)" class="text-xl"></i>
              </div>
              <div class="flex-grow">
                <div class="flex items-start justify-between">
                  <div class="flex-grow">
                    <h3 class="font-semibold text-gray-900">{{ notification.title }}</h3>
                    <p class="text-gray-600 mt-1">{{ notification.content }}</p>
                    <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{{ getNotificationTypeLabel(notification.type) }}</span>
                      <span>{{ formatNotificationTime(notification.createdAt) }}</span>
                      <Badge
                        :value="getStatusLabel(notification.status)"
                        :severity="getStatusSeverity(notification.status)"
                      />
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <Button
                      v-if="!notification.readAt"
                      icon="pi pi-check"
                      severity="secondary"
                      text
                      size="small"
                      @click.stop="markAsRead(notification.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import Card from 'primevue/card'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

// Composables
const {
  loading,
  notifications,
  unreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  refreshNotifications,
  refreshPreferences,
  formatNotificationTime,
  getNotificationIcon,
  getNotificationTypeLabel
} = useNotifications()

// 方法
const handleNotificationClick = async (notification: any) => {
  if (!notification.readAt) {
    await markAsRead(notification.id)
  }
  // 这里可以显示通知详情或其他操作
}

const refreshAll = async () => {
  try {
    await Promise.all([
      refreshNotifications(),
      refreshPreferences()
    ])
    console.log('刷新成功：通知数据已更新')
  } catch (error) {
    console.error('Failed to refresh:', error)
    console.error('刷新失败：无法更新通知数据')
  }
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

// 生命周期
onMounted(async () => {
  await fetchNotifications()
})
</script>

<style scoped>
.notifications-page {
  min-height: 100vh;
  background-color: rgb(249 250 251);
}

.container {
  max-width: 1200px;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.flex {
  display: flex;
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

.items-start {
  align-items: flex-start;
}

.justify-between {
  justify-content: space-between;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.cursor-pointer {
  cursor: pointer;
}

.transition-colors {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.hover\:bg-gray-50:hover {
  background-color: rgb(249 250 251);
}

.hover\:bg-blue-100:hover {
  background-color: rgb(219 234 254);
}

.text-3xl {
  font-size: 1.875rem;
  line-height: 2.25rem;
}

.text-xl {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-bold {
  font-weight: 700;
}

.font-semibold {
  font-weight: 600;
}

.text-gray-900 {
  color: rgb(17 24 39);
}

.text-gray-600 {
  color: rgb(75 85 99);
}

.text-gray-500 {
  color: rgb(107 114 128);
}

.text-blue-600 {
  color: rgb(37 99 235);
}

.bg-white {
  background-color: rgb(255 255 255);
}

.bg-blue-50 {
  background-color: rgb(239 246 255);
}

.bg-gray-50 {
  background-color: rgb(249 250 251);
}

.border {
  border-width: 1px;
}

.border-gray-200 {
  border-color: rgb(229 231 235);
}

.border-blue-200 {
  border-color: rgb(191 219 254);
}

.rounded-lg {
  border-radius: 0.5rem;
}

.p-4 {
  padding: 1rem;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-8 {
  margin-bottom: 2rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.max-w-1200 {
  max-width: 1200px;
}

.min-h-screen {
  min-height: 100vh;
}
</style>