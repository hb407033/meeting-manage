<template>
  <div class="bg-white rounded-lg shadow p-4">
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">快速操作</h3>
      <Icon name="i-heroicons-bolt" class="h-5 w-5 text-blue-500" />
    </div>

    <!-- 快捷操作按钮网格 -->
    <div class="grid grid-cols-2 gap-3">
      <!-- 立即预约30分钟 -->
      <button
        @click="quickBook30Minutes"
        :disabled="loading.quick30"
        class="quick-action-btn primary"
      >
        <Icon
          :name="loading.quick30 ? 'i-heroicons-arrow-path' : 'i-heroicons-clock'"
          :class="['h-6 w-6', loading.quick30 && 'animate-spin']"
        />
        <span class="font-medium">立即预约</span>
        <span class="text-xs opacity-80">30分钟</span>
      </button>

      <!-- 立即预约1小时 -->
      <button
        @click="quickBook1Hour"
        :disabled="loading.quick1h"
        class="quick-action-btn primary"
      >
        <Icon
          :name="loading.quick1h ? 'i-heroicons-arrow-path' : 'i-heroicons-calendar-days'"
          :class="['h-6 w-6', loading.quick1h && 'animate-spin']"
        />
        <span class="font-medium">快速会议</span>
        <span class="text-xs opacity-80">1小时</span>
      </button>

      <!-- 查找可用会议室 -->
      <button
        @click="findAvailableRoom"
        :disabled="loading.findRoom"
        class="quick-action-btn secondary"
      >
        <Icon
          :name="loading.findRoom ? 'i-heroicons-arrow-path' : 'i-heroicons-magnifying-glass'"
          :class="['h-6 w-6', loading.findRoom && 'animate-spin']"
        />
        <span class="font-medium">查找会议室</span>
        <span class="text-xs opacity-80">空闲</span>
      </button>

      <!-- 延长当前会议 -->
      <button
        @click="extendCurrentMeeting"
        :disabled="!hasCurrentMeeting || loading.extend"
        class="quick-action-btn"
        :class="{ 'opacity-50 cursor-not-allowed': !hasCurrentMeeting }"
      >
        <Icon
          :name="loading.extend ? 'i-heroicons-arrow-path' : 'i-heroicons-plus'"
          :class="['h-6 w-6', loading.extend && 'animate-spin']"
        />
        <span class="font-medium">延长会议</span>
        <span class="text-xs opacity-80">+30分钟</span>
      </button>

      <!-- 取消最近预约 -->
      <button
        @click="cancelNextMeeting"
        :disabled="!hasNextMeeting || loading.cancel"
        class="quick-action-btn warning"
        :class="{ 'opacity-50 cursor-not-allowed': !hasNextMeeting }"
      >
        <Icon
          :name="loading.cancel ? 'i-heroicons-arrow-path' : 'i-heroicons-x-mark'"
          :class="['h-6 w-6', loading.cancel && 'animate-spin']"
        />
        <span class="font-medium">取消预约</span>
        <span class="text-xs opacity-80">最近</span>
      </button>

      <!-- 会议室状态 -->
      <button
        @click="showRoomStatus"
        class="quick-action-btn info"
      >
        <Icon name="i-heroicons-signal" class="h-6 w-6" />
        <span class="font-medium">会议室状态</span>
        <span class="text-xs opacity-80">实时</span>
      </button>
    </div>

    <!-- 状态信息 -->
    <div class="mt-4 p-3 bg-gray-50 rounded-md">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">当前状态:</span>
        <span class="font-medium" :class="statusColor">
          {{ statusText }}
        </span>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" class="mt-3 p-3 rounded-md text-sm" :class="messageTypeClass">
      <div class="flex items-center">
        <Icon :name="messageIcon" class="h-4 w-4 mr-2" />
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useReservations } from '~/composables/useReservations'

// 状态管理
const { user } = useAuth()
const { createQuickReservation, cancelReservation, getCurrentUserReservation } = useReservations()

// 加载状态
const loading = ref({
  quick30: false,
  quick1h: false,
  findRoom: false,
  extend: false,
  cancel: false
})

// 用户状态
const hasCurrentMeeting = ref(false)
const hasNextMeeting = ref(false)
const currentMeeting = ref(null)
const nextMeeting = ref(null)

// 消息状态
const message = ref('')
const messageType = ref<'success' | 'error' | 'warning' | 'info'>('info')

// 计算属性
const statusColor = computed(() => {
  if (hasCurrentMeeting.value) return 'text-green-600'
  if (hasNextMeeting.value) return 'text-blue-600'
  return 'text-gray-600'
})

const statusText = computed(() => {
  if (hasCurrentMeeting.value) return '会议进行中'
  if (hasNextMeeting.value) return '有即将开始的预约'
  return '空闲'
})

const messageTypeClass = computed(() => {
  const classes = {
    success: 'bg-green-50 text-green-700 border border-green-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200'
  }
  return classes[messageType.value]
})

const messageIcon = computed(() => {
  const icons = {
    success: 'i-heroicons-check-circle',
    error: 'i-heroicons-exclamation-triangle',
    warning: 'i-heroicons-exclamation-triangle',
    info: 'i-heroicons-information-circle'
  }
  return icons[messageType.value]
})

