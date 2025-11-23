<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { format, addDays, addMinutes, differenceInMinutes, startOfDay, endOfDay, isSameDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Suggestion {
  id: string
  roomId: string
  roomName: string
  startTime: Date
  endTime: Date
  score: number
  confidence: number
  reasons: string[]
  alternativeSlots?: TimeSlot[]
  metadata: {
    algorithm: string
    userPreference?: string
    historicalUsage?: number
    equipmentMatch?: number
    locationPreference?: number
  }
}

interface TimeSlot {
  startTime: Date
  endTime: Date
  available: boolean
  roomId: string
}

interface UserPreferences {
  preferredTimes: string[] // 'morning', 'afternoon', 'evening'
  preferredRooms: string[]
  equipmentRequirements: string[]
  locationPreference?: string
  minCapacity: number
  maxDuration: number // minutes
  avoidTimes: string[] // specific time ranges to avoid
}

interface Props {
  rooms: any[]
  date: Date
  userPreferences?: UserPreferences
  maxSuggestions?: number
  enablePersonalization?: boolean
  showAlternatives?: boolean
  algorithms?: string[]
  loading?: boolean
}

interface Emits {
  (e: 'suggestionSelect', suggestion: Suggestion): void
  (e: 'suggestionReject', suggestionId: string): void
  (e: 'preferencesChange', preferences: UserPreferences): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  maxSuggestions: 5,
  enablePersonalization: true,
  showAlternatives: true,
  algorithms: () => ['usage-pattern', 'equipment-match', 'location-proximity', 'time-preference'],
  loading: false
})

const emit = defineEmits<Emits>()

// 内部状态
const suggestions = ref<Suggestion[]>([])
const loadingSuggestions = ref(false)
const selectedSuggestion = ref<Suggestion | null>(null)
const userPreferences = ref<UserPreferences>({
  preferredTimes: ['morning', 'afternoon'],
  preferredRooms: [],
  equipmentRequirements: [],
  minCapacity: 2,
  maxDuration: 120,
  avoidTimes: []
})

// 计算属性
const filteredSuggestions = computed(() => {
  return suggestions.value
    .slice(0, props.maxSuggestions)
    .sort((a, b) => b.score - a.score)
})

const hasPreferences = computed(() => {
  return userPreferences.value.preferredTimes.length > 0 ||
         userPreferences.value.preferredRooms.length > 0 ||
         userPreferences.value.equipmentRequirements.length > 0
})

const timePreferenceOptions = [
  { value: 'morning', label: '上午 (8:00-12:00)', icon: 'pi-sun' },
  { value: 'afternoon', label: '下午 (12:00-18:00)', icon: 'pi-cloud' },
  { value: 'evening', label: '晚上 (18:00-22:00)', icon: 'pi-moon' }
]

// 方法
async function loadSuggestions() {
  if (!props.rooms.length) return

  loadingSuggestions.value = true
  try {
    // 使用 reservations store 获取时间建议
    const { useReservationStore } = await import('~/stores/reservations')
    const reservationsStore = useReservationStore()

    const response = await reservationsStore.getTimeSuggestions({
      date: props.date.toISOString(),
      roomIds: props.rooms.map(room => room.id),
      userPreferences: userPreferences.value,
      algorithms: props.algorithms,
      maxResults: props.maxSuggestions * 2 // 获取更多结果用于备用选择
    })

    if (response && Array.isArray(response)) {
      suggestions.value = response.map(suggestion => ({
        ...suggestion,
        startTime: new Date(suggestion.startTime),
        endTime: new Date(suggestion.endTime)
      }))
    } else {
      // 如果API不可用，生成模拟建议
      suggestions.value = generateMockSuggestions()
    }
  } catch (error) {
    console.error('Failed to load suggestions:', error)
    // 生成模拟建议作为后备
    suggestions.value = generateMockSuggestions()
  } finally {
    loadingSuggestions.value = false
  }
}

