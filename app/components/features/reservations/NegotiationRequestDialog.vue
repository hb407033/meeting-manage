<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { format, addDays, addHours } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ConflictReservation {
  id: string
  title: string
  startTime: Date
  endTime: Date
  organizerName: string
  organizerId: string
  attendeeCount: number
  roomName: string
}

interface NegotiationTemplate {
  id: string
  title: string
  message: string
  type: 'time_adjustment' | 'room_change' | 'equipment_addition' | 'custom'
}

interface Props {
  visible: boolean
  conflictReservation: ConflictReservation | null
  currentReservation: {
    id?: string
    title: string
    startTime: Date
    endTime: Date
    attendeeCount: number
    organizerId: string
  }
  loading?: boolean
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'send', data: {
    targetUserId: string
    title: string
    message: string
    proposedChanges: any
    deadline: Date
  }): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// 内部状态
const selectedTemplate = ref<string>('')
const customTitle = ref('')
const customMessage = ref('')
const negotiationType = ref<'time_adjustment' | 'room_change' | 'equipment_addition' | 'custom'>('time_adjustment')
const proposedStartTime = ref<Date>(new Date())
const proposedEndTime = ref<Date>(new Date())
const deadlineDays = ref(3)
const includeAlternativeRooms = ref(false)
const includeTimeSuggestions = ref(true)

// 预定义协商模板
const negotiationTemplates: NegotiationTemplate[] = [
  {
    id: 'time_adjust_polite',
    title: '协商时间调整',
    message: '您好，我预约了一个会议，时间与您的预约有冲突。不知是否可以调整您的会议时间？我们可以找一个双方都方便的时间。谢谢！',
    type: 'time_adjustment'
  },
  {
    id: 'time_adjust_urgent',
    title: '紧急时间调整请求',
    message: '您好！我有一个重要的紧急会议需要使用会议室，与您的预约时间冲突。请问是否可以协商调整时间？我将非常感谢您的理解和配合！',
    type: 'time_adjustment'
  },
  {
    id: 'room_change',
    title: '会议室更换协商',
    message: '您好，我注意到我们在同一时间需要使用相同的会议室。如果您不介意的话，我可以为您安排一个同样配置的替代会议室。请告诉我您的想法。',
    type: 'room_change'
  },
  {
    id: 'custom_proposal',
    title: '自定义协商方案',
    message: '您好，关于我们的预约时间冲突，我想和您商讨一个双方都满意的解决方案。期待您的回复！',
    type: 'custom'
  }
]

// 计算属性
const selectedTemplateData = computed(() => {
  return negotiationTemplates.find(t => t.id === selectedTemplate.value)
})

const deadlineDate = computed(() => {
  return addDays(new Date(), deadlineDays.value)
})

const meetingDuration = computed(() => {
  const minutes = props.currentReservation.endTime.getTime() - props.currentReservation.startTime.getTime()
  return minutes / (1000 * 60)
})

// 方法
function handleTemplateSelect(templateId: string): void {
  selectedTemplate.value = templateId
  const template = selectedTemplateData.value
  if (template) {
    customTitle.value = template.title
    customMessage.value = template.message
    negotiationType.value = template.type

    // 为时间调整类型自动设置建议时间
    if (template.type === 'time_adjustment') {
      suggestedTimeAdjustment()
    }
  }
}

function suggestedTimeAdjustment(): void {
  // 自动建议一个时间段（当前时间前后1小时）
  const currentStart = new Date(props.currentReservation.startTime)
  const currentEnd = new Date(props.currentReservation.endTime)

  // 尝试前移1小时
  const suggestedStart = addHours(currentStart, -1)
  const suggestedEnd = addHours(currentEnd, -1)

  // 确保在工作时间内
  if (suggestedStart.getHours() >= 8 && suggestedEnd.getHours() <= 18) {
    proposedStartTime.value = suggestedStart
    proposedEndTime.value = suggestedEnd
  } else {
    // 如果不在工作时间，尝试后移1小时
    const altStart = addHours(currentStart, 1)
    const altEnd = addHours(currentEnd, 1)
    if (altStart.getHours() >= 8 && altEnd.getHours() <= 18) {
      proposedStartTime.value = altStart
      proposedEndTime.value = altEnd
    }
  }
}

