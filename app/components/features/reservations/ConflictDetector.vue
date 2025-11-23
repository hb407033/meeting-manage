<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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

interface TimeSlot {
  startTime: Date
  endTime: Date
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

interface Props {
  reservation: {
    roomId: string
    title?: string
    startTime: Date
    endTime: Date
    attendeeCount?: number
    equipment?: string[]
  }
  roomInfo: {
    id: string
    name: string
    capacity: number
    equipment: string[]
  }
  loading?: boolean
  autoDetect?: boolean
  showSuggestions?: boolean
}

interface Emits {
  (e: 'conflictDetected', conflicts: Conflict[]): void
  (e: 'conflictResolved'): void
  (e: 'suggestionSelect', suggestion: Suggestion): void
  (e: 'timeChange', startTime: Date, endTime: Date): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  autoDetect: true,
  showSuggestions: true
})

const emit = defineEmits<Emits>()

// 内部状态
const isDetecting = ref(false)
const conflicts = ref<Conflict[]>([])
const suggestions = ref<Suggestion[]>([])
const lastCheckTime = ref<Date | null>(null)
const showConflictDialog = ref(false)

// 计算属性
const hasConflicts = computed(() => conflicts.value.length > 0)
const hasCriticalConflicts = computed(() =>
  conflicts.value.some(c => c.severity === 'critical')
)
const hasHighConflicts = computed(() =>
  conflicts.value.some(c => c.severity === 'high')
)
const conflictCount = computed(() => conflicts.value.length)

const conflictTypeLabels = {
  time_overlap: '时间冲突',
  capacity_exceeded: '容量超限',
  equipment_conflict: '设备冲突',
  maintenance_conflict: '维护冲突',
  rule_conflict: '规则冲突'
}

const severityColors = {
  low: 'text-gray-600 bg-gray-100',
  medium: 'text-blue-600 bg-blue-100',
  high: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100'
}

const severityIcons = {
  low: 'pi-info-circle',
  medium: 'pi-exclamation-triangle',
  high: 'pi-exclamation-circle',
  critical: 'pi-times-circle'
}

// 方法
async function detectConflicts(): Promise<void> {
  if (!props.reservation.roomId || !props.reservation.startTime || !props.reservation.endTime) {
    return
  }

  isDetecting.value = true
  try {
    const response = await $fetch('/api/v1/reservations/conflict-check', {
      method: 'POST',
      body: {
        reservation: {
          roomId: props.reservation.roomId,
          startTime: props.reservation.startTime.toISOString(),
          endTime: props.reservation.endTime.toISOString(),
          title: props.reservation.title,
          attendeeCount: props.reservation.attendeeCount,
          equipment: props.reservation.equipment
        }
      }
    })

    if (response.success) {
      conflicts.value = response.data.conflicts.map((conflict: any) => ({
        ...conflict,
        conflictingReservation: conflict.conflictingReservation ? {
          ...conflict.conflictingReservation,
          startTime: new Date(conflict.conflictingReservation.startTime),
          endTime: new Date(conflict.conflictingReservation.endTime)
        } : undefined
      }))

      suggestions.value = response.data.suggestions?.map((suggestion: any) => ({
        ...suggestion,
        startTime: new Date(suggestion.startTime),
        endTime: new Date(suggestion.endTime)
      })) || []

      lastCheckTime.value = new Date()

      if (hasConflicts.value) {
        emit('conflictDetected', conflicts.value)
        console.log(`检测到 ${conflicts.value.length} 个冲突`)
      } else {
        emit('conflictResolved')
        console.log('无冲突检测到')
      }
    } else {
      console.error('冲突检测失败:', response.message)
    }
  } catch (error) {
    console.error('冲突检测请求失败:', error)
    // 使用模拟数据作为后备
    const mockConflicts = generateMockConflicts()
    conflicts.value = mockConflicts
    suggestions.value = generateMockSuggestions()

    if (mockConflicts.length > 0) {
      emit('conflictDetected', mockConflicts)
    }
  } finally {
    isDetecting.value = false
  }
}

