<template>
  <div class="room-form">
    <form @submit.prevent="handleSubmit">
      <!-- 使用双列布局 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 左列 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">基本信息</h3>

          <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              会议室名称 <span class="text-red-500">*</span>
            </label>
            <InputText
              id="name"
              v-model="formData.name"
              placeholder="请输入会议室名称"
              :class="{ 'p-invalid': errors.name }"
              class="w-full"
            />
            <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
            <small class="text-gray-500">会议室名称不能超过100个字符</small>
          </div>

          <div>
            <label for="capacity" class="block text-sm font-medium text-gray-700 mb-1">
              容量 <span class="text-red-500">*</span>
            </label>
            <InputNumber
              id="capacity"
              v-model="formData.capacity"
              placeholder="请输入容纳人数"
              :class="{ 'p-invalid': errors.capacity }"
              class="w-full"
              :min="1"
              :max="1000"
            />
            <small v-if="errors.capacity" class="p-error">{{ errors.capacity }}</small>
            <small class="text-gray-500">会议室最多容纳人数</small>
          </div>

          <div>
            <label for="location" class="block text-sm font-medium text-gray-700 mb-1">位置</label>
            <InputText
              id="location"
              v-model="formData.location"
              placeholder="请输入会议室位置"
              class="w-full"
            />
            <small class="text-gray-500">如：1楼东区、2楼会议室A</small>
          </div>

          <div>
            <label for="status" class="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <Dropdown
              id="status"
              v-model="formData.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="选择状态"
              class="w-full"
            />
            <small class="text-gray-500">会议室当前状态</small>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <Textarea
              id="description"
              v-model="formData.description"
              placeholder="请输入会议室描述"
              :rows="3"
              class="w-full"
              maxlength="1000"
            />
            <small class="text-gray-500">会议室的详细描述，包括特色、用途等 (最多1000字)</small>
          </div>
          </div>
        </div>

        <!-- 右列 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">设备配置</h3>

          <div class="space-y-4">

            <div class="grid grid-cols-2 gap-4">
              <div class="flex items-center space-x-2">
                <Checkbox
                  inputId="projector"
                  v-model="formData.equipment.projector"
                  name="projector"
                />
                <label for="projector" class="text-sm font-medium text-gray-700">投影仪</label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox
                  inputId="whiteboard"
                  v-model="formData.equipment.whiteboard"
                  name="whiteboard"
                />
                <label for="whiteboard" class="text-sm font-medium text-gray-700">白板</label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox
                  inputId="videoConf"
                  v-model="formData.equipment.videoConf"
                  name="videoConf"
                />
                <label for="videoConf" class="text-sm font-medium text-gray-700">视频会议</label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox
                  inputId="airCondition"
                  v-model="formData.equipment.airCondition"
                  name="airCondition"
                />
                <label for="airCondition" class="text-sm font-medium text-gray-700">空调</label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox
                  inputId="wifi"
                  v-model="formData.equipment.wifi"
                  name="wifi"
                />
                <label for="wifi" class="text-sm font-medium text-gray-700">WiFi</label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox
                  inputId="tv"
                  v-model="formData.equipment.tv"
                  name="tv"
                />
                <label for="tv" class="text-sm font-medium text-gray-700">电视</label>
              </div>
            </div>

          <div>
            <label for="customEquipment" class="block text-sm font-medium text-gray-700 mb-1">其他设备</label>
            <InputText
              id="customEquipment"
              v-model="formData.equipment.customEquipment"
              placeholder="请输入其他设备，用逗号分隔"
              class="w-full"
            />
            <small class="text-gray-500">如：麦克风,音响,投影幕</small>
          </div>

          <!-- 预约规则 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 border-b pb-2 mt-6">预约规则</h3>
            <div class="space-y-4">
              <div class="flex items-center space-x-2">
                <Checkbox
                  inputId="requiresApproval"
                  v-model="formData.requiresApproval"
                  name="requiresApproval"
                />
                <label for="requiresApproval" class="text-sm font-medium text-gray-700">需要审批</label>
                <small class="text-gray-500">启用后，预约该会议室需要管理员审批</small>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="minBookingDuration" class="block text-sm font-medium text-gray-700 mb-1">
                    最短预约时长（分钟）
                  </label>
                  <InputNumber
                    id="minBookingDuration"
                    v-model="formData.rules.minBookingDuration"
                    placeholder="30"
                    class="w-full"
                    :min="0"
                  />
                  <small class="text-gray-500">单次预约的最短时长</small>
                </div>

                <div>
                  <label for="maxBookingDuration" class="block text-sm font-medium text-gray-700 mb-1">
                    最长预约时长（分钟）
                  </label>
                  <InputNumber
                    id="maxBookingDuration"
                    v-model="formData.rules.maxBookingDuration"
                    placeholder="240"
                    class="w-full"
                    :min="0"
                  />
                  <small class="text-gray-500">单次预约的最长时长</small>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="startTime" class="block text-sm font-medium text-gray-700 mb-1">
                    允许预约开始时间
                  </label>
                  <InputText
                    id="startTime"
                    v-model="formData.rules.allowedTimeRange.start"
                    type="time"
                    class="w-full"
                  />
                  <small class="text-gray-500">允许预约的最早时间</small>
                </div>

                <div>
                  <label for="endTime" class="block text-sm font-medium text-gray-700 mb-1">
                    允许预约结束时间
                  </label>
                  <InputText
                    id="endTime"
                    v-model="formData.rules.allowedTimeRange.end"
                    type="time"
                    class="w-full"
                  />
                  <small class="text-gray-500">允许预约的最晚时间</small>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <!-- 按钮组 -->
      <div class="flex justify-end gap-2 mt-8 pt-6 border-t lg:col-span-2">
        <Button
          label="取消"
          @click="handleCancel"
          class="p-button-outlined"
        />
        <Button
          type="submit"
          :label="room ? '更新' : '创建'"
          :loading="isSubmitting"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRooms } from '~/composables/useRooms'