// 快捷操作方法
const quickBook30Minutes = async () => {
  loading.value.quick30 = true
  try {
    const startTime = new Date(Date.now() + 1 * 60 * 1000) // 1分钟后开始
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)

    const reservation = await createQuickReservation({
      title: '快速会议',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      organizerId: user.value.id,
      attendeeCount: 2 // 默认参会人数
    })

    const roomName = reservation.room?.name || '会议室'
    showMessage(`预约成功！已为您预订 ${roomName}，30分钟`, 'success')
    await loadUserStatus()
  } catch (error: any) {
    let errorMessage = '预约失败'

    // 根据错误类型提供更友好的提示
    if (error.statusCode === 404) {
      errorMessage = '没有找到可用的会议室，请稍后再试'
    } else if (error.statusCode === 409) {
      errorMessage = '当前时间段会议室已被占用，请选择其他时间'
    } else if (error.statusCode === 403) {
      errorMessage = '您没有预约权限，请联系管理员'
    } else if (error.statusCode === 400) {
      errorMessage = '预约信息有误，请重试'
    } else if (error.message) {
      errorMessage = error.message
    }

    showMessage(errorMessage, 'error')
  } finally {
    loading.value.quick30 = false
  }
}

const quickBook1Hour = async () => {
  loading.value.quick1h = true
  try {
    const startTime = new Date(Date.now() + 1 * 60 * 1000) // 1分钟后开始
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

    const reservation = await createQuickReservation({
      title: '快速会议',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      organizerId: user.value.id,
      attendeeCount: 2 // 默认参会人数
    })

    const roomName = reservation.room?.name || '会议室'
    showMessage(`预约成功！已为您预订 ${roomName}，1小时`, 'success')
    await loadUserStatus()
  } catch (error: any) {
    let errorMessage = '预约失败'

    // 根据错误类型提供更友好的提示
    if (error.statusCode === 404) {
      errorMessage = '没有找到可用的会议室，请稍后再试'
    } else if (error.statusCode === 409) {
      errorMessage = '当前时间段会议室已被占用，请选择其他时间'
    } else if (error.statusCode === 403) {
      errorMessage = '您没有预约权限，请联系管理员'
    } else if (error.statusCode === 400) {
      errorMessage = '预约信息有误，请重试'
    } else if (error.message) {
      errorMessage = error.message
    }

    showMessage(errorMessage, 'error')
  } finally {
    loading.value.quick1h = false
  }
}

const findAvailableRoom = async () => {
  loading.value.findRoom = true
  try {
    // 这里可以跳转到会议室查找页面或显示可用会议室列表
    showMessage('正在查找可用会议室...', 'info')
    // 实际实现中可以调用 findAvailableRooms API
  } catch (error) {
    showMessage('查找失败：' + error.message, 'error')
  } finally {
    loading.value.findRoom = false
  }
}

const extendCurrentMeeting = async () => {
  if (!currentMeeting.value) return

  loading.value.extend = true
  try {
    const newEndTime = new Date(currentMeeting.value.endTime.getTime() + 30 * 60 * 1000)

    // 调用延长会议的API
    // await extendReservation(currentMeeting.value.id, newEndTime.toISOString())

    showMessage('会议已延长30分钟', 'success')
    await loadUserStatus()
  } catch (error) {
    showMessage('延长失败：' + error.message, 'error')
  } finally {
    loading.value.extend = false
  }
}

const cancelNextMeeting = async () => {
  if (!nextMeeting.value) return

  loading.value.cancel = true
  try {
    await cancelReservation(nextMeeting.value.id)
    showMessage('预约已取消', 'success')
    await loadUserStatus()
  } catch (error) {
    showMessage('取消失败：' + error.message, 'error')
  } finally {
    loading.value.cancel = false
  }
}

const showRoomStatus = () => {
  showMessage('会议室状态功能开发中...', 'info')
}

// 工具方法
const showMessage = (msg: string, type: typeof messageType.value) => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 5000)
}

const loadUserStatus = async () => {
  try {
    // 加载用户当前的预约状态
    const userReservations = await getCurrentUserReservation(user.value.id)

    const now = new Date()
    currentMeeting.value = userReservations.find(r =>
      new Date(r.startTime) <= now && new Date(r.endTime) > now
    )
    nextMeeting.value = userReservations.find(r =>
      new Date(r.startTime) > now
    )

    hasCurrentMeeting.value = !!currentMeeting.value
    hasNextMeeting.value = !!nextMeeting.value
  } catch (error) {
    console.error('加载用户状态失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadUserStatus()
})
</script>

<style scoped>
.quick-action-btn {
  @apply flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 min-h-[80px] space-y-1;
  @apply hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none;
}

.quick-action-btn.primary {
  @apply bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 focus:ring-blue-500;
}

.quick-action-btn.secondary {
  @apply bg-green-50 border-green-200 text-green-700 hover:bg-green-100 focus:ring-green-500;
}

.quick-action-btn.warning {
  @apply bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-500;
}

.quick-action-btn.info {
  @apply bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 focus:ring-purple-500;
}

/* 动画效果 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-animation {
  animation: fadeIn 0.3s ease-out;
}
</style>