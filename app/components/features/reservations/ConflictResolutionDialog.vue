<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { format, addMinutes, differenceInMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Conflict {
  type: 'time_overlap' | 'capacity_exceeded' | 'equipment_conflict' | 'maintenance_conflict' | 'rule_conflict'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  conflictingReservation?: {
    id: string
    title: string
    startTime: Date
    endTime: Date
    organizerName: string
  }
  details?: any
}

interface Suggestion {
  id: string
  roomId: string
  roomName: string
  startTime: Date
  endTime: Date
  score: number
  reasons: string[]
}

interface AlternativeRoom {
  id: string
  name: string
  capacity: number
  location: string
  equipment: string[]
  availableAt: Date[]
}

interface Props {
  visible: boolean
  conflicts: Conflict[]
  currentReservation: {
    id?: string
    title: string
    roomId: string
    startTime: Date
    endTime: Date
    attendeeCount: number
    equipment: string[]
  }
  alternativeRooms?: AlternativeRoom[]
  suggestions?: Suggestion[]
  loading?: boolean
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'resolve', strategy: string, data: any): void
  (e: 'negotiate', conflictId: string): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  alternativeRooms: () => [],
  suggestions: () => []
})

const emit = defineEmits<Emits>()

// 内部状态
const selectedStrategy = ref<string>('time_adjust')
const selectedSuggestion = ref<Suggestion | null>(null)
const selectedAlternativeRoom = ref<AlternativeRoom | null>(null)
const customTimeStart = ref<Date>(new Date())
const customTimeEnd = ref<Date>(new Date())
const negotiationMessage = ref('')
const showNegotiationForm = ref(false)
const selectedConflictForNegotiation = ref<Conflict | null>(null)

// 计算属性
const hasTimeConflicts = computed(() =>
  props.conflicts.some(c => c.type === 'time_overlap')
)
const hasCapacityConflicts = computed(() =>
  props.conflicts.some(c => c.type === 'capacity_exceeded')
)
const hasEquipmentConflicts = computed(() =>
  props.conflicts.some(c => c.type === 'equipment_conflict')
)

const availableStrategies = computed(() => {
  const strategies = []

  if (hasTimeConflicts.value && props.suggestions.length > 0) {
    strategies.push({
      id: 'time_adjust',
      title: '调整时间',
      description: '选择其他可用时间段',
      icon: 'pi-clock',
      color: 'blue'
    })
  }

  if (props.alternativeRooms.length > 0) {
    strategies.push({
      id: 'room_change',
      title: '更换会议室',
      description: '选择其他可用会议室',
      icon: 'pi-home',
      color: 'green'
    })
  }

  strategies.push({
    id: 'custom_time',
    title: '自定义时间',
    description: '手动设置新的时间',
    icon: 'pi-calendar-plus',
    color: 'purple'
  })

  if (hasTimeConflicts.value) {
    strategies.push({
      id: 'negotiate',
      title: '发起协商',
      description: '向冲突预约发起者协商请求',
      icon: 'pi-comments',
      color: 'orange'
    })
  }

  strategies.push({
    id: 'ignore',
    title: '忽略冲突',
    description: '忽略这些冲突继续预约',
    icon: 'pi-forward',
    color: 'gray'
  })

  return strategies
})

const currentDuration = computed(() =>
  differenceInMinutes(props.currentReservation.endTime, props.currentReservation.startTime)
)

// 方法
function handleStrategySelect(strategyId: string): void {
  selectedStrategy.value = strategyId
  selectedSuggestion.value = null
  selectedAlternativeRoom.value = null

  if (strategyId === 'custom_time') {
    customTimeStart.value = new Date(props.currentReservation.startTime)
    customTimeEnd.value = new Date(props.currentReservation.endTime)
  }
}

function handleSuggestionSelect(suggestion: Suggestion): void {
  selectedSuggestion.value = suggestion
  customTimeStart.value = suggestion.startTime
  customTimeEnd.value = suggestion.endTime
}

