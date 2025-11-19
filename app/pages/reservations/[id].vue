<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRoute, useRouter } from 'vue-router'

// 导入store
import { useReservationStore } from '~/stores/reservations'
import { useAuthStore } from '~/stores/auth'

// 使用store
const reservationStore = useReservationStore()
const authStore = useAuthStore()

// 页面设置
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()

// 获取预约ID
const reservationId = computed(() => route.params.id as string)

// 当前预约
const currentReservation = computed(() => {
  if (!reservationId.value) return null

  // 首先从store中的数据查找
  const reservation = reservationStore.reservations.find(r => r.id === reservationId.value)
  if (reservation) return reservation

  // 如果store中没有，则使用当前预约
  return reservationStore.currentReservation
})

// 加载状态
const loading = computed(() => reservationStore.loading)

// 获取状态显示样式
function getStatusStyle(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return '已确认'
    case 'PENDING':
      return '待确认'
    case 'CANCELLED':
      return '已取消'
    case 'COMPLETED':
      return '已完成'
    default:
      return '未知状态'
  }
}

// 格式化时间
function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
}

function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'HH:mm', { locale: zhCN })
}

// 获取时长
function getDuration(startTime: string | Date, endTime: string | Date): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime
  const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60))
  const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60)) % 60
  if (hours > 0) {
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
  return `${minutes}分钟`
}

// 检查是否可以编辑
const canEdit = computed(() => {
  if (!currentReservation.value || !authStore.user) return false

  // 只有组织者本人可以编辑
  const isOrganizer = currentReservation.value.organizerId === authStore.user.id ||
                     currentReservation.value.organizer?.email === authStore.user.email

  // 只有未开始且未取消的预约可以编辑
  const isUpcoming = new Date(currentReservation.value.startTime) > new Date()
  const isNotCancelled = currentReservation.value.status !== 'CANCELLED'

  return isOrganizer && isUpcoming && isNotCancelled
})

// 检查是否可以取消
const canCancel = computed(() => {
  if (!currentReservation.value || !authStore.user) return false

  // 只有组织者本人可以取消
  const isOrganizer = currentReservation.value.organizerId === authStore.user.id ||
                     currentReservation.value.organizer?.email === authStore.user.email

  // 只有未开始且未取消的预约可以取消
  const isUpcoming = new Date(currentReservation.value.startTime) > new Date()
  const isNotCancelled = currentReservation.value.status !== 'CANCELLED'

  return isOrganizer && isUpcoming && isNotCancelled
})

// 编辑预约
function editReservation() {
  if (!currentReservation.value) return

  // 导航到编辑页面，或者使用编辑模式
  router.push(`/reservations/create?edit=${currentReservation.value.id}`)
}

// 取消预约
async function cancelReservation() {
  if (!currentReservation.value || !canCancel.value) return

  // TODO: 替换为更好的用户确认对话框组件
  if (!window.confirm('确定要取消这个预约吗？此操作不可撤销。')) {
    return
  }

  try {
    // 使用 store 的 deleteReservation 方法
    const success = await reservationStore.deleteReservation(currentReservation.value.id)

    if (success) {
      // TODO: 替换为更好的通知组件
      window.alert('预约已取消')
      router.push('/reservations/my')
    } else {
      window.alert('取消预约失败')
    }
  } catch (error: unknown) {
    console.error('取消预约失败:', error)
    window.alert('取消预约失败，请稍后重试')
  }
}

// 返回列表
function goBack() {
  router.back()
}

// 加载预约详情
async function loadReservationDetail() {
  if (!reservationId.value) return

  try {
    await reservationStore.fetchReservation(reservationId.value)
  } catch (error: unknown) {
    console.error('加载预约详情失败:', error)

    // 如果从API获取失败，尝试从现有数据中查找
    const existingReservation = reservationStore.reservations.find(r => r.id === reservationId.value)
    if (!existingReservation) {
      // TODO: 替换为更好的通知组件
      window.alert('预约不存在或已被删除')
      router.push('/reservations/my')
    }
  }
}