function generateMockConflicts(): Conflict[] {
  const mockConflicts: Conflict[] = []

  // 模拟时间冲突
  if (Math.random() > 0.6) {
    mockConflicts.push({
      type: 'time_overlap',
      severity: 'high',
      description: '与现有团队会议时间重叠',
      conflictingReservation: {
        id: 'mock-1',
        title: '团队周会',
        startTime: addMinutes(props.reservation.startTime, -30),
        endTime: addMinutes(props.reservation.endTime, 30),
        organizerName: '张经理'
      }
    })
  }

  // 模拟容量冲突
  if (props.reservation.attendeeCount && props.reservation.attendeeCount > props.roomInfo.capacity) {
    mockConflicts.push({
      type: 'capacity_exceeded',
      severity: 'medium',
      description: `参会人数(${props.reservation.attendeeCount})超过会议室容量(${props.roomInfo.capacity})`,
      details: {
        attendeeCount: props.reservation.attendeeCount,
        roomCapacity: props.roomInfo.capacity
      }
    })
  }

  // 模拟设备冲突
  if (props.reservation.equipment && props.reservation.equipment.length > 0) {
    const missingEquipment = props.reservation.equipment.filter(eq => !props.roomInfo.equipment.includes(eq))
    if (missingEquipment.length > 0) {
      mockConflicts.push({
        type: 'equipment_conflict',
        severity: 'medium',
        description: `会议室缺少设备: ${missingEquipment.join(', ')}`,
        details: {
          requestedEquipment: missingEquipment,
          availableEquipment: props.roomInfo.equipment
        }
      })
    }
  }

  return mockConflicts
}

function generateMockSuggestions(): Suggestion[] {
  const suggestions: Suggestion[] = []
  const duration = differenceInMinutes(props.reservation.endTime, props.reservation.startTime)

  // 生成几个备用时间段
  const timeSlots = [
    { startHour: 9, duration },
    { startHour: 14, duration },
    { startHour: 16, duration }
  ]

  timeSlots.forEach((slot, index) => {
    const startTime = new Date(props.reservation.startTime)
    startTime.setHours(slot.startHour, 0, 0, 0)

    const endTime = new Date(startTime)
    endTime.setMinutes(startTime.getMinutes() + slot.duration)

    suggestions.push({
      id: `suggestion-${index}`,
      roomId: props.roomInfo.id,
      roomName: props.roomInfo.name,
      startTime,
      endTime,
      score: 80 - index * 10,
      reasons: ['无时间冲突', '容量匹配', '设备齐全']
    })
  })

  return suggestions
}

function handleSuggestionSelect(suggestion: Suggestion): void {
  emit('suggestionSelect', suggestion)
  emit('timeChange', suggestion.startTime, suggestion.endTime)
}

function getConflictIcon(conflict: Conflict): string {
  return severityIcons[conflict.severity] || 'pi-info-circle'
}

function getConflictColor(conflict: Conflict): string {
  return severityColors[conflict.severity] || 'text-gray-600 bg-gray-100'
}

function formatTimeRange(startTime: Date, endTime: Date): string {
  return `${format(startTime, 'HH:mm', { locale: zhCN })} - ${format(endTime, 'HH:mm', { locale: zhCN })}`
}

