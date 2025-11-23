<template>
  <div class="bg-white rounded-lg shadow">
    <!-- 列表头部 -->
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">我的预约</h2>
        <div class="flex items-center space-x-2">
          <!-- 状态过滤器 -->
          <select
            v-model="selectedStatus"
            class="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部状态</option>
            <option value="PENDING">待确认</option>
            <option value="CONFIRMED">已确认</option>
            <option value="IN_PROGRESS">进行中</option>
          </select>

          <!-- 刷新按钮 -->
          <button
            @click="refreshReservations"
            :disabled="loading"
            class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="刷新列表"
          >
            <Icon
              name="i-heroicons-arrow-path"
              :class="{ 'animate-spin': loading }"
              class="h-5 w-5"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- 预约列表 -->
    <div class="divide-y divide-gray-200">
      <!-- 加载状态 -->
      <div v-if="loading" class="px-6 py-8">
        <div class="flex items-center justify-center">
          <Icon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-gray-400" />
          <span class="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredReservations.length === 0" class="px-6 py-8">
        <div class="text-center">
          <Icon name="i-heroicons-calendar-days" class="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <h3 class="text-lg font-medium text-gray-900 mb-1">暂无预约记录</h3>
          <p class="text-gray-600 mb-4">您还没有任何会议室预约</p>
          <NuxtLink
            to="/reservations/create"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Icon name="i-heroicons-plus" class="h-4 w-4 mr-2" />
            创建预约
          </NuxtLink>
        </div>
      </div>

      <!-- 预约列表项 -->
      <div v-else>
        <div
          v-for="reservation in filteredReservations"
          :key="reservation.id"
          class="px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <!-- 左侧：预约信息 -->
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <!-- 状态指示器 -->
                <div class="flex-shrink-0">
                  <span
                    class="inline-flex h-2 w-2 rounded-full"
                    :class="statusIndicatorClass(reservation.status)"
                  ></span>
                </div>

                <!-- 预约主题 -->
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-medium text-gray-900 truncate">
                    {{ reservation.title }}
                  </h3>
                  <div class="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span class="flex items-center">
                      <Icon name="i-heroicons-clock" class="h-4 w-4 mr-1" />
                      {{ formatTime(reservation.startTime) }} - {{ formatTime(reservation.endTime) }}
                    </span>
                    <span class="flex items-center">
                      <Icon name="i-heroicons-calendar" class="h-4 w-4 mr-1" />
                      {{ formatDate(reservation.startTime) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：操作按钮 -->
            <div class="flex items-center space-x-2 ml-4">
              <!-- 状态标签 -->
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="statusBadgeClass(reservation.status)"
              >
                {{ statusText(reservation.status) }}
              </span>

              <!-- 操作菜单 -->
              <div class="relative">
                <button
                  @click="toggleActions(reservation.id)"
                  class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="更多操作"
                >
                  <Icon name="i-heroicons-ellipsis-vertical" class="h-5 w-5" />
                </button>

                <!-- 下拉菜单 -->
                <div
                  v-if="activeActionsMenu === reservation.id"
                  v-click-outside="closeActions"
                  class="absolute right-0 z-10 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <div class="py-1">
                    <button
                      @click="viewDetails(reservation)"
                      class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Icon name="i-heroicons-eye" class="h-4 w-4 mr-3" />
                      查看详情
                    </button>

                    <button
                      v-if="canEditReservation(reservation)"
                      @click="editReservation(reservation)"
                      class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Icon name="i-heroicons-pencil" class="h-4 w-4 mr-3" />
                      修改预约
                    </button>

                    <button
                      v-if="canCancelReservation(reservation)"
                      @click="cancelReservation(reservation)"
                      class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Icon name="i-heroicons-trash" class="h-4 w-4 mr-3" />
                      取消预约
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 会议室信息 -->
          <div class="mt-3 flex items-center space-x-4 text-sm text-gray-500">
            <span class="flex items-center">
              <Icon name="i-heroicons-building-office-2" class="h-4 w-4 mr-1" />
              {{ reservation.room?.name || '未指定会议室' }}
            </span>
            <span class="flex items-center">
              <Icon name="i-heroicons-users" class="h-4 w-4 mr-1" />
              {{ reservation.attendeeCount }}人
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700">
          显示 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, totalCount  ) }}
          共 {{ totalCount }} 条记录
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            上一页
          </button>
          <span class="px-3 py-1 text-sm text-gray-700">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useReservationStore } from '~/stores/reservations'