function generateTimeSuggestions(): string[] {
  const suggestions = []
  const originalStart = new Date(props.conflictReservation?.startTime || new Date())
  const originalEnd = new Date(props.conflictReservation?.endTime || new Date())

  // 建议几个时间段
  const timeAdjustments = [
    { hours: -2, label: '提前2小时' },
    { hours: -1, label: '提前1小时' },
    { hours: 1, label: '延后1小时' },
    { hours: 2, label: '延后2小时' }
  ]

  timeAdjustments.forEach(adj => {
    const newStart = addHours(originalStart, adj.hours)
    const newEnd = addHours(originalEnd, adj.hours)

    if (newStart.getHours() >= 8 && newEnd.getHours() <= 18) {
      suggestions.push(
        `${format(newStart, 'HH:mm', { locale: zhCN })} - ${format(newEnd, 'HH:mm', { locale: zhCN })} (${adj.label})`
      )
    }
  })

  return suggestions
}

function handleMessageChange(): void {
  // 清除模板选择，因为用户正在自定义消息
  selectedTemplate.value = ''
}

function handleSubmit(): void {
  if (!props.conflictReservation || !customTitle.value.trim() || !customMessage.value.trim()) {
    return
  }

  const proposedChanges: any = {
    type: negotiationType.value
  }

  if (negotiationType.value === 'time_adjustment' && includeTimeSuggestions.value) {
    proposedChanges.suggestedTimes = generateTimeSuggestions()
    proposedChanges.originalTime = {
      start: props.conflictReservation.startTime,
      end: props.conflictReservation.endTime
    }
  }

  if (includeAlternativeRooms.value) {
    proposedChanges.alternativeRooms = [
      {
        name: '会议室B',
        capacity: 10,
        location: '2楼',
        availableSlots: generateTimeSuggestions()
      }
    ]
  }

  const data = {
    targetUserId: props.conflictReservation.organizerId,
    title: customTitle.value,
    message: customMessage.value,
    proposedChanges,
    deadline: deadlineDate.value
  }

  emit('send', data)
}

function formatDateTime(date: Date): string {
  return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
}

function getCurrentUserDisplayInfo(): string {
  return props.currentReservation.organizerId || '当前用户'
}

// 监听器
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 重置表单
    selectedTemplate.value = ''
    customTitle.value = ''
    customMessage.value = ''
    negotiationType.value = 'time_adjustment'
    deadlineDays.value = 3
    includeAlternativeRooms.value = false
    includeTimeSuggestions.value = true

    // 如果有冲突预约，自动选择时间调整模板
    if (props.conflictReservation) {
      handleTemplateSelect('time_adjust_polite')
    }
  }
})
</script>