function handleAlternativeRoomSelect(room: AlternativeRoom): void {
  selectedAlternativeRoom.value = room
  // 选择第一个可用时间
  if (room.availableAt.length > 0) {
    customTimeStart.value = room.availableAt[0]
    customTimeEnd.value = addMinutes(room.availableAt[0], currentDuration.value)
  }
}

function handleNegotiate(conflict: Conflict): void {
  selectedConflictForNegotiation.value = conflict
  showNegotiationForm.value = true
}

function submitNegotiation(): void {
  if (!selectedConflictForNegotiation.value || !negotiationMessage.value.trim()) {
    return
  }

  emit('negotiate', selectedConflictForNegotiation.value.conflictingReservation?.id)
  showNegotiationForm.value = false
  negotiationMessage.value = ''
}

function applyResolution(): void {
  let data: any = {}

  switch (selectedStrategy.value) {
    case 'time_adjust':
      if (!selectedSuggestion.value) {
        alert('请选择一个建议时间')
        return
      }
      data = {
        type: 'time_adjust',
        suggestion: selectedSuggestion.value
      }
      break

    case 'room_change':
      if (!selectedAlternativeRoom.value) {
        alert('请选择一个替代会议室')
        return
      }
      data = {
        type: 'room_change',
        room: selectedAlternativeRoom.value,
        startTime: customTimeStart.value,
        endTime: customTimeEnd.value
      }
      break

    case 'custom_time':
      data = {
        type: 'custom_time',
        startTime: customTimeStart.value,
        endTime: customTimeEnd.value
      }
      break

    case 'negotiate':
      // 协商通过单独的对话框处理
      return

    case 'ignore':
      data = {
        type: 'ignore',
        conflicts: props.conflicts
      }
      break

    default:
      return
  }

  emit('resolve', selectedStrategy.value, data)
}

function formatTimeRange(startTime: Date, endTime: Date): string {
  return `${format(startTime, 'HH:mm', { locale: zhCN })} - ${format(endTime, 'HH:mm', { locale: zhCN })}`
}

function formatDate(date: Date): string {
  return format(date, 'MM月dd日', { locale: zhCN })
}

function getConflictIcon(conflict: Conflict): string {
  const icons = {
    time_overlap: 'pi-clock',
    capacity_exceeded: 'pi-users',
    equipment_conflict: 'pi-cog',
    maintenance_conflict: 'pi-wrench',
    rule_conflict: 'pi-lock'
  }
  return icons[conflict.type] || 'pi-info-circle'
}

function getConflictColor(conflict: Conflict): string {
  const colors = {
    low: 'text-gray-600 bg-gray-100',
    medium: 'text-blue-600 bg-blue-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100'
  }
  return colors[conflict.severity] || 'text-gray-600 bg-gray-100'
}

// 监听器
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 重置状态
    selectedStrategy.value = 'time_adjust'
    selectedSuggestion.value = null
    selectedAlternativeRoom.value = null
    showNegotiationForm.value = false
    negotiationMessage.value = ''
  }
})
</script>