import type { Reservation } from '~/stores/reservations'

// 组件属性
interface Props {
  pageSize?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 10,
  autoRefresh: true,
  refreshInterval: 30000 // 30秒刷新一次
})

// 组件事件
interface Emits {
  reservationSelected: [reservation: Reservation]
  reservationCancelled: [reservationId: string]
}

const emit = defineEmits<Emits>()

// Store 和响应式数据
const router = useRouter()
const { canAccess } = useAuth()
const reservationStore = useReservationStore()

const selectedStatus = ref('')
const currentPage = ref(1)
const activeActionsMenu = ref<string | null>(null)

let refreshTimer: NodeJS.Timeout | null = null

// 使用 store 的状态
const reservations = computed(() => reservationStore.reservations)
const loading = computed(() => reservationStore.loading)
const error = computed(() => reservationStore.error ? new Error(reservationStore.error) : null)
const totalCount = computed(() => reservationStore.pagination.total)
const totalPages = computed(() => reservationStore.pagination.totalPages)

// 计算属性
const filteredReservations = computed(() => {
  let filtered = reservations.value

  if (selectedStatus.value) {
    filtered = filtered.filter(r => r.status === selectedStatus.value)
  }

  return filtered
})

// 方法
const fetchReservations = async () => {
  try {
    await reservationStore.fetchMyReservations({
      page: currentPage.value,
      limit: props.pageSize,
      status: selectedStatus.value || undefined
    })
  } catch (err) {
    console.error('获取预约列表失败:', err)
  }
}

const refreshReservations = async () => {
  await fetchReservations()
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchReservations()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchReservations()
  }
}

const toggleActions = (reservationId: string) => {
  activeActionsMenu.value = activeActionsMenu.value === reservationId ? null : reservationId
}

const closeActions = () => {
  activeActionsMenu.value = null
}

const viewDetails = (reservation: Reservation) => {
  emit('reservationSelected', reservation)
  router.push(`/reservations/${reservation.id}`)
}

const editReservation = (reservation: Reservation) => {
  router.push(`/reservations/${reservation.id}/edit`)
}

const cancelReservation = async (reservation: Reservation) => {
  if (!confirm('确定要取消这个预约吗？')) return

  try {
    await reservationStore.deleteReservation(reservation.id)
    emit('reservationCancelled', reservation.id)
  } catch (err) {
    console.error('取消预约失败:', err)
    alert('取消预约失败，请稍后重试')
  }
}

// 状态相关方法
const statusText = (status: string) => {
  const statusMap = {
    'PENDING': '待确认',
    'CONFIRMED': '已确认',
    'IN_PROGRESS': '进行中',
    'COMPLETED': '已完成',
    'CANCELLED': '已取消'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const statusIndicatorClass = (status: string) => {
  const classMap = {
    'PENDING': 'bg-yellow-400',
    'CONFIRMED': 'bg-green-400',
    'IN_PROGRESS': 'bg-blue-400',
    'COMPLETED': 'bg-gray-400',
    'CANCELLED': 'bg-red-400'
  }
  return classMap[status as keyof typeof classMap] || 'bg-gray-400'
}

const statusBadgeClass = (status: string) => {
  const classMap = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'CONFIRMED': 'bg-green-100 text-green-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-gray-100 text-gray-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  }
  return classMap[status as keyof typeof classMap] || 'bg-gray-100 text-gray-800'
}

// 权限检查
const canEditReservation = (reservation: Reservation) => {
  return canAccess('reservation', 'update') &&
         ['PENDING', 'CONFIRMED'].includes(reservation.status)
}

const canCancelReservation = (reservation: Reservation) => {
  return canAccess('reservation', 'delete') &&
         ['PENDING', 'CONFIRMED'].includes(reservation.status)
}

// 时间格式化
const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

// 定时刷新
const startRefreshTimer = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer = setInterval(refreshReservations, props.refreshInterval)
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
  fetchReservations()
  startRefreshTimer()
})

onUnmounted(() => {
  stopRefreshTimer()
})

// 监听状态过滤变化
watch(selectedStatus, () => {
  currentPage.value = 1
  fetchReservations()
})
</script>

<style scoped>
/* 状态指示器动画 */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 下拉菜单动画 */
.absolute {
  transition: all 0.2s ease-in-out;
}
</style>