<template>
  <div class="recurring-reservation-wizard">
    <Dialog
      v-model:visible="visible"
      modal
      :style="{ width: '90vw', maxWidth: '800px' }"
      :header="isEditMode ? '编辑周期性预约' : '创建周期性预约'"
      :closable="!loading"
    >
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- 步骤指示器 -->
        <Steps :model="currentStep" :readonly="loading">
          <StepItem header="基本信息" />
          <StepItem header="重复设置" />
          <StepItem header="结束条件" />
          <StepItem header="其他选项" />
          <StepItem header="确认创建" />
        </Steps>

        <!-- 步骤 1: 基本信息 -->
        <div v-if="currentStep === 0" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="title" class="block text-sm font-medium mb-2">
                会议标题 <span class="text-red-500">*</span>
              </label>
              <InputText
                id="title"
                v-model="formData.title"
                placeholder="请输入会议标题"
                :class="{ 'p-invalid': errors.title }"
                :disabled="loading"
              />
              <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
            </div>

            <div class="field">
              <label for="roomId" class="block text-sm font-medium mb-2">
                会议室 <span class="text-red-500">*</span>
              </label>
              <Dropdown
                id="roomId"
                v-model="formData.roomId"
                :options="roomOptions"
                option-label="label"
                option-value="value"
                placeholder="选择会议室"
                :class="{ 'p-invalid': errors.roomId }"
                :disabled="loading"
                filter
              />
              <small v-if="errors.roomId" class="text-red-500">{{ errors.roomId }}</small>
            </div>
          </div>

          <div class="field">
            <label for="description" class="block text-sm font-medium mb-2">
              会议描述
            </label>
            <Textarea
              id="description"
              v-model="formData.description"
              placeholder="请输入会议描述（可选）"
              rows="3"
              :disabled="loading"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="startTime" class="block text-sm font-medium mb-2">
                开始时间 <span class="text-red-500">*</span>
              </label>
              <Calendar
                id="startTime"
                v-model="formData.startTime"
                :show-time="true"
                :manual-input="false"
                placeholder="选择开始时间"
                :class="{ 'p-invalid': errors.startTime }"
                :disabled="loading"
              />
              <small v-if="errors.startTime" class="text-red-500">{{ errors.startTime }}</small>
            </div>

            <div class="field">
              <label for="endTime" class="block text-sm font-medium mb-2">
                结束时间 <span class="text-red-500">*</span>
              </label>
              <Calendar
                id="endTime"
                v-model="formData.endTime"
                :show-time="true"
                :manual-input="false"
                placeholder="选择结束时间"
                :class="{ 'p-invalid': errors.endTime }"
                :disabled="loading"
              />
              <small v-if="errors.endTime" class="text-red-500">{{ errors.endTime }}</small>
            </div>
          </div>
        </div>

        <!-- 步骤 2: 重复设置 -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="field">
            <label class="block text-sm font-medium mb-2">
              重复模式 <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Button
                v-for="pattern in recurrencePatterns"
                :key="pattern.type"
                :label="pattern.label"
                :severity="formData.pattern.type === pattern.type ? 'primary' : 'secondary'"
                :outlined="formData.pattern.type !== pattern.type"
                @click="selectRecurrencePattern(pattern.type)"
                :disabled="loading"
                class="w-full"
              />
            </div>
          </div>

          <div class="field">
            <label for="interval" class="block text-sm font-medium mb-2">
              重复间隔
            </label>
            <div class="flex items-center gap-2">
              <InputNumber
                id="interval"
                v-model="formData.pattern.interval"
                :min="1"
                :max="999"
                :disabled="loading"
              />
              <span>{{ getIntervalLabel() }}</span>
            </div>
          </div>

          <!-- 每周重复设置 -->
          <div v-if="formData.pattern.type === 'weekly'" class="field">
            <label class="block text-sm font-medium mb-2">
              重复日期
            </label>
            <div class="grid grid-cols-7 gap-2">
              <div
                v-for="day in weekDays"
                :key="day.value"
                class="text-center"
              >
                <Button
                  :label="day.label"
                  :severity="formData.pattern.weekDays?.includes(day.value) ? 'primary' : 'secondary'"
                  :outlined="!formData.pattern.weekDays?.includes(day.value)"
                  @click="toggleWeekDay(day.value)"
                  :disabled="loading"
                  class="w-full"
                  size="small"
                />
              </div>
            </div>
          </div>

          <!-- 每月重复设置 -->
          <div v-if="formData.pattern.type === 'monthly'" class="field">
            <label class="block text-sm font-medium mb-2">
              每月重复方式
            </label>
            <div class="flex gap-4">
              <div class="flex items-center gap-2">
                <RadioButton
                  v-model="monthlyPatternType"
                  input-id="monthly-date"
                  value="date"
                  :disabled="loading"
                />
                <label for="monthly-date">按日期</label>
              </div>
              <div class="flex items-center gap-2">
                <RadioButton
                  v-model="monthlyPatternType"
                  input-id="monthly-weekday"
                  value="weekday"
                  :disabled="loading"
                />
                <label for="monthly-weekday">按星期</label>
              </div>
            </div>

            <div v-if="monthlyPatternType === 'date'" class="mt-2">
              <InputNumber
                v-model="formData.pattern.monthlyDate"
                :min="1"
                :max="31"
                placeholder="每月第几天"
                :disabled="loading"
              />
            </div>

            <div v-if="monthlyPatternType === 'weekday'" class="mt-2 grid grid-cols-2 gap-2">
              <Dropdown
                v-model="formData.pattern.monthlyWeek"
                :options="monthlyWeekOptions"
                option-label="label"
                option-value="value"
                placeholder="第几周"
                :disabled="loading"
              />
              <Dropdown
                v-model="formData.pattern.monthlyWeekDay"
                :options="weekDays"
                option-label="label"
                option-value="value"
                placeholder="星期几"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- 预览 -->
          <div class="field">
            <label class="block text-sm font-medium mb-2">
              重复预览
            </label>
            <div class="bg-gray-50 p-3 rounded border">
              <p class="text-sm text-gray-600">{{ getRecurrenceDescription() }}</p>
            </div>
          </div>
        </div>

        <!-- 步骤 3: 结束条件 -->
        <div v-if="currentStep === 2" class="space-y-4">
          <div class="field">
            <label class="block text-sm font-medium mb-2">
              结束条件 <span class="text-red-500">*</span>
            </label>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <RadioButton
                  v-model="formData.pattern.endCondition"
                  input-id="end-never"
                  value="never"
                  :disabled="loading"
                />
                <label for="end-never">永不结束</label>
              </div>
              <div class="flex items-center gap-2">
                <RadioButton
                  v-model="formData.pattern.endCondition"
                  input-id="end-date"
                  value="date"
                  :disabled="loading"
                />
                <label for="end-date">在指定日期结束</label>
              </div>
              <div v-if="formData.pattern.endCondition === 'date'" class="ml-6 mt-2">
                <Calendar
                  v-model="formData.pattern.endDate"
                  :manual-input="false"
                  placeholder="选择结束日期"
                  :class="{ 'p-invalid': errors.endDate }"
                  :disabled="loading"
                />
                <small v-if="errors.endDate" class="text-red-500">{{ errors.endDate }}</small>
              </div>
              <div class="flex items-center gap-2">
                <RadioButton
                  v-model="formData.pattern.endCondition"
                  input-id="end-count"
                  value="count"
                  :disabled="loading"
                />
                <label for="end-count">在指定次数后结束</label>
              </div>
              <div v-if="formData.pattern.endCondition === 'count'" class="ml-6 mt-2">
                <InputNumber
                  v-model="formData.pattern.endCount"
                  :min="1"
                  :max="999"
                  placeholder="重复次数"
                  :class="{ 'p-invalid': errors.endCount }"
                  :disabled="loading"
                />
                <small v-if="errors.endCount" class="text-red-500">{{ errors.endCount }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤 4: 其他选项 -->
        <div v-if="currentStep === 3" class="space-y-4">
          <div class="field">
            <label for="timezone" class="block text-sm font-medium mb-2">
              时区
            </label>
            <Dropdown
              id="timezone"
              v-model="formData.timezone"
              :options="timezoneOptions"
              option-label="label"
              option-value="value"
              placeholder="选择时区"
              :disabled="loading"
            />
          </div>

          <div class="field">
            <div class="flex items-center gap-2">
              <Checkbox
                v-model="formData.skipHolidays"
                input-id="skip-holidays"
                :disabled="loading"
              />
              <label for="skip-holidays">跳过节假日</label>
            </div>
          </div>

          <div v-if="formData.skipHolidays" class="field">
            <label for="holidayRegion" class="block text-sm font-medium mb-2">
              节假日地区
            </label>
            <Dropdown
              id="holidayRegion"
              v-model="formData.holidayRegion"
              :options="holidayRegionOptions"
              option-label="label"
              option-value="value"
              placeholder="选择节假日地区"
              :disabled="loading"
            />
          </div>

          <div class="field">
            <label for="bufferMinutes" class="block text-sm font-medium mb-2">
              缓冲时间（分钟）
            </label>
            <InputNumber
              id="bufferMinutes"
              v-model="formData.bufferMinutes"
              :min="0"
              :max="120"
              placeholder="会议前后缓冲时间"
              :disabled="loading"
            />
          </div>

          <div class="field">
            <label for="maxBookingAhead" class="block text-sm font-medium mb-2">
              最大提前预约天数
            </label>
            <InputNumber
              id="maxBookingAhead"
              v-model="formData.maxBookingAhead"
              :min="1"
              :max="1095"
              placeholder="最多提前多少天预约"
              :disabled="loading"
            />
          </div>

          <div class="field">
            <label for="notes" class="block text-sm font-medium mb-2">
              备注
            </label>
            <Textarea
              id="notes"
              v-model="formData.notes"
              placeholder="添加备注信息（可选）"
              rows="3"
              :disabled="loading"
            />
          </div>
        </div>

        <!-- 步骤 5: 确认信息 -->
        <div v-if="currentStep === 4" class="space-y-4">
          <div class="bg-blue-50 p-4 rounded border">
            <h3 class="text-lg font-semibold mb-3">预约信息确认</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>会议标题：</strong>{{ formData.title }}</p>
                <p><strong>会议室：</strong>{{ getRoomName() }}</p>
                <p><strong>开始时间：</strong>{{ formatDateTime(formData.startTime) }}</p>
                <p><strong>结束时间：</strong>{{ formatDateTime(formData.endTime) }}</p>
              </div>
              <div>
                <p><strong>重复设置：</strong>{{ getRecurrenceDescription() }}</p>
                <p><strong>结束条件：</strong>{{ getEndConditionDescription() }}</p>
                <p><strong>时区：</strong>{{ formData.timezone }}</p>
                <p><strong>跳过节假日：</strong>{{ formData.skipHolidays ? '是' : '否' }}</p>
              </div>
            </div>
            <div v-if="formData.description" class="mt-3">
              <p><strong>会议描述：</strong>{{ formData.description }}</p>
            </div>
            <div v-if="formData.notes" class="mt-3">
              <p><strong>备注：</strong>{{ formData.notes }}</p>
            </div>
          </div>

          <div class="field">
            <div class="flex items-center gap-2">
              <Checkbox
                v-model="formData.checkConflicts"
                input-id="check-conflicts"
                :disabled="loading"
              />
              <label for="check-conflicts">创建前检查时间冲突</label>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-between mt-6">
          <Button
            label="上一步"
            icon="pi pi-arrow-left"
            severity="secondary"
            @click="prevStep"
            :disabled="currentStep === 0 || loading"
          />

          <div class="flex gap-2">
            <Button
              label="取消"
              severity="secondary"
              @click="handleCancel"
              :disabled="loading"
            />
            <Button
              v-if="currentStep < 4"
              label="下一步"
              icon="pi pi-arrow-right"
              @click="nextStep"
              :disabled="!isCurrentStepValid() || loading"
            />
            <Button
              v-else
              :label="isEditMode ? '更新预约' : '创建预约'"
              type="submit"
              icon="pi pi-check"
              :loading="loading"
            />
          </div>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRecurringReservations } from '~/composables/useRecurringReservations'