<template>
  <!-- 主对话框 -->
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 头部 -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">冲突解决方案</h2>
            <p class="text-sm text-gray-600 mt-1">
              为预约 "{{ currentReservation.title }}" 选择解决方案
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
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 左侧：冲突详情 -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">检测到的冲突</h3>

            <div class="space-y-3">
              <div
                v-for="conflict in conflicts"
                :key="conflict.type"
                class="border rounded-lg p-4"
                :class="getConflictColor(conflict)"
              >
                <div class="flex items-start space-x-3">
                  <i :class="[getConflictIcon(conflict), 'text-lg mt-0.5']"></i>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="font-medium">
                        {{ conflict.type === 'time_overlap' ? '时间冲突' :
                           conflict.type === 'capacity_exceeded' ? '容量冲突' :
                           conflict.type === 'equipment_conflict' ? '设备冲突' :
                           conflict.type === 'maintenance_conflict' ? '维护冲突' :
                           '规则冲突' }}
                      </h4>
                      <span class="text-xs px-2 py-1 rounded-full" :class="getConflictColor(conflict)">
                        {{ conflict.severity.toUpperCase() }}
                      </span>
                    </div>

                    <p class="text-sm mb-2">{{ conflict.description }}</p>

                    <!-- 冲突预约信息 -->
                    <div v-if="conflict.conflictingReservation" class="text-xs bg-white bg-opacity-50 rounded p-2">
                      <div class="font-medium mb-1">冲突预约:</div>
                      <div>{{ conflict.conflictingReservation.title }}</div>
                      <div>{{ formatTimeRange(conflict.conflictingReservation.startTime, conflict.conflictingReservation.endTime) }}</div>
                      <div>组织者: {{ conflict.conflictingReservation.organizerName }}</div>

                      <!-- 协商按钮 -->
                      <button
                        v-if="conflict.type === 'time_overlap'"
                        @click="handleNegotiate(conflict)"
                        class="mt-2 px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                      >
                        <i class="pi pi-comments mr-1"></i>
                        发起协商
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 当前预约信息 -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">当前预约信息</h4>
              <div class="space-y-1 text-sm text-gray-600">
                <div>时间: {{ formatTimeRange(currentReservation.startTime, currentReservation.endTime) }}</div>
                <div>会议室: {{ currentReservation.roomId }}</div>
                <div>参会人数: {{ currentReservation.attendeeCount }}人</div>
                <div v-if="currentReservation.equipment.length > 0">
                  设备需求: {{ currentReservation.equipment.join(', ') }}
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：解决方案选择 -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">选择解决方案</h3>

            <!-- 策略选择 -->
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="strategy in availableStrategies"
                :key="strategy.id"
                @click="handleStrategySelect(strategy.id)"
                class="p-4 border-2 rounded-lg text-left transition-all"
                :class="[
                  selectedStrategy === strategy.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                ]"
              >
                <div class="flex items-center space-x-3">
                  <i :class="[`pi ${strategy.icon}`, `text-${strategy.color}-500`]"></i>
                  <div>
                    <div class="font-medium text-gray-900">{{ strategy.title }}</div>
                    <div class="text-xs text-gray-600">{{ strategy.description }}</div>
                  </div>
                </div>
              </button>
            </div>

            <!-- 动态解决方案内容 -->
            <div class="bg-gray-50 rounded-lg p-4">
              <!-- 时间调整解决方案 -->
              <div v-if="selectedStrategy === 'time_adjust' && suggestions.length > 0">
                <h4 class="font-medium text-gray-900 mb-3">推荐时间段</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <div
                    v-for="suggestion in suggestions"
                    :key="suggestion.id"
                    @click="handleSuggestionSelect(suggestion)"
                    class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                    :class="[
                      selectedSuggestion?.id === suggestion.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    ]"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-gray-900">
                          {{ formatTimeRange(suggestion.startTime, suggestion.endTime) }}
                        </div>
                        <div class="text-xs text-gray-600">{{ suggestion.roomName }}</div>
                        <div class="text-xs text-green-600 mt-1">
                          匹配度: {{ suggestion.score }}%
                        </div>
                      </div>
                      <div class="text-blue-500">
                        <i class="pi pi-check-circle" v-if="selectedSuggestion?.id === suggestion.id"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 会议室更换解决方案 -->
              <div v-else-if="selectedStrategy === 'room_change' && alternativeRooms.length > 0">
                <h4 class="font-medium text-gray-900 mb-3">替代会议室</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <div
                    v-for="room in alternativeRooms"
                    :key="room.id"
                    @click="handleAlternativeRoomSelect(room)"
                    class="p-3 bg-white border rounded-lg cursor-pointer hover:border-green-500 transition-colors"
                    :class="[
                      selectedAlternativeRoom?.id === room.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200'
                    ]"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-gray-900">{{ room.name }}</div>
                        <div class="text-xs text-gray-600">
                          {{ room.location }} • 容量{{ room.capacity }}人
                        </div>
                        <div v-if="room.availableAt.length > 0" class="text-xs text-green-600 mt-1">
                          首个可用: {{ formatTimeRange(room.availableAt[0], addMinutes(room.availableAt[0], currentDuration)) }}
                        </div>
                      </div>
                      <div class="text-green-500">
                        <i class="pi pi-check-circle" v-if="selectedAlternativeRoom?.id === room.id"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 自定义时间解决方案 -->
              <div v-else-if="selectedStrategy === 'custom_time'">
                <h4 class="font-medium text-gray-900 mb-3">自定义时间段</h4>
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                    <input
                      v-model="customTimeStart"
                      type="datetime-local"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                    <input
                      v-model="customTimeEnd"
                      type="datetime-local"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                  <div class="text-sm text-gray-600">
                    时长: {{ formatTimeRange(customTimeStart, customTimeEnd) }}
                  </div>
                </div>
              </div>

              <!-- 协商解决方案 -->
              <div v-else-if="selectedStrategy === 'negotiate'">
                <div class="text-center py-8">
                  <i class="pi pi-comments text-4xl text-orange-500 mb-3"></i>
                  <p class="text-gray-600 mb-4">点击冲突详情中的"发起协商"按钮</p>
                  <p class="text-sm text-gray-500">我们将向冲突预约的组织者发送协商请求</p>
                </div>
              </div>

              <!-- 忽略冲突解决方案 -->
              <div v-else-if="selectedStrategy === 'ignore'">
                <div class="text-center py-8">
                  <i class="pi pi-forward text-4xl text-gray-500 mb-3"></i>
                  <p class="text-gray-600">忽略检测到的冲突，继续创建预约</p>
                  <p class="text-sm text-orange-600 mt-2">⚠️ 这可能会导致预约重叠或其他问题</p>
                </div>
              </div>

              <!-- 默认提示 -->
              <div v-else class="text-center py-8">
                <i class="pi pi-info-circle text-4xl text-blue-500 mb-3"></i>
                <p class="text-gray-600">请从上方选择一个解决方案</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="mt-6 pt-6 border-t flex justify-end space-x-3">
          <button
            @click="emit('cancel')"
            class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>

          <button
            v-if="selectedStrategy !== 'negotiate'"
            @click="applyResolution"
            :disabled="loading || (selectedStrategy === 'time_adjust' && !selectedSuggestion) ||
                     (selectedStrategy === 'room_change' && !selectedAlternativeRoom)"
            class="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            应用解决方案
          </button>
        </div>
      </div>
    </div>

    <!-- 协商对话框 -->
    <div v-if="showNegotiationForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">发起协商请求</h3>

          <div v-if="selectedConflictForNegotiation?.conflictingReservation" class="bg-gray-50 rounded-lg p-3 mb-4">
            <div class="text-sm font-medium text-gray-900 mb-1">协商对象:</div>
            <div class="text-sm text-gray-600">
              {{ selectedConflictForNegotiation.conflictingReservation.title }}
            </div>
            <div class="text-xs text-gray-500">
              {{ formatTimeRange(selectedConflictForNegotiation.conflictingReservation.startTime,
                                selectedConflictForNegotiation.conflictingReservation.endTime) }}
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">协商消息</label>
            <textarea
              v-model="negotiationMessage"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="请描述您希望如何调整时间..."
            ></textarea>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              @click="showNegotiationForm = false"
              class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              @click="submitNegotiation"
              :disabled="!negotiationMessage.trim()"
              class="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
            >
              发送协商请求
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 响应式设计 */
@media (max-width: 1024px) {
  .grid {
    @apply grid-cols-1;
  }
}

/* 按钮动画 */
button {
  @apply transition-all duration-200;
}

/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  @apply w-2;
}

.overflow-y-auto::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
</style>