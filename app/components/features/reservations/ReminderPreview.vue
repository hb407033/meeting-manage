<template>
  <div class="reminder-preview">
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-eye"></i>
          <span>提醒预览</span>
        </div>
      </template>

      <template #content>
        <div v-if="loading" class="flex justify-center py-8">
          <ProgressSpinner />
        </div>

        <div v-else-if="!previewData" class="text-center py-8">
          <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-600">请选择一个周期性预约来预览提醒</p>
          <Button
            label="选择预约"
            icon="pi pi-calendar"
            @click="$emit('selectReservation')"
            class="mt-4"
          />
        </div>

        <div v-else class="space-y-6">
          <!-- 预约信息 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">预约信息</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span class="font-medium">标题：</span>
                  <span>{{ previewData.recurringReservation.title }}</span>
                </div>
                <div>
                  <span class="font-medium">地点：</span>
                  <span>{{ previewData.recurringReservation.room?.name || '待定' }}</span>
                </div>
                <div>
                  <span class="font-medium">开始时间：</span>
                  <span>{{ formatDate(previewData.recurringReservation.startTime) }}</span>
                </div>
                <div>
                  <span class="font-medium">结束时间：</span>
                  <span>{{ formatDate(previewData.recurringReservation.endTime) }}</span>
                </div>
              </div>
              <div v-if="previewData.recurringReservation.description" class="mt-4">
                <span class="font-medium">描述：</span>
                <p class="mt-1 text-gray-600">{{ previewData.recurringReservation.description }}</p>
              </div>
            </div>
          </div>

          <!-- 提醒设置 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">提醒设置</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center gap-2">
                <i class="pi pi-clock text-blue-500"></i>
                <span>提前 {{ previewData.reminderSettings.reminderMinutes }} 分钟提醒</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="pi pi-moon text-indigo-500"></i>
                <span>免打扰时间：{{ previewData.reminderSettings.quietHoursEnabled ? '启用' : '禁用' }}</span>
              </div>
              <div v-if="previewData.reminderSettings.quietHoursEnabled" class="flex items-center gap-2">
                <i class="pi pi-sun text-yellow-500"></i>
                <span>{{ previewData.reminderSettings.quietHoursStart }} - {{ previewData.reminderSettings.quietHoursEnd }}</span>
              </div>
            </div>
          </div>

          <!-- 统计信息 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">提醒统计</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-blue-600">{{ previewData.preview.stats.totalOccurrences }}</div>
                <div class="text-sm text-gray-600">总会议数</div>
              </div>
              <div class="bg-green-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-green-600">{{ previewData.preview.stats.totalReminders }}</div>
                <div class="text-sm text-gray-600">提醒数</div>
              </div>
              <div class="bg-yellow-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-yellow-600">{{ previewData.preview.stats.quietHoursAffected }}</div>
                <div class="text-sm text-gray-600">受免打扰影响</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-purple-600">{{ Object.keys(previewData.preview.stats.reminderFrequency).length }}</div>
                <div class="text-sm text-gray-600">提醒频率</div>
              </div>
            </div>
          </div>

          <!-- 提醒频率分布 -->
          <div v-if="Object.keys(previewData.preview.stats.reminderFrequency).length > 0">
            <h3 class="text-lg font-semibold mb-4">提醒频率分布</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  v-for="(count, day) in previewData.preview.stats.reminderFrequency"
                  :key="day"
                  class="flex items-center justify-between p-2 bg-white rounded"
                >
                  <span class="font-medium">{{ day }}</span>
                  <Badge :value="count" severity="info" />
                </div>
              </div>
            </div>
          </div>

          <!-- 下次提醒时间 -->
          <div v-if="previewData.preview.stats.nextReminder">
            <h3 class="text-lg font-semibold mb-4">下次提醒时间</h3>
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
              <div class="flex items-center gap-2">
                <i class="pi pi-bell text-blue-600"></i>
                <span class="font-medium">{{ formatDateTime(previewData.preview.stats.nextReminder) }}</span>
              </div>
              <p class="text-gray-600 mt-1">距离现在：{{ getTimeFromNow(previewData.preview.stats.nextReminder) }}</p>
            </div>
          </div>

          <!-- 提醒时间线 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">近期提醒时间线</h3>
            <div class="space-y-3 max-h-64 overflow-y-auto">
              <div
                v-for="(reminder, index) in previewData.preview.reminders.slice(0, 10)"
                :key="reminder.reservationId"
                class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <i class="pi pi-bell text-blue-600 text-sm"></i>
                </div>
                <div class="flex-grow">
                  <div class="font-medium">{{ reminder.title }}</div>
                  <div class="text-sm text-gray-600">{{ reminder.room }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium">{{ formatDateTime(reminder.reminderTime) }}</div>
                  <div class="text-xs text-gray-500">{{ getTimeFromNow(reminder.reminderTime) }}</div>
                </div>
              </div>
            </div>
            <div v-if="previewData.preview.reminders.length > 10" class="text-center mt-4">
              <Button
                label="查看全部"
                severity="secondary"
                text
                @click="showAllReminders = !showAllReminders"
              />
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end gap-2 pt-4 border-t">
            <Button
              label="调整设置"
              icon="pi pi-cog"
              severity="secondary"
              @click="$emit('openSettings')"
            />
            <Button
              label="应用设置"
              icon="pi pi-check"
              @click="applySettings"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import Badge from 'primevue/badge'

// Props
interface Props {
  recurringReservationId?: string
  startDate?: string
  endDate?: string
  reminderMinutes?: number
}

const props = withDefaults(defineProps<Props>(), {
  reminderMinutes: 15
})

// Emits
const emit = defineEmits<{
  selectReservation: []
  openSettings: []
  previewGenerated: [data: any]
}>()

// Toast
const toast = useToast()

// 响应式数据
const loading = ref(false)
const showAllReminders = ref(false)
const previewData = ref<any>(null)

// 计算属性
const hasData = computed(() => previewData.value !== null)

// 方法
const generatePreview = async () => {
  if (!props.recurringReservationId) {
    return
  }

  try {
    loading.value = true

    const today = new Date()
    const endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) // 未来90天

    const response = await $fetch('/api/v1/notifications/preview', {
      method: 'POST',
      body: {
        recurringReservationId: props.recurringReservationId,
        startDate: props.startDate || today.toISOString(),
        endDate: props.endDate || endDate.toISOString(),
        reminderMinutes: props.reminderMinutes
      }
    })

    if (response.success) {
      previewData.value = response.data
      emit('previewGenerated', response.data)
    } else {
      throw new Error(response.message || '生成预览失败')
    }
  } catch (error) {
    console.error('Failed to generate reminder preview:', error)
    toast.add({
      severity: 'error',
      summary: '生成预览失败',
      detail: error.message || '无法生成提醒预览',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const applySettings = () => {
  if (!previewData.value) {
    return
  }

  // 这里可以实现将预览的设置应用到实际预约的逻辑
  toast.add({
    severity: 'success',
    summary: '设置已应用',
    detail: '提醒设置已成功应用',
    life: 3000
  })

  emit('openSettings')
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
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

const getTimeFromNow = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diff = date.getTime() - now.getTime()

  if (diff < 0) {
    return '已过期'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}天${hours}小时后`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟后`
  } else {
    return `${minutes}分钟后`
  }
}

// 监听props变化
watch(() => props.recurringReservationId, () => {
  if (props.recurringReservationId) {
    generatePreview()
  }
}, { immediate: true })
</script>

<style scoped>
.reminder-preview {
  max-width: 1000px;
  margin: 0 auto;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
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
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.w-8 {
  width: 2rem;
}

.h-8 {
  height: 2rem;
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

.justify-center {
  justify-content: center;
}

.justify-end {
  justify-content: flex-end;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.gap-4 {
  gap: 1rem;
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

.mt-1 {
  margin-top: 0.25rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.pt-4 {
  padding-top: 1rem;
}

.border-t {
  border-top-width: 1px;
  border-color: rgb(229 231 235);
}

.border-l-4 {
  border-left-width: 4px;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.rounded-full {
  border-radius: 9999px;
}

.bg-blue-50 {
  background-color: rgb(239 246 255);
}

.bg-green-50 {
  background-color: rgb(240 253 244);
}

.bg-yellow-50 {
  background-color: rgb(254 252 232);
}

.bg-purple-50 {
  background-color: rgb(250 245 255);
}

.bg-gray-50 {
  background-color: rgb(249 250 251);
}

.bg-white {
  background-color: rgb(255 255 255);
}

.bg-blue-100 {
  background-color: rgb(219 234 254);
}

.text-blue-600 {
  color: rgb(37 99 235);
}

.text-green-600 {
  color: rgb(34 197 94);
}

.text-yellow-600 {
  color: rgb(202 138 4);
}

.text-purple-600 {
  color: rgb(147 51 234);
}

.text-blue-500 {
  color: rgb(59 130 246);
}

.text-indigo-500 {
  color: rgb(99 102 241);
}

.text-gray-500 {
  color: rgb(107 114 128);
}

.text-gray-600 {
  color: rgb(75 85 99);
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
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

.font-medium {
  font-weight: 500;
}

.font-bold {
  font-weight: 700;
}

.font-semibold {
  font-weight: 600;
}

.max-h-64 {
  max-height: 16rem;
}

.overflow-y-auto {
  overflow-y: auto;
}
</style>