import { useRooms } from '~/composables/useRooms'
import type { CreateRecurringReservationRequest, RecurrencePattern } from '~/composables/useRecurringReservations'
import type { MeetingRoom } from '~/types/models'

interface Props {
  visible: boolean
  editMode?: boolean
  reservation?: any // 编辑时的预约数据
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'created', reservation: any): void
  (e: 'updated', reservation: any): void
}

const props = withDefaults(defineProps<Props>(), {
  editMode: false,
  reservation: null
})

const emit = defineEmits<Emits>()

// 组合式函数
const { createRecurringReservation, updateRecurringReservation } = useRecurringReservations()
const { rooms } = useRooms()

// 状态
const currentStep = ref(0)
const loading = ref(false)
const errors = ref<Record<string, string>>({})

// 表单数据
const formData = reactive<CreateRecurringReservationRequest>({
  title: '',
  description: '',
  roomId: '',
  startTime: new Date(),
  endTime: new Date(),
  pattern: {
    type: 'weekly',
    interval: 1,
    weekDays: ['MO', 'TU', 'WE', 'TH', 'FR'],
    monthlyPattern: 'date',
    monthlyDate: 1,
    monthlyWeek: 1,
    monthlyWeekDay: 'MO',
    endCondition: 'never',
    skipHolidays: true,
    holidayRegion: 'CN'
  },
  timezone: 'Asia/Shanghai',
  skipHolidays: true,
  holidayRegion: 'CN',
  bufferMinutes: 15,
  maxBookingAhead: 365,
  notes: '',
  generateInstances: true,
  checkConflicts: true
})