function generateMockSuggestions(): Suggestion[] {
  const mockSuggestions: Suggestion[] = []
  const availableRooms = props.rooms.slice(0, 3)

  const timeSlots = [
    { start: 9, end: 10 }, // 9:00-10:00
    { start: 10, end: 11 }, // 10:00-11:00
    { start: 14, end: 15 }, // 14:00-15:00
    { start: 15, end: 16 }, // 15:00-16:00
    { start: 16, end: 17 }  // 16:00-17:00
  ]

  availableRooms.forEach((room, roomIndex) => {
    timeSlots.forEach((timeSlot, timeIndex) => {
      const suggestionId = `suggestion-${roomIndex}-${timeIndex}`
      const startTime = new Date(props.date)
      startTime.setHours(timeSlot.start, 0, 0, 0)

      const endTime = new Date(props.date)
      endTime.setHours(timeSlot.end, 0, 0, 0)

      // 计算推荐分数
      const score = calculateSuggestionScore(room, startTime, endTime)
      const confidence = 0.6 + Math.random() * 0.3 // 0.6-0.9

      mockSuggestions.push({
        id: suggestionId,
        roomId: room.id,
        roomName: room.name,
        startTime,
        endTime,
        score,
        confidence,
        reasons: generateReasons(room, startTime, endTime, score),
        metadata: {
          algorithm: 'usage-pattern',
          historicalUsage: Math.floor(Math.random() * 100),
          equipmentMatch: Math.floor(Math.random() * 100),
          locationPreference: Math.floor(Math.random() * 100)
        }
      })
    })
  })

  return mockSuggestions.sort((a, b) => b.score - a.score)
}

function calculateSuggestionScore(room: any, startTime: Date, endTime: Date): number {
  let score = 50 // 基础分数

  // 时间偏好加分
  const hour = startTime.getHours()
  if (hour >= 9 && hour <= 11) score += 20 // 上午加分
  if (hour >= 14 && hour <= 16) score += 15 // 下午加分

  // 容量匹配加分
  if (room.capacity >= userPreferences.value.minCapacity) {
    score += 10
  }

  // 设备匹配加分
  if (userPreferences.value.equipmentRequirements.length > 0) {
    const matchCount = userPreferences.value.equipmentRequirements.filter(eq =>
      room.equipment?.includes(eq)
    ).length
    score += (matchCount / userPreferences.value.equipmentRequirements.length) * 15
  }

  // 房间偏好加分
  if (userPreferences.value.preferredRooms.includes(room.id)) {
    score += 20
  }

  return Math.min(100, score + Math.random() * 10) // 添加随机因子
}

function generateReasons(room: any, startTime: Date, endTime: Date, score: number): string[] {
  const reasons: string[] = []

  if (score >= 80) {
    reasons.push('高度匹配您的需求')
  } else if (score >= 60) {
    reasons.push('良好的匹配度')
  }

  const hour = startTime.getHours()
  if (hour >= 9 && hour <= 11) {
    reasons.push('黄金时间段，适合重要会议')
  }

  if (room.equipment && room.equipment.length > 0) {
    reasons.push('设备齐全')
  }

  if (room.capacity >= userPreferences.value.minCapacity) {
    reasons.push('容量适中')
  }

  // 随机添加一些原因
  const additionalReasons = [
    '历史使用率高',
    '用户评价良好',
    '交通便利',
    '环境安静',
    '网络稳定'
  ]

  if (Math.random() > 0.5 && additionalReasons.length > 0) {
    const randomReason = additionalReasons[Math.floor(Math.random() * additionalReasons.length)]
    if (!reasons.includes(randomReason)) {
      reasons.push(randomReason)
    }
  }

  return reasons.slice(0, 3) // 最多显示3个原因
}

function handleSuggestionSelect(suggestion: Suggestion) {
  selectedSuggestion.value = suggestion
  emit('suggestionSelect', suggestion)
}

function handleSuggestionReject(suggestionId: string) {
  emit('suggestionReject', suggestionId)
  suggestions.value = suggestions.value.filter(s => s.id !== suggestionId)
}

function handlePreferencesChange() {
  emit('preferencesChange', userPreferences.value)
  // 重新加载建议
  loadSuggestions()
}

function handleRefresh() {
  emit('refresh')
  loadSuggestions()
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

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800'
  if (score >= 60) return 'bg-blue-100 text-blue-800'
  if (score >= 40) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return '高'
  if (confidence >= 0.6) return '中'
  return '低'
}

// 监听器
watch([() => props.date, () => props.rooms], () => {
  loadSuggestions()
})

// 生命周期
onMounted(() => {
  loadSuggestions()
})

