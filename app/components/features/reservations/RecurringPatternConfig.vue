<template>
  <div class="recurring-pattern-config">
    <div class="space-y-6">
      <!-- 重复开关 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="pi pi-calendar text-2xl text-blue-500"></i>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">重复会议设置</h3>
            <p class="text-sm text-gray-600">设置会议的重复模式和规则</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <ToggleSwitch
            v-model="isRecurring"
            @change="handleRecurringToggle"
          />
          <span class="text-sm font-medium" :class="{ 'text-blue-600': isRecurring }">
            {{ isRecurring ? '开启重复' : '单次会议' }}
          </span>
        </div>
      </div>

      <!-- 重复配置表单 -->
      <div v-if="isRecurring" class="recurring-form space-y-6 bg-gray-50 p-6 rounded-lg">
        <!-- 重复频率 -->
        <div class="field-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            重复频率 <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              v-for="freq in frequencyOptions"
              :key="freq.value"
              :label="freq.label"
              :variant="pattern.frequency === freq.value ? 'solid' : 'outlined'"
              :class="{ 'p-button-primary': pattern.frequency === freq.value }"
              @click="setFrequency(freq.value)"
            />
          </div>
        </div>

        <!-- 重复间隔 -->
        <div class="field-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            重复间隔
          </label>
          <div class="flex items-center gap-4">
            <InputNumber
              v-model="pattern.interval"
              :min="1"
              :max="frequencyMaxInterval[pattern.frequency]"
              placeholder="间隔数"
              class="w-32"
            />
            <span class="text-gray-600">{{ frequencyUnitText }}</span>
          </div>
          <small class="text-gray-500">每{{ frequencyUnitText }}重复一次</small>
        </div>

        <!-- 每周重复的具体星期 -->
        <div v-if="pattern.frequency === 'weekly'" class="field-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            选择星期
          </label>
          <div class="flex gap-2 flex-wrap">
            <Button
              v-for="day in weekDays"
              :key="day.value"
              :label="day.label"
              size="small"
              :variant="pattern.daysOfWeek?.includes(day.value) ? 'solid' : 'outlined'"
              :class="{ 'p-button-primary': pattern.daysOfWeek?.includes(day.value) }"
              @click="toggleWeekDay(day.value)"
            />
          </div>
        </div>

        <!-- 每月重复的具体日期 -->
        <div v-if="pattern.frequency === 'monthly'" class="field-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            重复方式
          </label>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <RadioButton
                v-model="monthlyType"
                inputId="by-date"
                name="monthly-type"
                value="date"
              />
              <label for="by-date" class="cursor-pointer">
                按日期
              </label>
              <InputNumber
                v-model="pattern.dayOfMonth"
                :min="1"
                :max="31"
                placeholder="日期"
                class="w-20"
                :disabled="monthlyType !== 'date'"
              />
              <span class="text-gray-600">号</span>
            </div>
            <div class="flex items-center gap-3">
              <RadioButton
                v-model="monthlyType"
                inputId="by-week"
                name="monthly-type"
                value="week"
              />
              <label for="by-week" class="cursor-pointer">
                按星期
              </label>
              <Dropdown
                v-model="pattern.weekOfMonth"
                :options="weekOfMonthOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="第几周"
                class="w-24"
                :disabled="monthlyType !== 'week'"
              />
              <Dropdown
                v-model="pattern.dayOfWeek"
                :options="weekDays"
                optionLabel="label"
                optionValue="value"
                placeholder="星期几"
                class="w-24"
                :disabled="monthlyType !== 'week'"
              />
            </div>
          </div>
        </div>

        <!-- 结束条件 -->
        <div class="field-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            结束条件 <span class="text-red-500">*</span>
          </label>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <RadioButton
                v-model="endCondition"
                inputId="end-never"
                name="end-condition"
                value="never"
              />
              <label for="end-never" class="cursor-pointer">
                永不结束
              </label>
            </div>
            <div class="flex items-center gap-3">
              <RadioButton
                v-model="endCondition"
                inputId="end-count"
                name="end-condition"
                value="count"
              />
              <label for="end-count" class="cursor-pointer">
                按次数结束
              </label>
              <InputNumber
                v-model="pattern.endOccurrences"
                :min="1"
                :max="100"
                placeholder="次数"
                class="w-24"
                :disabled="endCondition !== 'count'"
              />
              <span class="text-gray-600">次</span>
            </div>
            <div class="flex items-center gap-3">
              <RadioButton
                v-model="endCondition"
                inputId="end-date"
                name="end-condition"
                value="date"
              />
              <label for="end-date" class="cursor-pointer">
                按日期结束
              </label>
              <Calendar
                v-model="pattern.endDate"
                :minDate="new Date()"
                placeholder="结束日期"
                class="w-40"
                :disabled="endCondition !== 'date'"
                dateFormat="yy-mm-dd"
              />
            </div>
          </div>
        </div>

        <!-- 特殊日期处理 -->
        <div class="field-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            特殊日期处理
          </label>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <Checkbox
                v-model="pattern.skipHolidays"
                inputId="skip-holidays"
                binary
              />
              <label for="skip-holidays" class="cursor-pointer">
                跳过节假日
              </label>
            </div>
            <div class="flex items-center gap-3">
              <Checkbox
                v-model="pattern.skipWeekends"
                inputId="skip-weekends"
                binary
              />
              <label for="skip-weekends" class="cursor-pointer">
                跳过周末（周六、周日）
              </label>
            </div>
            <div v-if="pattern.skipHolidays || pattern.skipWeekends" class="mt-3">
              <Dropdown
                v-model="pattern.exceptionHandling"
                :options="exceptionHandlingOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="冲突处理方式"
                class="w-48"
              />
              <small class="text-gray-500 ml-2">
                遇到冲突时的处理方式
              </small>
            </div>
          </div>
        </div>

        <!-- 例外日期 -->
        <div class="field-group">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">
              例外日期
            </label>
            <Button
              label="添加例外"
              icon="pi pi-plus"
              size="small"
              variant="outlined"
              @click="addException"
            />
          </div>
          <div v-if="pattern.exceptions && pattern.exceptions.length > 0" class="space-y-2">
            <div
              v-for="(exception, index) in pattern.exceptions"
              :key="index"
              class="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
            >
              <div class="flex items-center gap-3">
                <i class="pi pi-calendar-times text-red-500"></i>
                <span>{{ formatDate(exception) }}</span>
                <small class="text-gray-500">{{ getExceptionDescription(exception) }}</small>
              </div>
              <Button
                icon="pi pi-trash"
                size="small"
                variant="text"
                severity="danger"
                @click="removeException(index)"
              />
            </div>
          </div>
          <div v-else class="text-center py-4 text-gray-500 bg-white rounded border border-dashed border-gray-300">
            暂无例外日期
          </div>
        </div>
      </div>

      <!-- 重复预览 -->
      <div v-if="isRecurring && previewDates.length > 0" class="preview-section">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-md font-semibold text-gray-900">
            <i class="pi pi-eye mr-2"></i>
            重复预览
          </h4>
          <div class="flex items-center gap-2">
            <small class="text-gray-500">显示前{{ previewDates.length }}次</small>
            <Button
              icon="pi pi-refresh"
              size="small"
              variant="text"
              @click="generatePreview"
              v-tooltip="'刷新预览'"
            />
          </div>
        </div>
        <div class="preview-dates">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div
              v-for="(date, index) in previewDates"
              :key="index"
              class="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm"
            >
              <i class="pi pi-calendar text-blue-500"></i>
              <span>{{ formatDate(date) }}</span>
              <small class="text-gray-500">{{ getDayOfWeek(date) }}</small>
            </div>
          </div>
        </div>
        <div v-if="conflictDates.length > 0" class="mt-3">
          <Message severity="warn" :closable="false">
            <div class="flex items-center gap-2">
              <i class="pi pi-exclamation-triangle"></i>
              <span>检测到 {{ conflictDates.length }} 个时间冲突</span>
              <Button
                label="查看冲突"
                size="small"
                variant="text"
                @click="showConflictDetails"
              />
            </div>
          </Message>
        </div>
      </div>

      <!-- 例外日期选择对话框 -->
      <Dialog
        v-model:visible="exceptionDialogVisible"
        modal
        header="添加例外日期"
        :style="{ width: '400px' }"
      >
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              选择日期
            </label>
            <Calendar
              v-model="newExceptionDate"
              :minDate="new Date()"
              placeholder="选择要例外的日期"
              dateFormat="yy-mm-dd"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              例外原因（可选）
            </label>
            <Textarea
              v-model="newExceptionReason"
              placeholder="请输入例外原因..."
              rows="3"
            />
          </div>
        </div>
        <template #footer>
          <Button
            label="取消"
            icon="pi pi-times"
            variant="text"
            @click="exceptionDialogVisible = false"
          />
          <Button
            label="添加"
            icon="pi pi-check"
            @click="confirmAddException"
          />
        </template>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { format, addDays, addWeeks, addMonths, getDay, startOfMonth, endOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { RecurringPattern } from '../../../../types/meeting'

interface Props {
  initialPattern?: Partial<RecurringPattern>
  startDate?: Date
}

interface Emits {
  (e: 'change', pattern: RecurringPattern): void
  (e: 'conflict-detected', conflicts: Date[]): void
}

const props = withDefaults(defineProps<Props>(), {
  initialPattern: () => ({}),
  startDate: () => new Date()
})

const emit = defineEmits<Emits>()

// 响应式数据
const isRecurring = ref(false)
const monthlyType = ref<'date' | 'week'>('date')
const endCondition = ref<'never' | 'count' | 'date'>('count')

const pattern = reactive<RecurringPattern>({
  frequency: 'weekly',
  interval: 1,
  endDate: undefined,
  endOccurrences: 10,
  daysOfWeek: [1, 2, 3, 4, 5], // 默认工作日
  dayOfMonth: 1,
  weekOfMonth: 1,
  dayOfWeek: 1,
  exceptions: [],
  skipHolidays: true,
  skipWeekends: false,
  exceptionHandling: 'move_next'
})

const previewDates = ref<Date[]>([])
const conflictDates = ref<Date[]>([])

// 例外日期对话框
const exceptionDialogVisible = ref(false)
const newExceptionDate = ref<Date | null>(null)
const newExceptionReason = ref('')

// 配置选项
const frequencyOptions = [
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '每年', value: 'yearly' }
]