// 月度重复模式
const monthlyPatternType = ref('date')

// 重复模式选项
const recurrencePatterns = [
  { type: 'daily', label: '每日' },
  { type: 'weekly', label: '每周' },
  { type: 'monthly', label: '每月' },
  { type: 'yearly', label: '每年' }
]

// 星期选项
const weekDays = [
  { label: '日', value: 'SU' },
  { label: '一', value: 'MO' },
  { label: '二', value: 'TU' },
  { label: '三', value: 'WE' },
  { label: '四', value: 'TH' },
  { label: '五', value: 'FR' },
  { label: '六', value: 'SA' }
]

// 月度第几周选项
const monthlyWeekOptions = [
  { label: '第一周', value: 1 },
  { label: '第二周', value: 2 },
  { label: '第三周', value: 3 },
  { label: '第四周', value: 4 },
  { label: '第五周', value: 5 }
]

// 时区选项
const timezoneOptions = [
  { label: '北京时间 (GMT+8)', value: 'Asia/Shanghai' },
  { label: '东京时间 (GMT+9)', value: 'Asia/Tokyo' },
  { label: 'UTC (GMT+0)', value: 'UTC' },
  { label: '美国东部时间 (GMT-5)', value: 'America/New_York' },
  { label: '美国西部时间 (GMT-8)', value: 'America/Los_Angeles' }
]