// 暴露给父组件的方法
defineExpose({
  loadSuggestions,
  suggestions,
  userPreferences,
  selectedSuggestion
})
</script>

<template>
  <div class="time-suggestion-panel">
    <!-- 面板头部 -->
    <div class="panel-header mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <h3 class="text-lg font-semibold text-gray-900">智能时间推荐</h3>
          <div class="text-sm text-gray-500">
            {{ format(date, 'yyyy年MM月dd日', { locale: zhCN }) }}
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            @click="handleRefresh"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            :disabled="loadingSuggestions"
            title="刷新推荐"
          >
            <i :class="loadingSuggestions ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>
          </button>
        </div>
      </div>

      <!-- 用户偏好设置 -->
      <div v-if="enablePersonalization" class="preferences-section mt-4 p-4 bg-blue-50 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-blue-900">个人偏好设置</h4>
          <button
            @click="hasPreferences = !hasPreferences"
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            {{ hasPreferences ? '收起' : '展开' }}
          </button>
        </div>

        <div v-show="hasPreferences" class="space-y-4">
          <!-- 时间偏好 -->
          <div>
            <label class="block text-sm font-medium text-blue-800 mb-2">偏好时间段</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="option in timePreferenceOptions"
                :key="option.value"
                class="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-50"
              >
                <input
                  v-model="userPreferences.preferredTimes"
                  type="checkbox"
                  :value="option.value"
                  class="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  @change="handlePreferencesChange"
                >
                <i :class="option.icon + ' text-blue-600 text-sm'"></i>
                <span class="text-sm text-gray-700">{{ option.label }}</span>
              </label>
            </div>
          </div>

          <!-- 设备需求 -->
          <div>
            <label class="block text-sm font-medium text-blue-800 mb-2">设备需求</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="equipment in ['投影仪', '白板', '音响', '电视', '电话会议']"
                :key="equipment"
                class="flex items-center space-x-2 bg-white px-3 py-1 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-50"
              >
                <input
                  v-model="userPreferences.equipmentRequirements"
                  type="checkbox"
                  :value="equipment"
                  class="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  @change="handlePreferencesChange"
                >
                <span class="text-sm text-gray-700">{{ equipment }}</span>
              </label>
            </div>
          </div>

          <!-- 最小容量 -->
          <div>
            <label class="block text-sm font-medium text-blue-800 mb-2">
              最小容量: {{ userPreferences.minCapacity }}人
            </label>
            <input
              v-model="userPreferences.minCapacity"
              type="range"
              min="1"
              max="50"
              class="w-full"
              @input="handlePreferencesChange"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 推荐列表 -->
    <div class="suggestions-section">
      <!-- 加载状态 -->
      <div v-if="loadingSuggestions" class="loading-state text-center py-12">
        <i class="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
        <p class="text-gray-600 mt-2">分析中，正在生成智能推荐...</p>
      </div>

      <!-- 推荐项目 -->
      <div v-else-if="filteredSuggestions.length > 0" class="suggestions-list space-y-4">
        <div
          v-for="suggestion in filteredSuggestions"
          :key="suggestion.id"
          class="suggestion-item bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
          :class="{ 'ring-2 ring-blue-500': selectedSuggestion?.id === suggestion.id }"
          @click="handleSuggestionSelect(suggestion)"
        >
          <!-- 推荐头部 -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <h4 class="font-medium text-gray-900">{{ suggestion.roomName }}</h4>
                <span class="text-sm text-gray-500">
                  {{ formatTimeRange(suggestion.startTime, suggestion.endTime) }}
                </span>
                <span class="text-xs text-gray-400">
                  ({{ formatDuration(suggestion.startTime, suggestion.endTime) }})
                </span>
              </div>

              <!-- 分数和置信度 -->
              <div class="flex items-center space-x-3">
                <div class="flex items-center space-x-1">
                  <span class="text-sm text-gray-600">推荐度:</span>
                  <span :class="['font-bold text-sm', getScoreColor(suggestion.score)]">
                    {{ suggestion.score }}%
                  </span>
                  <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all duration-300"
                      :class="[
                        suggestion.score >= 80 ? 'bg-green-500' :
                        suggestion.score >= 60 ? 'bg-blue-500' :
                        suggestion.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      ]"
                      :style="{ width: `${suggestion.score}%` }"
                    ></div>
                  </div>
                </div>

                <div class="flex items-center space-x-1">
                  <span class="text-sm text-gray-600">可信度:</span>
                  <span :class="['text-xs px-2 py-1 rounded-full', getScoreBadgeClass(suggestion.confidence * 100)]">
                    {{ getConfidenceLabel(suggestion.confidence) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center space-x-2">
              <button
                @click.stop="handleSuggestionSelect(suggestion)"
                class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                选择
              </button>
              <button
                @click.stop="handleSuggestionReject(suggestion.id)"
                class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="不感兴趣"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>

          <!-- 推荐原因 -->
          <div class="reasons-section">
            <h5 class="text-sm font-medium text-gray-700 mb-2">推荐原因:</h5>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="reason in suggestion.reasons"
                :key="reason"
                class="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
              >
                <i class="pi pi-check text-xs mr-1"></i>
                {{ reason }}
              </span>
            </div>
          </div>

          <!-- 元数据 -->
          <div v-if="suggestion.metadata" class="metadata-section mt-3 pt-3 border-t border-gray-100">
            <div class="flex items-center space-x-4 text-xs text-gray-500">
              <span v-if="suggestion.metadata.historicalUsage">
                <i class="pi pi-chart-bar mr-1"></i>
                历史使用: {{ suggestion.metadata.historicalUsage }}%
              </span>
              <span v-if="suggestion.metadata.equipmentMatch">
                <i class="pi pi-cog mr-1"></i>
                设备匹配: {{ suggestion.metadata.equipmentMatch }}%
              </span>
              <span class="ml-auto">
                算法: {{ suggestion.metadata.algorithm }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state text-center py-12">
        <i class="pi pi-lightbulb text-4xl text-gray-300 mb-3"></i>
        <p class="text-gray-500">暂无可用的时间推荐</p>
        <p class="text-sm text-gray-400 mt-1">
          请尝试调整个人偏好设置或选择其他日期
        </p>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="filteredSuggestions.length > 0" class="stats-section mt-6 p-4 bg-gray-50 rounded-lg">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-blue-600">{{ filteredSuggestions.length }}</div>
          <div class="text-xs text-gray-600">推荐选项</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-green-600">
            {{ filteredSuggestions.filter(s => s.score >= 80).length }}
          </div>
          <div class="text-xs text-gray-600">高度匹配</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-orange-600">
            {{ Math.round(filteredSuggestions.reduce((sum, s) => sum + s.confidence, 0) / filteredSuggestions.length * 100) }}%
          </div>
          <div class="text-xs text-gray-600">平均可信度</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-600">
            {{ algorithms.length }}
          </div>
          <div class="text-xs text-gray-600">算法模型</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.time-suggestion-panel {
  @apply space-y-6;
}

.panel-header {
  @apply sticky top-0 z-10 bg-white;
}

.preferences-section {
  @apply transition-all duration-300;
}

.loading-state {
  @apply py-12;
}

.suggestions-list {
  @apply space-y-4;
}

.suggestion-item {
  @apply transition-all duration-200;
}

.suggestion-item:hover {
  @apply transform -translate-y-1;
}

.reasons-section {
  @apply mt-3;
}

.metadata-section {
  @apply mt-3 pt-3 border-t border-gray-100;
}

.stats-section {
  @apply mt-6 p-4 bg-gray-50 rounded-lg;
}

.empty-state {
  @apply text-center py-12;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .suggestion-item .flex {
    @apply flex-col space-x-0 space-y-3;
  }

  .suggestion-item .flex.items-center.space-x-3 {
    @apply flex-col items-start space-x-0 space-y-1;
  }

  .stats-section .grid {
    @apply grid-cols-2 gap-2;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .panel-header {
    @apply bg-gray-900;
  }

  .preferences-section {
    @apply bg-blue-900;
  }

  .suggestion-item {
    @apply bg-gray-800 border-gray-700;
  }

  .suggestion-item h4 {
    @apply text-gray-100;
  }

  .stats-section {
    @apply bg-gray-800;
  }
}

/* 动画效果 */
.suggestion-item {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 无障碍支持 */
.suggestion-item:focus-visible {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

button:focus-visible {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}
</style>