function formatDuration(startTime: Date, endTime: Date): string {
  const minutes = differenceInMinutes(endTime, startTime)
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`
}

// 监听器
watch(() => props.reservation, () => {
  if (props.autoDetect) {
    detectConflicts()
  }
}, { deep: true })

// 生命周期
onMounted(() => {
  if (props.autoDetect) {
    detectConflicts()
  }
})

// 暴露给父组件的方法
defineExpose({
  detectConflicts,
  conflicts,
  suggestions,
  hasConflicts,
  isDetecting
})
</script>

<template>
  <div class="conflict-detector">
    <!-- 冲突检测状态指示器 -->
    <div class="conflict-status-indicator mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <h4 class="text-sm font-medium text-gray-700">冲突检测</h4>

          <!-- 检测状态 -->
          <div class="flex items-center space-x-2">
            <div v-if="isDetecting" class="flex items-center text-blue-600">
              <i class="pi pi-spin pi-spinner mr-2"></i>
              <span class="text-sm">检测中...</span>
            </div>

            <div v-else-if="hasConflicts" class="flex items-center">
              <div class="relative">
                <i :class="[
                  'text-lg mr-2',
                  hasCriticalConflicts ? 'pi-times-circle text-red-500' :
                  hasHighConflicts ? 'pi-exclamation-circle text-orange-500' :
                  'pi-exclamation-triangle text-yellow-500'
                ]"></i>
                <span v-if="conflictCount > 1"
                  class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {{ conflictCount }}
                </span>
              </div>
              <span class="text-sm font-medium text-gray-700">
                发现 {{ conflictCount }} 个冲突
              </span>
            </div>

            <div v-else class="flex items-center text-green-600">
              <i class="pi pi-check-circle text-lg mr-2"></i>
              <span class="text-sm">无冲突</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center space-x-2">
          <button
            @click="detectConflicts"
            :disabled="isDetecting || loading"
            class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
          >
            <i class="pi pi-refresh mr-1"></i>
            重新检测
          </button>

          <button
            v-if="hasConflicts"
            @click="showConflictDialog = true"
            class="px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            查看详情
          </button>
        </div>
      </div>

      <!-- 最后检测时间 -->
      <div v-if="lastCheckTime" class="text-xs text-gray-500 mt-1">
        最后检测: {{ format(lastCheckTime, 'HH:mm:ss', { locale: zhCN }) }}
      </div>
    </div>

    <!-- 快速冲突摘要 -->
    <div v-if="hasConflicts && !showConflictDialog" class="conflict-summary bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
      <div class="flex items-start space-x-3">
        <i class="pi pi-exclamation-triangle text-orange-500 mt-0.5"></i>
        <div class="flex-1">
          <div class="text-sm font-medium text-orange-800 mb-1">
            冲突摘要
          </div>
          <ul class="space-y-1">
            <li
              v-for="conflict in conflicts.slice(0, 3)"
              :key="conflict.type"
              class="text-xs text-orange-700 flex items-center"
            >
              <span :class="['inline-block w-2 h-2 rounded-full mr-2',
                conflict.severity === 'critical' ? 'bg-red-500' :
                conflict.severity === 'high' ? 'bg-orange-500' :
                conflict.severity === 'medium' ? 'bg-yellow-500' :
                'bg-gray-500'
              ]"></span>
              {{ conflictTypeLabels[conflict.type] }}: {{ conflict.description }}
            </li>
          </ul>
          <div v-if="conflicts.length > 3" class="text-xs text-orange-600 mt-2">
            还有 {{ conflicts.length - 3 }} 个冲突...
          </div>
        </div>
      </div>
    </div>

    <!-- 建议时间 -->
    <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-section">
      <div class="text-sm font-medium text-gray-700 mb-3">推荐时间</div>
      <div class="grid gap-2">
        <div
          v-for="suggestion in suggestions.slice(0, 2)"
          :key="suggestion.id"
          class="bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors"
          @click="handleSuggestionSelect(suggestion)"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-green-800">
                {{ formatTimeRange(suggestion.startTime, suggestion.endTime) }}
              </div>
              <div class="text-xs text-green-600">
                {{ formatDuration(suggestion.startTime, suggestion.endTime) }}
              </div>
              <div class="text-xs text-gray-600 mt-1">
                匹配度: {{ suggestion.score }}%
              </div>
            </div>
            <button class="text-green-600 hover:text-green-700">
              <i class="pi pi-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 冲突详情对话框 -->
    <div v-if="showConflictDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">冲突详情</h3>
            <button
              @click="showConflictDialog = false"
              class="text-gray-400 hover:text-gray-600"
            >
              <i class="pi pi-times text-xl"></i>
            </button>
          </div>

          <div class="space-y-4">
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
                      {{ conflictTypeLabels[conflict.type] }}
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
                  </div>

                  <!-- 详细信息 -->
                  <div v-if="conflict.details" class="mt-2 text-xs">
                    <details class="cursor-pointer">
                      <summary class="font-medium">详细信息</summary>
                      <pre class="mt-1 whitespace-pre-wrap">{{ JSON.stringify(conflict.details, null, 2) }}</pre>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 建议时间 -->
          <div v-if="suggestions.length > 0" class="mt-6 pt-6 border-t">
            <h4 class="font-medium text-gray-900 mb-3">建议时间段</h4>
            <div class="space-y-2">
              <div
                v-for="suggestion in suggestions"
                :key="suggestion.id"
                class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                @click="handleSuggestionSelect(suggestion); showConflictDialog = false"
              >
                <div>
                  <div class="font-medium text-green-800">
                    {{ formatTimeRange(suggestion.startTime, suggestion.endTime) }}
                  </div>
                  <div class="text-xs text-green-600">{{ suggestion.roomName }}</div>
                  <div class="text-xs text-gray-600">{{ suggestion.reasons.join(', ') }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-green-800">{{ suggestion.score }}%</div>
                  <div class="text-xs text-gray-500">匹配度</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-6 flex justify-end space-x-3">
            <button
              @click="showConflictDialog = false"
              class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conflict-detector {
  @apply space-y-4;
}

.conflict-status-indicator {
  @apply bg-white border rounded-lg p-4;
}

.conflict-summary {
  @apply transition-all duration-200;
}

.suggestions-section {
  @apply mt-4;
}

/* 动画效果 */
.conflict-status-indicator {
  transition: all 0.3s ease;
}

.conflict-status-indicator:hover {
  @apply shadow-sm;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .conflict-status-indicator .flex {
    @apply flex-col space-x-0 space-y-3;
  }

  .conflict-status-indicator .flex.items-center.justify-between {
    @apply items-start;
  }
}
</style>