import { useNuxtApp } from '#app'

interface Room {
  id?: string
  name: string
  description?: string
  capacity: number
  location?: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'DISABLED'
  equipment?: any
  rules?: any
  requiresApproval: boolean
}

interface Props {
  room?: Room | null
}

const props = defineProps<Props>()

// 使用会议室 store 和 Toast
const { createRoom, updateRoom } = useRooms()

// 安全地获取 Toast 服务
const nuxtApp = useNuxtApp()
const toast: any = (nuxtApp as any).$toast || {
  add: (options: any) => {
    // Toast 服务的 fallback 实现
    console.log('Toast Message:', options.summary, options.detail)

    // 创建一个简单的 DOM 元素作为 toast 通知
    const toastDiv = document.createElement('div')
    toastDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 300px;
      word-wrap: break-word;
    `

    // 根据类型设置颜色
    switch (options.severity) {
      case 'success':
        toastDiv.style.backgroundColor = '#10b981'
        break
      case 'error':
        toastDiv.style.backgroundColor = '#ef4444'
        break
      case 'warn':
        toastDiv.style.backgroundColor = '#f59e0b'
        break
      case 'info':
        toastDiv.style.backgroundColor = '#3b82f6'
        break
      default:
        toastDiv.style.backgroundColor = '#6b7280'
    }

    toastDiv.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${options.summary || '通知'}</div>
      <div style="font-size: 14px; opacity: 0.9;">${options.detail || ''}</div>
    `

    document.body.appendChild(toastDiv)

    // 自动移除
    const timeout = options.life || 3000
    setTimeout(() => {
      if (toastDiv.parentNode) {
        toastDiv.parentNode.removeChild(toastDiv)
      }
    }, timeout)
  }
}

const emit = defineEmits<{
  save: []
  cancel: []
}>()

// 响应式数据
const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})

// 表单数据
const formData = ref({
  name: '',
  description: '',
  capacity: 1,
  location: '',
  status: 'AVAILABLE',
  equipment: {
    projector: false,
    whiteboard: false,
    videoConf: false,
    airCondition: false,
    wifi: false,
    tv: false,
    customEquipment: ''
  },
  rules: {
    minBookingDuration: null,
    maxBookingDuration: null,
    allowedTimeRange: {
      start: '',
      end: ''
    }
  },
  requiresApproval: false
})

// 状态选项
const statusOptions = [
  { label: '可用', value: 'AVAILABLE' },
  { label: '使用中', value: 'OCCUPIED' },
  { label: '维护中', value: 'MAINTENANCE' },
  { label: '已预约', value: 'RESERVED' },
  { label: '禁用', value: 'DISABLED' }
]

// 表单验证
const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.name.trim()) {
    errors.value.name = '会议室名称不能为空'
  } else if (formData.value.name.length > 100) {
    errors.value.name = '会议室名称不能超过100个字符'
  }

  if (!formData.value.capacity || formData.value.capacity < 1) {
    errors.value.capacity = '容量必须大于0'
  } else if (formData.value.capacity > 1000) {
    errors.value.capacity = '容量不能超过1000'
  }

  if (formData.value.location && formData.value.location.length > 200) {
    errors.value.location = '位置不能超过200个字符'
  }

  if (formData.value.description && formData.value.description.length > 1000) {
    errors.value.description = '描述不能超过1000个字符'
  }

  return Object.keys(errors.value).length === 0
}