const weekDays = [
  { label: '周日', value: 0 },
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 }
]

const weekOfMonthOptions = [
  { label: '第1周', value: 1 },
  { label: '第2周', value: 2 },
  { label: '第3周', value: 3 },
  { label: '第4周', value: 4 },
  { label: '最后一周', value: -1 }
]

const exceptionHandlingOptions = [
  { label: '顺延到下一天', value: 'move_next' },
  { label: '顺延到下一个工作日', value: 'move_next_workday' },
  { label: '跳过该次', value: 'skip' },
  { label: '取消后续会议', value: 'cancel' }
]

// 计算属性
const frequencyUnitText = computed(() => {
  const units = {
    daily: '天',
    weekly: '周',
    monthly: '月',
    yearly: '年'
  }
  return units[pattern.frequency as keyof typeof units]
})

const frequencyMaxInterval = computed(() => {
  const maxIntervals = {
    daily: 30,
    weekly: 12,
    monthly: 6,
    yearly: 10
  }
  return maxIntervals[pattern.frequency as keyof typeof maxIntervals]
})

// 监听器
watch(() => pattern, () => {
  generatePreview()
}, { deep: true })

watch(() => props.startDate, () => {
  generatePreview()
})

// 方法
const handleRecurringToggle = () => {
  if (isRecurring.value) {
    generatePreview()
  } else {
    previewDates.value = []
    conflictDates.value = []
  }
  emitChange()
}