// 节假日地区选项
const holidayRegionOptions = [
  { label: '中国', value: 'CN' },
  { label: '美国', value: 'US' },
  { label: '欧盟', value: 'EU' },
  { label: '日本', value: 'JP' }
]

// 计算属性
const roomOptions = computed(() => {
  return rooms.value.map(room => ({
    label: `${room.name} (${room.location})`,
    value: room.id
  }))
})

const isEditMode = computed(() => props.editMode)

// 监听visible变化
watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
    if (props.editMode && props.reservation) {
      loadEditData()
    }
    currentStep.value = 0
    errors.value = {}
  }
})

// 监听月度重复模式变化
watch(monthlyPatternType, (value) => {
  if (value === 'date') {
    delete formData.pattern.monthlyWeek
    delete formData.pattern.monthlyWeekDay
  } else {
    delete formData.pattern.monthlyDate
    formData.pattern.monthlyWeek = 1
    formData.pattern.monthlyWeekDay = 'MO'
  }
})

// 监听重复模式变化
watch(() => formData.pattern.type, (type) => {
  if (type === 'weekly') {
    if (!formData.pattern.weekDays || formData.pattern.weekDays.length === 0) {
      formData.pattern.weekDays = ['MO', 'TU', 'WE', 'TH', 'FR']
    }
  }
})