// 方法
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // 处理设备配置
    const equipment: any = {}

    // 确保所有设备字段都是布尔值
    equipment.projector = Boolean(formData.value.equipment.projector)
    equipment.whiteboard = Boolean(formData.value.equipment.whiteboard)
    equipment.videoConf = Boolean(formData.value.equipment.videoConf)
    equipment.airCondition = Boolean(formData.value.equipment.airCondition)
    equipment.wifi = Boolean(formData.value.equipment.wifi)
    equipment.tv = Boolean(formData.value.equipment.tv)

    // 处理自定义设备
    if (formData.value.equipment.customEquipment) {
      equipment.customList = formData.value.equipment.customEquipment
        .split(',')
        .map((item: string) => item.trim())
        .filter((item: string) => item)
    }

    // 处理规则配置
    const rules: any = {}

    // 处理最短预约时长
    if (formData.value.rules.minBookingDuration && formData.value.rules.minBookingDuration > 0) {
      rules.minBookingDuration = formData.value.rules.minBookingDuration
    }

    // 处理最长预约时长
    if (formData.value.rules.maxBookingDuration && formData.value.rules.maxBookingDuration > 0) {
      rules.maxBookingDuration = formData.value.rules.maxBookingDuration
    }

    // 处理时间范围
    if (formData.value.rules.allowedTimeRange) {
      const timeRange: any = {}
      if (formData.value.rules.allowedTimeRange.start && formData.value.rules.allowedTimeRange.start.trim()) {
        timeRange.start = formData.value.rules.allowedTimeRange.start.trim()
      }
      if (formData.value.rules.allowedTimeRange.end && formData.value.rules.allowedTimeRange.end.trim()) {
        timeRange.end = formData.value.rules.allowedTimeRange.end.trim()
      }
      if (Object.keys(timeRange).length > 0) {
        rules.allowedTimeRange = timeRange
      }
    }

    const submitData = {
      name: formData.value.name.trim(),
      description: formData.value.description?.trim() || undefined,
      capacity: formData.value.capacity,
      location: formData.value.location?.trim() || undefined,
      status: formData.value.status as 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'DISABLED',
      equipment: Object.keys(equipment).length > 0 ? equipment : undefined,
      rules: Object.keys(rules).length > 0 ? rules : undefined,
      requiresApproval: formData.value.requiresApproval
    }

    if (props.room?.id) {
      // 更新会议室
      await updateRoom(props.room.id, submitData)

      toast.add({
        severity: 'success',
        summary: '更新成功',
        detail: `会议室 ${submitData.name} 已更新`,
        life: 3000
      })
    } else {
      // 创建会议室
      await createRoom(submitData)

      toast.add({
        severity: 'success',
        summary: '创建成功',
        detail: `会议室 ${submitData.name} 已创建`,
        life: 3000
      })
    }

    // 确保弹窗关闭
    setTimeout(() => {
      emit('save')
    }, 100)
  } catch (error) {
    console.error('保存会议室失败:', error)

    // 使用友好的错误处理工具
    const { parseApiError } = await import('~/utils/api-error-handler')
    const errorMessage = parseApiError(error)

    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: errorMessage,
      life: 5000 // 增加显示时间，让用户有足够时间阅读详细错误
    })
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// 初始化表单数据
const initializeFormData = () => {
  if (props.room) {
    const room = props.room

    // 基本信息初始化
    formData.value.name = room.name || ''
    formData.value.description = room.description || ''
    formData.value.capacity = room.capacity || 1
    formData.value.location = room.location || ''
    formData.value.status = room.status || 'AVAILABLE'
    formData.value.requiresApproval = room.requiresApproval || false

    // 设备配置初始化
    if (room.equipment) {
      formData.value.equipment = {
        projector: room.equipment.projector || false,
        whiteboard: room.equipment.whiteboard || false,
        videoConf: room.equipment.videoConf || false,
        airCondition: room.equipment.airCondition || false,
        wifi: room.equipment.wifi || false,
        tv: room.equipment.tv || false,
        customEquipment: room.equipment.customList ?
          room.equipment.customList.join(', ') : ''
      }
    }

    // 规则配置初始化
    if (room.rules) {
      formData.value.rules = {
        minBookingDuration: room.rules.minBookingDuration || null,
        maxBookingDuration: room.rules.maxBookingDuration || null,
        allowedTimeRange: room.rules.allowedTimeRange || {
          start: '',
          end: ''
        }
      }
    }
  }
}

// 监听props变化
watch(() => props.room, () => {
  initializeFormData()
}, { immediate: true })
</script>

<style scoped>
.room-form {
  max-width: 100%;
}

.grid {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:col-span-2 {
    grid-column: span 2 / span 2;
  }

  .lg\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-4 > * {
  margin-top: 0;
}

.mt-6 {
  margin-top: 1.5rem;
}

.mt-8 {
  margin-top: 2rem;
}

.pt-6 {
  padding-top: 1.5rem;
}

.border-b {
  border-bottom: 1px solid #e5e7eb;
}

.pb-2 {
  padding-bottom: 0.5rem;
}

.border-t {
  border-top: 1px solid #e5e7eb;
}

.flex {
  display: flex;
}

.justify-end {
  justify-content: flex-end;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.items-center {
  align-items: center;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}

.space-x-2 > * {
  margin-left: 0;
}

.block {
  display: block;
}

.w-full {
  width: 100%;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-700 {
  color: #374151;
}

.text-gray-800 {
  color: #1f2937;
}

.text-red-500 {
  color: #ef4444;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.p-error {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>