// 生命周期
onMounted(async () => {
  console.warn('✅ Reservation detail page mounted successfully!')
  console.warn(`🔄 加载预约详情: ${reservationId.value}`)

  if (!authStore.user) {
    console.warn('❌ 用户未登录')
    router.push('/auth/login')
    return
  }

  await loadReservationDetail()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <UniversalHeader/>

    <div class="container mx-auto px-4 py-6">
      <!-- 页面标题和操作 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <button
            @click="goBack"
            class="mr-4 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <i class="pi pi-arrow-left"></i>
            返回
          </button>
          <h1 class="text-2xl font-bold text-gray-900">
            预约详情
          </h1>
        </div>

        <div class="flex gap-2" v-if="currentReservation">
          <button
            v-if="canEdit"
            @click="editReservation"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <i class="pi pi-pencil"></i>
            编辑
          </button>
          <button
            v-if="canCancel"
            @click="cancelReservation"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <i class="pi pi-times"></i>
            取消预约
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <i class="pi pi-spinner pi-spin text-4xl text-blue-400 mr-4"></i>
        <p class="text-gray-500">正在加载预约详情...</p>
      </div>

      <!-- 预约不存在 -->
      <div v-else-if="!currentReservation" class="bg-white rounded-lg shadow-sm border p-8 text-center">
        <i class="pi pi-calendar-times text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">预约不存在</h3>
        <p class="text-gray-500 mb-4">该预约可能已被删除或您没有访问权限</p>
        <button
          @click="goBack"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          返回列表
        </button>
      </div>

      <!-- 预约详情 -->
      <div v-else class="bg-white rounded-lg shadow-sm border">
        <!-- 状态条 -->
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">{{ currentReservation.title }}</h2>
            <span :class="[
              'px-3 py-1 text-sm font-medium rounded-full',
              getStatusStyle(currentReservation.status)
            ]">
              {{ getStatusText(currentReservation.status) }}
            </span>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 左侧：基础信息 -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">基础信息</h3>

              <div class="space-y-3">
                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">会议室:</span>
                  <span class="text-sm text-gray-900">
                    {{ currentReservation.room?.name || currentReservation.roomName || '未知' }}
                    <span v-if="currentReservation.room?.location" class="text-gray-500">
                      ({{ currentReservation.room.location }})
                    </span>
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">组织者:</span>
                  <span class="text-sm text-gray-900">
                    {{ currentReservation.organizer?.name || currentReservation.organizerName || '未知' }}
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">参与人数:</span>
                  <span class="text-sm text-gray-900">
                    {{ currentReservation.attendeeCount || 0 }}人
                  </span>
                </div>

                <div v-if="currentReservation.description" class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">描述:</span>
                  <span class="text-sm text-gray-900">{{ currentReservation.description }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：时间信息 -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">时间信息</h3>

              <div class="space-y-3">
                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">日期:</span>
                  <span class="text-sm text-gray-900">{{ formatDateTime(currentReservation.startTime) }}</span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">时间:</span>
                  <span class="text-sm text-gray-900">
                    {{ formatTime(currentReservation.startTime) }} - {{ formatTime(currentReservation.endTime) }}
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">时长:</span>
                  <span class="text-sm text-gray-900">
                    {{ getDuration(currentReservation.startTime, currentReservation.endTime) }}
                  </span>
                </div>

                <div class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">创建时间:</span>
                  <span class="text-sm text-gray-900">{{ formatDateTime(currentReservation.createdAt) }}</span>
                </div>

                <div v-if="currentReservation.canceledAt" class="flex items-start">
                  <span class="text-sm font-medium text-gray-500 w-24">取消时间:</span>
                  <span class="text-sm text-gray-900">{{ formatDateTime(currentReservation.canceledAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 参与人员信息 -->
          <div v-if="currentReservation.attendees && currentReservation.attendees.length > 0" class="mt-6 pt-6 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">参与人员</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="(attendee, index) in currentReservation.attendees"
                :key="index"
                class="flex items-center p-3 bg-gray-50 rounded-lg"
              >
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span class="text-xs font-medium text-blue-600">
                    {{ attendee.name.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ attendee.name }}</div>
                  <div v-if="attendee.email" class="text-xs text-gray-500">{{ attendee.email }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>