const setFrequency = (frequency: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
  pattern.frequency = frequency

  // 重置相关配置
  if (frequency !== 'weekly') {
    pattern.daysOfWeek = []
  }
  if (frequency !== 'monthly') {
    pattern.dayOfMonth = 1
    pattern.weekOfMonth = 1
    pattern.dayOfWeek = 1
  }

  emitChange()
}

const toggleWeekDay = (dayValue: number) => {
  if (!pattern.daysOfWeek) {
    pattern.daysOfWeek = []
  }

  const index = pattern.daysOfWeek.indexOf(dayValue)
  if (index > -1) {
    pattern.daysOfWeek.splice(index, 1)
  } else {
    pattern.daysOfWeek.push(dayValue)
  }

  emitChange()
}

const generatePreview = () => {
  if (!isRecurring.value || !props.startDate) {
    previewDates.value = []
    conflictDates.value = []
    return
  }

  const dates: Date[] = []
  let currentDate = new Date(props.startDate)
  let count = 0

  const maxPreviewCount = 20 // 最多显示20次
  const maxCount = pattern.endOccurrences || 50
  const endDate = pattern.endDate

  while (count < maxCount && count < maxPreviewCount && (!endDate || currentDate <= endDate)) {
    // 检查是否为例外日期
    if (!isExceptionDate(currentDate)) {
      dates.push(new Date(currentDate))
      count++
    }

    // 计算下一个日期
    switch (pattern.frequency) {
      case 'daily':
        currentDate = addDays(currentDate, pattern.interval)
        break
      case 'weekly':
        currentDate = addWeeks(currentDate, pattern.interval)
        break
      case 'monthly':
        currentDate = addMonths(currentDate, pattern.interval)
        break
      case 'yearly':
        currentDate = new Date(currentDate)
        currentDate.setFullYear(currentDate.getFullYear() + pattern.interval)
        break
    }
  }

  previewDates.value = dates
  checkConflicts()
}

