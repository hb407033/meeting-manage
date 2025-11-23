<template>
  <div class="bg-white rounded-lg shadow">
    <!-- 对话框头部 -->
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">快捷预约</h2>
        <button
          @click="showDialog = false"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon name="i-heroicons-x-mark" class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- 快捷表单 -->
    <div class="p-6">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 会议主题 -->
        <div>
          <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
            会议主题 <span class="text-red-500">*</span>
          </label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入会议主题"
          />
        </div>

        <!-- 时间选择 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 开始时间 -->
          <div>
            <label for="startTime" class="block text-sm font-medium text-gray-700 mb-1">
              开始时间 <span class="text-red-500">*</span>
            </label>
            <input
              id="startTime"
              v-model="form.startTime"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <!-- 结束时间 -->
          <div>
            <label for="endTime" class="block text-sm font-medium text-gray-700 mb-1">
              结束时间 <span class="text-red-500">*</span>
            </label>
            <input
              id="endTime"
              v-model="form.endTime"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- 会议室选择 -->
        <div>
          <label for="roomId" class="block text-sm font-medium text-gray-700 mb-1">
            会议室 <span class="text-red-500">*</span>
          </label>
          <select
            id="roomId"
            v-model="form.roomId"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">请选择会议室</option>
            <option
              v-for="room in availableRooms"
              :key="room.id"
              :value="room.id"
            >
              {{ room.name }} (容量: {{ room.capacity }}人)
            </option>
          </select>
        </div>

        <!-- 参会人数 -->
        <div>
          <label for="attendeeCount" class="block text-sm font-medium text-gray-700 mb-1">
            参会人数 <span class="text-red-500">*</span>
          </label>
          <input
            id="attendeeCount"
            v-model.number="form.attendeeCount"
            type="number"
            min="1"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入参会人数"
          />
        </div>

        <!-- 可用性检查结果 -->
        <div v-if="availabilityStatus" class="rounded-md p-4" :class="availabilityStatusClass">
          <div class="flex">
            <div class="flex-shrink-0">
              <Icon
                :name="availabilityStatus.icon"
                :class="availabilityStatus.iconClass"
                class="h-5 w-5"
              />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium" :class="availabilityStatus.titleClass">
                {{ availabilityStatus.title }}
              </h3>
              <div class="mt-2 text-sm" :class="availabilityStatus.messageClass">
                {{ availabilityStatus.message }}
              </div>
            </div>
          </div>
        </div>

        <!-- 按钮组 -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            @click="showDialog = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="submitting || !canSubmit"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icon
              v-if="submitting"
              name="i-heroicons-arrow-path"
              class="animate-spin h-4 w-4 mr-2"
            />
            {{ submitting ? '提交中...' : '创建预约' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- 浮动按钮触发器 -->
  <button
    v-if="!showDialog"
    @click="showDialog = true"
    class="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    title="快速预约"
  >
    <Icon name="i-heroicons-plus" class="h-6 w-6" />
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'

// 组件属性
interface Props {
  defaultDuration?: number // 默认预约时长（分钟）
}

const props = withDefaults(defineProps<Props>(), {
  defaultDuration: 60
})

// 组件事件
interface Emits {
  reservationCreated: [reservation: any]
  error: [error: Error]
}

const emit = defineEmits<Emits>()

// 响应式数据
const { canAccess } = useAuth()

const showDialog = ref(false)
const submitting = ref(false)
const availableRooms = ref<any[]>([])
const availabilityStatus = ref<any>(null)

// 表单数据
const form = ref({
  title: '',
  startTime: '',
  endTime: '',
  roomId: '',
  attendeeCount: 1
})

// 计算属性
const canSubmit = computed(() => {
  return form.value.title &&
         form.value.startTime &&
         form.value.endTime &&
         form.value.roomId &&
         form.value.attendeeCount > 0 &&
         !availabilityStatus.value?.hasConflict
})

const availabilityStatusClass = computed(() => {
  if (!availabilityStatus.value) return ''
  return availabilityStatus.value.hasConflict
    ? 'bg-red-50 border-red-200'
    : 'bg-green-50 border-green-200'
})

// 权限检查
const canCreateReservation = computed(() => {
  return canAccess('reservation', 'create')
})

// 方法
const loadAvailableRooms = async () => {
  try {
    const { useRoomsStore } = await import('~/stores/rooms')
    const roomsStore = useRoomsStore()

    const response = await roomsStore.fetchRooms({ page: 1, limit: 100, status: 'AVAILABLE' })
    availableRooms.value = response || []
  } catch (err) {
    console.error('加载会议室列表失败:', err)
  }
}

const checkAvailability = async () => {
  if (!form.value.startTime || !form.value.endTime || !form.value.roomId) {
    availabilityStatus.value = null
    return
  }

  try {
    const { useReservationStore } = await import('~/stores/reservations')
    const reservationsStore = useReservationStore()

    const response = await reservationsStore.checkAvailability({
      roomId: form.value.roomId,
      startTime: form.value.startTime,
      endTime: form.value.endTime
    })

    if (response.isAvailable) {
      availabilityStatus.value = {
        hasConflict: false,
        icon: 'i-heroicons-check-circle',
        iconClass: 'text-green-400',
        title: '会议室可用',
        titleClass: 'text-green-800',
        message: '选定时间段内会议室可用，可以创建预约',
        messageClass: 'text-green-700'
      }
    } else {
      availabilityStatus.value = {
        hasConflict: true,
        icon: 'i-heroicons-x-circle',
        iconClass: 'text-red-400',
        title: '时间冲突',
        titleClass: 'text-red-800',
        message: response.conflictReason || '该时间段已被其他预约占用',
        messageClass: 'text-red-700'
      }
    }
  } catch (err) {
    console.error('检查可用性失败:', err)
    availabilityStatus.value = {
      hasConflict: true,
      icon: 'i-heroicons-exclamation-triangle',
      iconClass: 'text-yellow-400',
      title: '检查失败',
      titleClass: 'text-yellow-800',
      message: '无法检查会议室可用性，请稍后重试',
      messageClass: 'text-yellow-700'
    }
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value || !canCreateReservation.value) return

  try {
    submitting.value = true

    const reservationData = {
      title: form.value.title,
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      roomId: form.value.roomId,
      attendeeCount: form.value.attendeeCount,
      type: 'QUICK' // 标记为快捷预约
    }

    const { useReservationStore } = await import('~/stores/reservations')
    const reservationsStore = useReservationStore()

    const response = await reservationsStore.createQuickReservation(reservationData)

    emit('reservationCreated', response)

    // 重置表单并关闭对话框
    resetForm()
    showDialog.value = false

    // 显示成功提示
    alert('预约创建成功！')
  } catch (err) {
    console.error('创建预约失败:', err)
    emit('error', err as Error)
    alert('创建预约失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.value = {
    title: '',
    startTime: '',
    endTime: '',
    roomId: '',
    attendeeCount: 1
  }
  availabilityStatus.value = null
}

const setDefaultTimes = () => {
  const now = new Date()
  const startTime = new Date(now.getTime() + 30 * 60 * 1000) // 30分钟后
  const endTime = new Date(startTime.getTime() + props.defaultDuration * 60 * 1000) // 默认时长后

  // 格式化为 datetime-local 输入格式
  form.value.startTime = startTime.toISOString().slice(0, 16)
  form.value.endTime = endTime.toISOString().slice(0, 16)
}

// 监听时间变化，自动检查可用性
watch([() => form.value.startTime, () => form.value.endTime, () => form.value.roomId], () => {
  if (form.value.startTime && form.value.endTime && form.value.roomId) {
    checkAvailability()
  }
}, { debounce: 500 })

// 监听对话框打开
watch(showDialog, (isOpen) => {
  if (isOpen) {
    setDefaultTimes()
    loadAvailableRooms()
  } else {
    resetForm()
  }
})

// 生命周期
onMounted(() => {
  if (!canCreateReservation.value) {
    console.warn('用户没有创建预约的权限')
  }
})
</script>

<style scoped>
/* 固定按钮动画 */
.fixed:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease-in-out;
}

/* 表单输入框焦点效果 */
input:focus,
select:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 加载动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>