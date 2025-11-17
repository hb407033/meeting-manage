<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 会议室名称 -->
      <div class="md:col-span-2">
        <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
          会议室名称 <span class="text-red-500">*</span>
        </label>
        <InputText
          id="name"
          v-model="formData.name"
          placeholder="请输入会议室名称"
          required
          class="w-full"
        />
      </div>

      <!-- 容量 -->
      <div>
        <label for="capacity" class="block text-sm font-medium text-gray-700 mb-2">
          容量（人数） <span class="text-red-500">*</span>
        </label>
        <InputNumber
          id="capacity"
          v-model="formData.capacity"
          :min="1"
          :max="1000"
          placeholder="请输入容量"
          class="w-full"
        />
      </div>

      <!-- 位置 -->
      <div>
        <label for="location" class="block text-sm font-medium text-gray-700 mb-2">
          位置
        </label>
        <InputText
          id="location"
          v-model="formData.location"
          placeholder="请输入位置"
          class="w-full"
        />
      </div>

      <!-- 状态 -->
      <div>
        <label for="status" class="block text-sm font-medium text-gray-700 mb-2">
          状态
        </label>
        <Dropdown
          id="status"
          v-model="formData.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="选择状态"
          class="w-full"
        />
      </div>

      <!-- 预约是否需要审批 -->
      <div>
        <div class="flex items-center">
          <Checkbox
            id="requiresApproval"
            v-model="formData.requiresApproval"
            binary
          />
          <label for="requiresApproval" class="ml-2 text-sm font-medium text-gray-700">
            预约需要审批
          </label>
        </div>
      </div>
    </div>

    <!-- 描述 -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
        描述
      </label>
      <Textarea
        id="description"
        v-model="formData.description"
        placeholder="请输入会议室描述"
        rows="3"
        class="w-full"
      />
    </div>

    <!-- 设施配置 -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4">设施配置</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div v-for="equipment in equipmentOptions" :key="equipment.key" class="flex items-center">
          <Checkbox
            :id="equipment.key"
            v-model="formData.equipment[equipment.key]"
            binary
          />
          <label :for="equipment.key" class="ml-2 text-sm text-gray-700">
            {{ equipment.label }}
          </label>
        </div>
      </div>
    </div>

    <!-- 预约规则 -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4">预约规则</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="minBookingDuration" class="block text-sm font-medium text-gray-700 mb-2">
            最短预约时长（分钟）
          </label>
          <InputNumber
            id="minBookingDuration"
            v-model="formData.rules.minBookingDuration"
            :min="15"
            :max="480"
            class="w-full"
          />
        </div>

        <div>
          <label for="maxBookingDuration" class="block text-sm font-medium text-gray-700 mb-2">
            最长预约时长（分钟）
          </label>
          <InputNumber
            id="maxBookingDuration"
            v-model="formData.rules.maxBookingDuration"
            :min="30"
            :max="1440"
            class="w-full"
          />
        </div>

        <div>
          <label for="advanceBookingDays" class="block text-sm font-medium text-gray-700 mb-2">
            提前预约天数
          </label>
          <InputNumber
            id="advanceBookingDays"
            v-model="formData.rules.advanceBookingDays"
            :min="0"
            :max="365"
            class="w-full"
          />
        </div>

        <div>
          <label for="maxConcurrentBookings" class="block text-sm font-medium text-gray-700 mb-2">
            最大并发预约数
          </label>
          <InputNumber
            id="maxConcurrentBookings"
            v-model="formData.rules.maxConcurrentBookings"
            :min="1"
            :max="10"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- 按钮组 -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <Button
        label="取消"
        icon="pi pi-times"
        severity="secondary"
        @click="$emit('cancel')"
      />
      <Button
        type="submit"
        label="保存"
        icon="pi pi-check"
        :loading="loading"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import type { MeetingRoom } from '~/stores/rooms'

interface Props {
  room?: MeetingRoom | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [data: any]
  cancel: []
}>()

const loading = ref(false)

// 表单数据
const formData = ref({
  name: '',
  description: '',
  capacity: 10,
  location: '',
  status: 'AVAILABLE' as MeetingRoom['status'],
  requiresApproval: false,
  equipment: {
    projector: false,
    whiteboard: false,
    videoConf: false,
    airCondition: true,
    wifi: true,
    customEquipment: []
  },
  rules: {
    requiresApproval: false,
    minBookingDuration: 30,
    maxBookingDuration: 240,
    advanceBookingDays: 30,
    maxConcurrentBookings: 1,
    allowedTimeRange: {
      start: '08:00',
      end: '18:00'
    }
  }
})

// 状态选项
const statusOptions = [
  { label: '可用', value: 'AVAILABLE' },
  { label: '使用中', value: 'OCCUPIED' },
  { label: '维护中', value: 'MAINTENANCE' },
  { label: '已预约', value: 'RESERVED' },
  { label: '禁用', value: 'DISABLED' }
]

// 设施选项
const equipmentOptions = [
  { key: 'projector', label: '投影仪' },
  { key: 'whiteboard', label: '白板' },
  { key: 'videoConf', label: '视频会议' },
  { key: 'airCondition', label: '空调' },
  { key: 'wifi', label: 'WiFi' }
]

// 初始化表单数据
const initFormData = () => {
  if (props.room) {
    formData.value = {
      name: props.room.name,
      description: props.room.description || '',
      capacity: props.room.capacity,
      location: props.room.location || '',
      status: props.room.status,
      requiresApproval: props.room.requiresApproval,
      equipment: {
        projector: false,
        whiteboard: false,
        videoConf: false,
        airCondition: true,
        wifi: true,
        customEquipment: [],
        ...props.room.equipment
      },
      rules: {
        requiresApproval: false,
        minBookingDuration: 30,
        maxBookingDuration: 240,
        advanceBookingDays: 30,
        maxConcurrentBookings: 1,
        allowedTimeRange: {
          start: '08:00',
          end: '18:00'
        },
        ...props.room.rules
      }
    }
  }
}

// 处理表单提交
const handleSubmit = async () => {
  loading.value = true

  try {
    // 构建提交数据
    const submitData = {
      ...formData.value,
      rules: {
        ...formData.value.rules,
        requiresApproval: formData.value.requiresApproval
      }
    }

    emit('save', submitData)
  } finally {
    loading.value = false
  }
}

// 监听房间变化
watch(() => props.room, initFormData, { immediate: true })
</script>

<style scoped>
form {
  max-height: 70vh;
  overflow-y: auto;
}
</style>