const isExceptionDate = (date: Date): boolean => {
  if (!pattern.exceptions) return false

  return pattern.exceptions.some(exception => {
    return format(date, 'yyyy-MM-dd') === format(exception, 'yyyy-MM-dd')
  })
}

const checkConflicts = () => {
  // 这里可以添加冲突检测逻辑
  // 暂时返回空数组
  conflictDates.value = []

  if (conflictDates.value.length > 0) {
    emit('conflict-detected', conflictDates.value)
  }
}

const addException = () => {
  newExceptionDate.value = null
  newExceptionReason.value = ''
  exceptionDialogVisible.value = true
}

const confirmAddException = () => {
  if (newExceptionDate.value) {
    if (!pattern.exceptions) {
      pattern.exceptions = []
    }
    pattern.exceptions.push(new Date(newExceptionDate.value))
    exceptionDialogVisible.value = false
    generatePreview()
    emitChange()
  }
}

const removeException = (index: number) => {
  if (pattern.exceptions) {
    pattern.exceptions.splice(index, 1)
    generatePreview()
    emitChange()
  }
}

const formatDate = (date: Date): string => {
  return format(date, 'yyyy年MM月dd日', { locale: zhCN })
}

const getDayOfWeek = (date: Date): string => {
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return dayNames[getDay(date)]
}

const getExceptionDescription = (date: Date): string => {
  return '例外日期'
}

const showConflictDetails = () => {
  // 显示冲突详情
  console.log('冲突日期:', conflictDates.value)
}

const emitChange = () => {
  const patternToEmit: RecurringPattern = { ...pattern }

  // 根据结束条件设置相应字段
  if (endCondition.value === 'never') {
    patternToEmit.endDate = undefined
    patternToEmit.endOccurrences = undefined
  } else if (endCondition.value === 'count') {
    patternToEmit.endDate = undefined
  } else if (endCondition.value === 'date') {
    patternToEmit.endOccurrences = undefined
  }

  emit('change', patternToEmit)
}

// 初始化
onMounted(() => {
  if (props.initialPattern) {
    Object.assign(pattern, props.initialPattern)
  }

  // 设置结束条件
  if (props.initialPattern?.endDate) {
    endCondition.value = 'date'
  } else if (props.initialPattern?.endOccurrences) {
    endCondition.value = 'count'
  } else {
    endCondition.value = 'never'
  }

  if (isRecurring.value) {
    generatePreview()
  }
})
</script>

<style scoped>
.recurring-pattern-config {
  @apply space-y-6;
}

.field-group {
  @apply space-y-2;
}

.preview-section {
  @apply bg-blue-50 p-4 rounded-lg border border-blue-200;
}

.preview-dates {
  @apply max-h-60 overflow-y-auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .preview-dates .grid {
    @apply grid-cols-1;
  }

  .frequency-options .grid {
    @apply grid-cols-2;
  }
}
</style>