<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 头部 -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">发起协商请求</h2>
            <p class="text-sm text-gray-600 mt-1">
              与 {{ conflictReservation?.organizerName || '预约者' }} 协商解决方案
            </p>
          </div>
          <button
            @click="emit('cancel')"
            class="text-gray-400 hover:text-gray-600"
          >
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>
      </div>

      <div class="p-6">
        <!-- 冲突信息摘要 -->
        <div v-if="conflictReservation" class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 class="font-medium text-orange-900 mb-2">冲突预约信息</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-orange-700">会议主题:</span>
              <span class="font-medium text-orange-900 ml-2">{{ conflictReservation.title }}</span>
            </div>
            <div>
              <span class="text-orange-700">时间:</span>
              <span class="font-medium text-orange-900 ml-2">
                {{ format(conflictReservation.startTime, 'HH:mm', { locale: zhCN }) }} -
                {{ format(conflictReservation.endTime, 'HH:mm', { locale: zhCN }) }}
              </span>
            </div>
            <div>
              <span class="text-orange-700">会议室:</span>
              <span class="font-medium text-orange-900 ml-2">{{ conflictReservation.roomName }}</span>
            </div>
            <div>
              <span class="text-orange-700">组织者:</span>
              <span class="font-medium text-orange-900 ml-2">{{ conflictReservation.organizerName }}</span>
            </div>
          </div>
        </div>

        <!-- 协商模板选择 -->
        <div class="mb-6">
          <h3 class="font-medium text-gray-900 mb-3">选择协商模板</h3>
          <div class="grid grid-cols-1 gap-3">
            <div
              v-for="template in negotiationTemplates"
              :key="template.id"
              @click="handleTemplateSelect(template.id)"
              class="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300"
              :class="[
                selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              ]"
            >
              <div class="flex items-center space-x-3">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ template.title }}</h4>
                  <p class="text-sm text-gray-600 mt-1">{{ template.message }}</p>
                  <div class="mt-2">
                    <span class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {{ template.type === 'time_adjustment' ? '时间调整' :
                         template.type === 'room_change' ? '会议室更换' :
                         template.type === 'equipment_addition' ? '设备添加' : '自定义' }}
                    </span>
                  </div>
                </div>
                <div class="text-blue-500">
                  <i class="pi pi-check-circle text-xl" v-if="selectedTemplate === template.id"></i>
                  <i class="pi pi-circle text-xl text-gray-300" v-else></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 自定义消息 -->
        <div class="mb-6">
          <h3 class="font-medium text-gray-900 mb-3">协商消息</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">协商标题</label>
              <input
                v-model="customTitle"
                @input="handleMessageChange"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入协商标题"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">详细消息</label>
              <textarea
                v-model="customMessage"
                @input="handleMessageChange"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="请详细描述您希望的调整方案..."
              ></textarea>
              <div class="text-xs text-gray-500 mt-1">
                {{ customMessage.length }}/500 字符
              </div>
            </div>
          </div>
        </div>

        <!-- 协商选项 -->
        <div class="mb-6">
          <h3 class="font-medium text-gray-900 mb-3">协商选项</h3>
          <div class="space-y-3">
            <!-- 时间建议 -->
            <div>
              <label class="flex items-center space-x-2">
                <input
                  v-model="includeTimeSuggestions"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                <span class="text-sm text-gray-700">包含时间建议</span>
              </label>
              <div v-if="includeTimeSuggestions" class="mt-2 ml-6">
                <div class="text-xs text-gray-600">将提供以下时间建议:</div>
                <div class="flex flex-wrap gap-2 mt-1">
                  <span
                    v-for="suggestion in generateTimeSuggestions()"
                    :key="suggestion"
                    class="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                  >
                    {{ suggestion }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 替代会议室 -->
            <div>
              <label class="flex items-center space-x-2">
                <input
                  v-model="includeAlternativeRooms"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                <span class="text-sm text-gray-700">提供替代会议室选项</span>
              </label>
            </div>

            <!-- 协商截止时间 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                协商截止时间: {{ deadlineDays }}天后 ({{ formatDateTime(deadlineDate) }})
              </label>
              <input
                v-model="deadlineDays"
                type="range"
                min="1"
                max="7"
                class="w-full"
              >
              <div class="flex justify-between text-xs text-gray-500">
                <span>1天</span>
                <span>7天</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 预览 -->
        <div class="mb-6">
          <h3 class="font-medium text-gray-900 mb-3">协商预览</h3>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="mb-2">
              <span class="font-medium">收件人:</span>
              <span class="ml-2">{{ conflictReservation?.organizerName }}</span>
            </div>
            <div class="mb-2">
              <span class="font-medium">标题:</span>
              <span class="ml-2">{{ customTitle || '(未填写)' }}</span>
            </div>
            <div class="mb-2">
              <span class="font-medium">消息:</span>
              <div class="mt-1 p-2 bg-white rounded border">
                {{ customMessage || '(未填写)' }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-2">
              响应截止: {{ formatDateTime(deadlineDate) }}
            </div>
          </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="flex justify-end space-x-3">
          <button
            @click="emit('cancel')"
            class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            @click="handleSubmit"
            :disabled="loading || !customTitle.trim() || !customMessage.trim()"
            class="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            发送协商请求
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 响应式设计 */
@media (max-width: 768px) {
  .max-w-2xl {
    @apply mx-2;
  }

  .grid {
    @apply grid-cols-1;
  }
}

/* 动画效果 */
.transition-all {
  @apply transition-all duration-200;
}

/* 输入框焦点样式 */
.focus\:ring-blue-500:focus {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* 文本区域样式 */
textarea {
  resize: vertical;
  min-height: 100px;
}
</style>