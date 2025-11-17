<template>
  <div class="room-form">
    <FormKit
      type="form"
      :id="formId"
      v-model="formData"
      :config="{
        validationVisibility: 'submit'
      }"
      @submit="handleSubmit"
    >
      <!-- 基本信息 -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">基本信息</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormKit
            type="text"
            name="name"
            label="会议室名称 *"
            validation="required|length:1,100"
            placeholder="请输入会议室名称"
            help-text="会议室名称不能超过100个字符"
          />

          <FormKit
            type="number"
            name="capacity"
            label="容量 *"
            validation="required|number|min:1|max:1000"
            placeholder="请输入容纳人数"
            help-text="会议室最多容纳人数"
          />

          <FormKit
            type="text"
            name="location"
            label="位置"
            validation="length:0,200"
            placeholder="请输入会议室位置"
            help-text="如：1楼东区、2楼会议室A"
          />

          <FormKit
            type="select"
            name="status"
            label="状态"
            :options="statusOptions"
            help-text="会议室当前状态"
          />
        </div>

        <FormKit
          type="textarea"
          name="description"
          label="描述"
          validation="length:0,1000"
          placeholder="请输入会议室描述"
          :rows="3"
          help-text="会议室的详细描述，包括特色、用途等"
        />
      </div>

      <!-- 设备配置 -->
      <div class="space-y-4 mt-6">
        <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">设备配置</h3>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormKit
            type="checkbox"
            name="equipment.projector"
            label="投影仪"
          />

          <FormKit
            type="checkbox"
            name="equipment.whiteboard"
            label="白板"
          />

          <FormKit
            type="checkbox"
            name="equipment.videoConf"
            label="视频会议"
          />

          <FormKit
            type="checkbox"
            name="equipment.airCondition"
            label="空调"
          />

          <FormKit
            type="checkbox"
            name="equipment.wifi"
            label="WiFi"
          />

          <FormKit
            type="checkbox"
            name="equipment.tv"
            label="电视"
          />
        </div>

        <FormKit
          type="text"
          name="equipment.customEquipment"
          label="其他设备"
          placeholder="请输入其他设备，用逗号分隔"
          help-text="如：麦克风,音响,投影幕"
        />
      </div>

      <!-- 预约规则 -->
      <div class="space-y-4 mt-6">
        <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">预约规则</h3>

        <FormKit
          type="checkbox"
          name="requiresApproval"
          label="需要审批"
          help-text="启用后，预约该会议室需要管理员审批"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormKit
            type="number"
            name="rules.minBookingDuration"
            label="最短预约时长（分钟）"
            validation="number|min:0"
            placeholder="30"
            help-text="单次预约的最短时长，留空表示不限制"
          />

          <FormKit
            type="number"
            name="rules.maxBookingDuration"
            label="最长预约时长（分钟）"
            validation="number|min:0"
            placeholder="240"
            help-text="单次预约的最长时长，留空表示不限制"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormKit
            type="time"
            name="rules.allowedTimeRange.start"
            label="允许预约开始时间"
            help-text="允许预约的最早时间"
          />

          <FormKit
            type="time"
            name="rules.allowedTimeRange.end"
            label="允许预约结束时间"
            help-text="允许预约的最晚时间"
          />
        </div>
      </div>

      <!-- 按钮组 -->
      <div class="flex justify-end gap-2 mt-8 pt-6 border-t">
        <FormKit
          type="button"
          label="取消"
          @click="handleCancel"
          :classes="{ input: 'p-button-outlined' }"
        />
        <FormKit
          type="submit"
          :label="room ? '更新' : '创建'"
          :disabled="isSubmitting"
        />
      </div>
    </FormKit>
  </div>
</template>

<script setup lang="ts">
interface Room {
  id?: string
  name: string
  description?: string
  capacity: number
  location?: string
  status: string
  equipment?: any
  rules?: any
  requiresApproval: boolean
}

interface Props {
  room?: Room | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: []
  cancel: []
}>()

// 响应式数据
const formId = 'room-form-' + Date.now()
const isSubmitting = ref(false)

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

// 方法
const handleSubmit = async () => {
  isSubmitting.value = true

  try {
    // 处理设备配置
    const equipment = { ...formData.value.equipment }

    // 处理自定义设备
    if (equipment.customEquipment) {
      equipment.customList = equipment.customEquipment
        .split(',')
        .map(item => item.trim())
        .filter(item => item)
    }
    delete equipment.customEquipment

    // 处理规则配置
    const rules = { ...formData.value.rules }

    // 清理空的规则字段
    Object.keys(rules).forEach(key => {
      if (rules[key] === '' || rules[key] === null) {
        delete rules[key]
      }
    })

    // 清理时间范围
    if (rules.allowedTimeRange) {
      if (!rules.allowedTimeRange.start && !rules.allowedTimeRange.end) {
        delete rules.allowedTimeRange
      } else {
        Object.keys(rules.allowedTimeRange).forEach(key => {
          if (!rules.allowedTimeRange[key]) {
            delete rules.allowedTimeRange[key]
          }
        })
      }
    }

    const submitData = {
      name: formData.value.name.trim(),
      description: formData.value.description?.trim() || null,
      capacity: formData.value.capacity,
      location: formData.value.location?.trim() || null,
      status: formData.value.status,
      equipment: Object.keys(equipment).length > 0 ? equipment : null,
      rules: Object.keys(rules).length > 0 ? rules : null,
      requiresApproval: formData.value.requiresApproval
    }

    if (props.room?.id) {
      // 更新会议室
      await $fetch(`/api/v1/rooms/${props.room.id}`, {
        method: 'PUT',
        body: submitData
      })

      useToast().add({
        severity: 'success',
        summary: '更新成功',
        detail: `会议室 ${submitData.name} 已更新`,
        life: 3000
      })
    } else {
      // 创建会议室
      await $fetch('/api/v1/rooms', {
        method: 'POST',
        body: submitData
      })

      useToast().add({
        severity: 'success',
        summary: '创建成功',
        detail: `会议室 ${submitData.name} 已创建`,
        life: 3000
      })
    }

    emit('save')
  } catch (error) {
    console.error('保存会议室失败:', error)

    let errorMessage = '保存失败，请重试'
    if (error.data?.message) {
      errorMessage = error.data.message
    }

    useToast().add({
      severity: 'error',
      summary: '保存失败',
      detail: errorMessage,
      life: 3000
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

:deep(.formkit-form) {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

:deep(.formkit-outer) {
  margin-bottom: 0;
}

:deep(.formkit-label) {
  font-weight: 500;
  color: #374151;
}

:deep(.formkit-help) {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

:deep(.formkit-messages) {
  margin-top: 0.25rem;
}

:deep(.formkit-message) {
  font-size: 0.875rem;
  color: #dc2626;
}

:deep([data-type="checkbox"] .formkit-wrapper) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.formkit-input[type="submit"]) {
  @apply p-button;
}

:deep(.formkit-input[type="button"]) {
  @apply p-button p-button-outlined;
}

:deep(.formkit-input[type="submit"]:disabled) {
  @apply opacity-50 cursor-not-allowed;
}

.grid {
  display: grid;
  gap: 1rem;
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

.pt-2 {
  padding-top: 0.5rem;
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
</style>