// 方法
const selectRecurrencePattern = (type: string) => {
  formData.pattern.type = type as RecurrencePattern['type']
}

const toggleWeekDay = (day: string) => {
  if (!formData.pattern.weekDays) {
    formData.pattern.weekDays = []
  }
  const index = formData.pattern.weekDays.indexOf(day)
  if (index > -1) {
    formData.pattern.weekDays.splice(index, 1)
  } else {
    formData.pattern.weekDays.push(day)
  }
}

const getIntervalLabel = () => {
  const labels: Record<string, string> = {
    daily: '天',
    weekly: '周',
    monthly: '月',
    yearly: '年'
  }
  return labels[formData.pattern.type] || ''
}

const getRecurrenceDescription = () => {
  const { pattern } = formData
  let description = `每${pattern.interval}${getIntervalLabel()}`

  if (pattern.type === 'weekly' && pattern.weekDays && pattern.weekDays.length > 0) {
    const dayNames = pattern.weekDays.map(day => {
      const dayObj = weekDays.find(d => d.value === day)
      return dayObj?.label || ''
    }).filter(Boolean)
    description += ` (${dayNames.join('、')})`
  }

  if (pattern.type === 'monthly') {
    if (pattern.monthlyPattern === 'date' && pattern.monthlyDate) {
      description += `，每月${pattern.monthlyDate}日`
    } else if (pattern.monthlyPattern === 'weekday' && pattern.monthlyWeek && pattern.monthlyWeekDay) {
      const weekLabel = monthlyWeekOptions.find(w => w.value === pattern.monthlyWeek)?.label
      const dayLabel = weekDays.find(d => d.value === pattern.monthlyWeekDay)?.label
      description += `，每月${weekLabel}的${dayLabel}`
    }
  }

  return description
}

const getEndConditionDescription = () => {
  const { pattern } = formData
  switch (pattern.endCondition) {
    case 'never':
      return '永不结束'
    case 'date':
      return pattern.endDate ? `在 ${pattern.endDate.toLocaleDateString()} 结束` : '未设置结束日期'
    case 'count':
      return pattern.endCount ? `重复 ${pattern.endCount} 次后结束` : '未设置结束次数'
    default:
      return '未设置'
  }
}

const getRoomName = () => {
  const room = rooms.value.find(r => r.id === formData.roomId)
  return room ? `${room.name} (${room.location})` : ''
}

const formatDateTime = (date: Date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const validateStep = (step: number): boolean => {
  errors.value = {}

  switch (step) {
    case 0:
      if (!formData.title.trim()) {
        errors.value.title = '请输入会议标题'
        return false
      }
      if (!formData.roomId) {
        errors.value.roomId = '请选择会议室'
        return false
      }
      if (!formData.startTime || !(formData.startTime instanceof Date)) {
        errors.value.startTime = '请选择开始时间'
        return false
      }
      if (!formData.endTime || !(formData.endTime instanceof Date)) {
        errors.value.endTime = '请选择结束时间'
        return false
      }
      if (formData.endTime <= formData.startTime) {
        errors.value.endTime = '结束时间必须晚于开始时间'
        return false
      }
      break

    case 1:
      if (!formData.pattern.weekDays || formData.pattern.weekDays.length === 0) {
        if (formData.pattern.type === 'weekly') {
          errors.value.weekDays = '请选择重复日期'
          return false
        }
      }
      if (formData.pattern.type === 'monthly') {
        if (monthlyPatternType.value === 'date' && !formData.pattern.monthlyDate) {
          errors.value.monthlyDate = '请选择每月日期'
          return false
        }
        if (monthlyPatternType.value === 'weekday' && (!formData.pattern.monthlyWeek || !formData.pattern.monthlyWeekDay)) {
          errors.value.monthlyWeekday = '请选择每月星期设置'
          return false
        }
      }
      break

    case 2:
      if (formData.pattern.endCondition === 'date' && !formData.pattern.endDate) {
        errors.value.endDate = '请选择结束日期'
        return false
      }
      if (formData.pattern.endCondition === 'count' && !formData.pattern.endCount) {
        errors.value.endCount = '请输入重复次数'
        return false
      }
      break
  }

  return true
}

const isCurrentStepValid = computed(() => {
  return validateStep(currentStep.value)
})

const nextStep = () => {
  if (isCurrentStepValid.value && currentStep.value < 4) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const handleSubmit = async () => {
  if (!validateStep(4)) {
    return
  }

  loading.value = true
  errors.value = {}

  try {
    let result
    if (isEditMode.value && props.reservation) {
      result = await updateRecurringReservation(props.reservation.id, formData)
      emit('updated', result)
    } else {
      result = await createRecurringReservation(formData)
      emit('created', result)
    }

    emit('update:visible', false)
  } catch (error: any) {
    console.error('提交失败:', error)
    // 这里可以显示错误消息
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}

const resetForm = () => {
  Object.assign(formData, {
    title: '',
    description: '',
    roomId: '',
    startTime: new Date(),
    endTime: new Date(),
    pattern: {
      type: 'weekly',
      interval: 1,
      weekDays: ['MO', 'TU', 'WE', 'TH', 'FR'],
      monthlyPattern: 'date',
      monthlyDate: 1,
      monthlyWeek: 1,
      monthlyWeekDay: 'MO',
      endCondition: 'never',
      skipHolidays: true,
      holidayRegion: 'CN'
    },
    timezone: 'Asia/Shanghai',
    skipHolidays: true,
    holidayRegion: 'CN',
    bufferMinutes: 15,
    maxBookingAhead: 365,
    notes: '',
    generateInstances: true,
    checkConflicts: true
  })
  monthlyPatternType.value = 'date'
}

const loadEditData = () => {
  if (!props.reservation) return

  // 加载编辑数据到表单
  Object.assign(formData, {
    title: props.reservation.title,
    description: props.reservation.description,
    roomId: props.reservation.roomId,
    startTime: new Date(props.reservation.startTime),
    endTime: new Date(props.reservation.endTime),
    timezone: props.reservation.timezone,
    skipHolidays: props.reservation.skipHolidays,
    holidayRegion: props.reservation.holidayRegion,
    bufferMinutes: props.reservation.bufferMinutes,
    maxBookingAhead: props.reservation.maxBookingAhead,
    notes: props.reservation.notes
  })

  // 这里需要解析recurrenceRule来设置pattern
  // 简化处理，实际应该使用rrule库解析
  if (props.reservation.recurrenceRule) {
    // TODO: 解析RRule字符串
  }
}
</script>

<style scoped>
.recurring-reservation-wizard {
  /* 组件样式 */
}

.field {
  @apply space-y-1;
}

.p-invalid {
  @apply border-red-500;
}
</style>