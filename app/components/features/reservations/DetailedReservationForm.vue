<script setup lang="ts">
  import type {
    EquipmentConflict,
    EquipmentSelection,
    MaterialFile,
    ServiceSelection
  } from '../../../../types/meeting'
  // 导入类型
  import type { TimeSlot } from './TimeSlotSelector.vue'
  import { format } from 'date-fns'

  import { zhCN } from 'date-fns/locale'
  import { computed, onMounted, reactive, ref } from 'vue'
  // 导入composable
  import { useAuth } from '~/composables/useAuth'
  // 导入store
  import { useReservationStore } from '~/stores/reservations'
  import { useRoomStore } from '~/stores/rooms'

  import AttendeeManager from './AttendeeManager.vue'
  import EquipmentSelector from './EquipmentSelector.vue'

  import MaterialsUploader from './MaterialsUploader.vue'

  import ServicesSelector from './ServicesSelector.vue'
  // 导入组件
  import TimeSlotSelector from './TimeSlotSelector.vue'

  // Props
  interface Props {
    roomId?: string
    initialData?: Partial<DetailedReservationFormData>
  }

  const props = withDefaults(defineProps<Props>(), {
    roomId: '',
    initialData: () => ({})
  })

  // Emits
  const emit = defineEmits<{
    submit: [data: DetailedReservationFormData]
    saveDraft: [data: DetailedReservationFormData]
    cancel: []
  }>()

  // 使用store和composable
  const reservationStore = useReservationStore()
  const roomStore = useRoomStore()
  const { user: _user } = useAuth()

  // 响应式数据
  const isSubmitting = ref(false)
  const timeSlots = ref<TimeSlot[]>([])
  const selectedTimeSlots = ref<TimeSlot[]>([])

  // 会议材料相关数据
  const meetingMaterials = ref<MaterialFile[]>([])
  const isUploading = ref(false)
  const uploadOptions = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    maxFiles: 20
  }

  // 表单数据
  const formData = reactive<DetailedReservationFormData>({
    title: '',
    description: '',
    importanceLevel: 'NORMAL',
    attendeeCount: 1,
    roomId: props.roomId || '',
    startTime: null,
    endTime: null,
    budgetAmount: null,
    equipment: [],
    services: [],
    attendeeList: [],
    meetingMaterials: [],
    isRecurring: false,
    recurringPattern: null,
    specialRequirements: ''
  })

  // 表单验证错误
  const errors = reactive<Record<string, string>>({})

  // 重要性级别选项
  const importanceOptions = [
    { label: '低优先级', value: 'LOW' },
    { label: '普通', value: 'NORMAL' },
    { label: '高优先级', value: 'HIGH' },
    { label: '紧急', value: 'URGENT' }
  ]

  // 计算属性
  const availableRooms = computed(() => roomStore.rooms)
  const selectedRoom = computed(() =>
    availableRooms.value.find(room => room.id === formData.roomId)
  )

  // 方法
  function formatDate(date: Date | string | null) {
    if (!date) return ''
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'yyyy-MM-dd HH:mm', { locale: zhCN })
  }

  function validateField(field: string) {
    switch (field) {
      case 'title':
        errors.title = formData.title.trim() ? '' : '请输入会议主题'
        break
      case 'importanceLevel':
        errors.importanceLevel = formData.importanceLevel ? '' : '请选择重要性级别'
        break
      case 'attendeeCount':
        errors.attendeeCount =
          formData.attendeeCount && formData.attendeeCount > 0 ? '' : '参会人数必须大于0'
        if (selectedRoom.value && formData.attendeeCount > selectedRoom.value.capacity) {
          errors.attendeeCount = `参会人数不能超过会议室容量(${selectedRoom.value.capacity}人)`
        }
        break
      case 'roomId':
        errors.roomId = formData.roomId ? '' : '请选择会议室'
        break
      case 'description':
        // 描述是可选的，但如果有内容则需要合理长度
        if (formData.description && formData.description.length > 1000) {
          errors.description = '会议描述不能超过1000字符'
        } else {
          errors.description = ''
        }
        break
    }
  }

  function validateForm() {
    const requiredFields = ['title', 'importanceLevel', 'attendeeCount', 'roomId']
    requiredFields.forEach(field => validateField(field))

    // 检查时间选择
    if (!formData.startTime || !formData.endTime) {
      errors.time = '请选择会议时间'
    } else {
      errors.time = ''
    }

    return Object.values(errors).every(error => !error)
  }

  async function onRoomChange() {
    if (formData.roomId) {
      await loadTimeSlots()
    } else {
      timeSlots.value = []
      selectedTimeSlots.value = []
    }
  }

  async function loadTimeSlots() {
    if (!formData.roomId) return

    try {
      // 使用store获取可用时间段
      const response = await reservationStore.fetchAvailability({
        roomIds: [formData.roomId],
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 未来7天
      })

      // 正确处理API响应数据格式
      const roomAvailability =
        (response?.data as any)?.[formData.roomId] || (response as any)?.[formData.roomId]
      if (roomAvailability && roomAvailability.availableSlots) {
        // 转换为TimeSlot格式
        timeSlots.value = roomAvailability.availableSlots.map((slot: any, index: number) => ({
          id: `${formData.roomId}-${index}`,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          status: 'available' as const,
          roomId: formData.roomId
        }))

        // 添加已预约的时间段
        if (roomAvailability.reservations) {
          roomAvailability.reservations.forEach((reservation: any, index: number) => {
            timeSlots.value.push({
              id: `${formData.roomId}-reserved-${index}`,
              startTime: new Date(reservation.startTime),
              endTime: new Date(reservation.endTime),
              status: 'unavailable' as const,
              roomId: formData.roomId,
              reservationId: reservation.id,
              conflictInfo: {
                title: reservation.title,
                organizer: reservation.organizerName
              }
            })
          })
        }

        // 按时间排序
        timeSlots.value.sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime())

        console.warn(
          `✅ 加载了 ${timeSlots.value.length} 个时间段，其中 ${roomAvailability.availableSlots.length} 个可用`
        )
      } else {
        console.warn('⚠️ 未找到房间可用性数据:', response)
        // 如果API没有返回数据，生成默认时间段
        timeSlots.value = generateDefaultTimeSlots()
      }
    } catch (error) {
      console.error('❌ 加载时间段失败:', error)
      // 发生错误时生成默认时间段作为后备
      timeSlots.value = generateDefaultTimeSlots()
    }
  }

  // 生成默认时间段的辅助函数
  function generateDefaultTimeSlots() {
    const slots = []
    const today = new Date()
    const startTime = new Date(today)
    startTime.setHours(9, 0, 0, 0) // 9:00 AM
    const endTime = new Date(today)
    endTime.setHours(18, 0, 0, 0) // 6:00 PM

    let currentTime = new Date(startTime)
    while (currentTime < endTime) {
      const slotEndTime = new Date(currentTime.getTime() + 30 * 60 * 1000) // 30分钟
      slots.push({
        id: `default-${currentTime.getTime()}`,
        startTime: new Date(currentTime),
        endTime: new Date(slotEndTime),
        status: 'available' as const,
        roomId: formData.roomId
      })
      currentTime = slotEndTime
    }
    return slots
  }

  function onTimeSlotSelect(slots: TimeSlot[]) {
    selectedTimeSlots.value = slots

    if (slots.length > 0) {
      const slot = slots[0]
      formData.startTime = slot.startTime
      formData.endTime = slot.endTime
    } else {
      formData.startTime = null
      formData.endTime = null
    }

    validateField('time')
  }

  function onTimeSelectionChange(slots: TimeSlot[]) {
    // 处理时间选择变化
    console.warn('时间选择变化:', slots)
  }

  function onEquipmentSelectionChange(selection: EquipmentSelection[]) {
    formData.equipment = selection.map(item => ({
      id: item.equipment.id,
      name: item.equipment.name,
      quantity: item.quantity,
      cost: item.equipment.cost,
      totalCost: (item.equipment.cost || 0) * item.quantity
    }))
  }

  function onEquipmentConflictDetected(conflicts: EquipmentConflict[]) {
    console.warn('设备冲突检测:', conflicts)
    // 这里可以显示冲突提示给用户
  }

  function onServiceSelectionChange(selection: ServiceSelection[]) {
    formData.services = selection.map(item => ({
      id: item.service.id,
      name: item.service.name,
      quantity: item.quantity,
      cost: item.service.baseCost,
      totalCost: item.service.baseCost * item.quantity + (item.config?.additionalCost || 0),
      config: item.config,
      discount: item.discount
    }))
  }

  function onServiceCostChange(totalCost: number, totalDiscount: number) {
    console.warn('服务费用变化:', { totalCost, totalDiscount })
  }

  function onAttendeesChange(attendees: any[]) {
    formData.attendeeList = attendees.map(attendee => ({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      type: attendee.type,
      // 内部员工特有字段
      employeeId: attendee.employeeId,
      department: attendee.department,
      position: attendee.position,
      isOrganizer: attendee.isOrganizer || false,
      // 外部访客特有字段
      company: attendee.company,
      visitPurpose: attendee.visitPurpose,
      // 通用字段
      specialRequirements: attendee.specialRequirements
    }))

    // 更新参会人数
    formData.attendeeCount = attendees.length
  }

  function onCapacityWarning(isOverCapacity: boolean, currentCount: number, capacity: number) {
    if (isOverCapacity) {
      errors.attendeeCount = `参会人数(${currentCount})超过会议室容量(${capacity}人)`
    } else {
      delete errors.attendeeCount
    }
  }

  // 会议材料处理方法
  async function handleMaterialsUpload(materials: MaterialFile[]) {
    try {
      meetingMaterials.value.push(...materials)

      // 更新表单数据中的会议材料
      formData.meetingMaterials = materials.map(material => ({
        id: material.id,
        name: material.name,
        originalName: material.originalName,
        type: material.type,
        size: material.size,
        url: material.url,
        uploadedBy: material.uploadedBy,
        uploadedAt: material.uploadedAt,
        description: material.description,
        isPublic: material.isPublic
      }))

      console.warn('会议材料上传成功:', materials)
    } catch (error) {
      console.error('处理会议材料上传失败:', error)
    }
  }

  async function handleMaterialDelete(materialId: string) {
    try {
      meetingMaterials.value = meetingMaterials.value.filter(m => m.id !== materialId)

      // 更新表单数据
      formData.meetingMaterials = formData.meetingMaterials?.filter(m => m.id !== materialId) || []

      console.warn('会议材料删除成功:', materialId)
    } catch (error) {
      console.error('处理会议材料删除失败:', error)
    }
  }

  function handleMaterialPreview(material: MaterialFile) {
    console.warn('预览会议材料:', material)
    // 可以在这里添加预览逻辑，比如打开预览对话框
  }

  function handleMaterialDownload(material: MaterialFile) {
    console.warn('下载会议材料:', material)
    // 浏览器会自动处理下载
    const link = document.createElement('a')
    link.href = material.url
    link.download = material.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function refreshMaterials() {
    try {
      // 刷新材料列表（如果需要的话）
      console.warn('刷新会议材料列表')
    } catch (error) {
      console.error('刷新会议材料列表失败:', error)
    }
  }

  async function saveDraft() {
    if (!validateForm()) return

    try {
      isSubmitting.value = true
      emit('saveDraft', { ...formData })
    } finally {
      isSubmitting.value = false
    }
  }

  async function submitReservation() {
    if (!validateForm()) return

    try {
      isSubmitting.value = true
      emit('submit', { ...formData })
    } finally {
      isSubmitting.value = false
    }
  }

  // 初始化
  onMounted(async () => {
    // 加载房间列表
    await roomStore.fetchRooms()

    // 设置初始数据
    if (props.initialData) {
      Object.assign(formData, props.initialData)
    }

    // 如果有roomId，加载时间段
    if (formData.roomId) {
      await loadTimeSlots()
    }
  })

  // 类型定义
  interface DetailedReservationFormData {
    title: string
    description?: string
    importanceLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    attendeeCount: number
    roomId: string
    startTime: Date | null
    endTime: Date | null
    budgetAmount?: number | null
    equipment?: any[]
    services?: any[]
    attendeeList?: any[]
    meetingMaterials?: any[]
    isRecurring?: boolean
    recurringPattern?: any
    specialRequirements?: string
  }
</script>

<template>
  <div class="detailed-reservation-form">
    <!-- 表单标题 -->
    <div class="form-header mb-6">
      <h2 class="mb-2 text-2xl font-bold text-gray-800">详细预约配置</h2>
      <p class="text-gray-600">请填写完整的会议信息，确保会议室资源满足您的需求</p>
    </div>

    <!-- 基础信息部分 -->
    <Card class="mb-4">
      <template #title>
        <div class="flex items-center">
          <i class="pi pi-info-circle mr-2 text-blue-600" />
          基础信息
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- 会议主题 -->
          <div class="field-group">
            <label for="title" class="mb-2 block text-sm font-medium text-gray-700">
              会议主题
              <span class="text-red-500">*</span>
            </label>
            <InputText
              id="title"
              v-model="formData.title"
              placeholder="请输入会议主题"
              :class="{ 'p-invalid': errors.title }"
              @blur="validateField('title')"
            />
            <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
          </div>

          <!-- 重要性级别 -->
          <div class="field-group">
            <label for="importanceLevel" class="mb-2 block text-sm font-medium text-gray-700">
              重要性级别
              <span class="text-red-500">*</span>
            </label>
            <Dropdown
              id="importanceLevel"
              v-model="formData.importanceLevel"
              :options="importanceOptions"
              option-label="label"
              option-value="value"
              placeholder="选择重要性级别"
              :class="{ 'p-invalid': errors.importanceLevel }"
              @blur="validateField('importanceLevel')"
            />
            <small v-if="errors.importanceLevel" class="text-red-500">
              {{ errors.importanceLevel }}
            </small>
          </div>

          <!-- 会议描述 -->
          <div class="field-group md:col-span-2">
            <label for="description" class="mb-2 block text-sm font-medium text-gray-700">
              会议描述
            </label>
            <Textarea
              id="description"
              v-model="formData.description"
              placeholder="请描述会议内容、议程或特殊要求..."
              rows="4"
              :class="{ 'p-invalid': errors.description }"
              @blur="validateField('description')"
            />
            <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
          </div>

          <!-- 参会人数 -->
          <div class="field-group">
            <label for="attendeeCount" class="mb-2 block text-sm font-medium text-gray-700">
              预计参会人数
              <span class="text-red-500">*</span>
            </label>
            <InputNumber
              id="attendeeCount"
              v-model="formData.attendeeCount"
              :min="1"
              :max="selectedRoom?.capacity || 50"
              placeholder="参会人数"
              :class="{ 'p-invalid': errors.attendeeCount }"
              @blur="validateField('attendeeCount')"
            />
            <small v-if="errors.attendeeCount" class="text-red-500">
              {{ errors.attendeeCount }}
            </small>
            <small v-if="selectedRoom" class="text-gray-500">
              会议室容量: {{ selectedRoom.capacity }}人
            </small>
          </div>

          <!-- 预算金额 -->
          <div class="field-group">
            <label for="budgetAmount" class="mb-2 block text-sm font-medium text-gray-700">
              预算金额
            </label>
            <InputNumber
              id="budgetAmount"
              v-model="formData.budgetAmount"
              mode="currency"
              currency="CNY"
              locale="zh-CN"
              placeholder="会议预算"
              :min="0"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- 时间和会议室选择 -->
    <Card class="mb-4">
      <template #title>
        <div class="flex items-center">
          <i class="pi pi-clock mr-2 text-blue-600" />
          时间和地点
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- 会议室选择 -->
          <div class="field-group">
            <label for="roomId" class="mb-2 block text-sm font-medium text-gray-700">
              选择会议室
              <span class="text-red-500">*</span>
            </label>
            <Dropdown
              id="roomId"
              v-model="formData.roomId"
              :options="availableRooms"
              option-label="name"
              option-value="id"
              placeholder="请选择会议室"
              :class="{ 'p-invalid': errors.roomId }"
              @blur="validateField('roomId')"
              @change="onRoomChange"
            />
            <small v-if="errors.roomId" class="text-red-500">{{ errors.roomId }}</small>
          </div>

          <!-- 时间选择 -->
          <div class="field-group">
            <label class="mb-2 block text-sm font-medium text-gray-700">
              选择时间
              <span class="text-red-500">*</span>
            </label>
            <div class="text-sm text-gray-600">
              <div v-if="formData.startTime && formData.endTime">
                <i class="pi pi-calendar mr-1" />
                {{ formatDate(formData.startTime) }} - {{ formatDate(formData.endTime) }}
              </div>
              <div v-else class="text-gray-400">
                <i class="pi pi-info-circle mr-1" />
                请在下方时间选择器中选择时间段
              </div>
            </div>
          </div>
        </div>

        <!-- 时间选择器组件 -->
        <div class="mt-4">
          <time-slot-selector
            v-if="formData.roomId"
            :available-slots="timeSlots"
            :selected-slots="selectedTimeSlots"
            :allow-multiple-selection="false"
            @slot-select="onTimeSlotSelect"
            @selection-change="onTimeSelectionChange"
          />
          <div v-else class="rounded-lg bg-gray-50 py-8 text-center">
            <i class="pi pi-info-circle mb-2 text-4xl text-gray-400" />
            <p class="text-gray-500">请先选择会议室以查看可用时间</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- 子组件占位符 - 后续任务中实现 -->
    <!-- 设备选择组件 -->
    <equipment-selector
      v-if="formData.roomId"
      :room-id="formData.roomId"
      :selected-date="formData.startTime"
      :selected-time-slot="
        formData.startTime && formData.endTime
          ? { startTime: formData.startTime, endTime: formData.endTime }
          : undefined
      "
      class="mb-4"
      @selection-change="onEquipmentSelectionChange"
      @conflict-detected="onEquipmentConflictDetected"
    />

    <!-- 服务选择组件 -->
    <services-selector
      v-if="formData.roomId"
      :room-id="formData.roomId"
      :attendee-count="formData.attendeeCount"
      :selected-date="formData.startTime"
      :selected-time-slot="
        formData.startTime && formData.endTime
          ? { startTime: formData.startTime, endTime: formData.endTime }
          : undefined
      "
      class="mb-4"
      @selection-change="onServiceSelectionChange"
      @cost-change="onServiceCostChange"
    />

    <!-- 参会人员管理 -->
    <attendee-manager
      v-if="formData.roomId"
      :room-capacity="selectedRoom?.capacity || 10"
      class="mb-4"
      @attendees-change="onAttendeesChange"
      @capacity-warning="onCapacityWarning"
    />

    <!-- 会议材料上传 -->
    <Card class="mb-4">
      <template #title>
        <div class="flex items-center">
          <i class="pi pi-file mr-2 text-blue-600" />
          会议材料
        </div>
      </template>
      <template #content>
        <materials-uploader
          :materials="meetingMaterials"
          :is-loading="isUploading"
          :upload-options="uploadOptions"
          @upload="handleMaterialsUpload"
          @delete="handleMaterialDelete"
          @preview="handleMaterialPreview"
          @download="handleMaterialDownload"
          @refresh="refreshMaterials"
        />
      </template>
    </Card>

    <!-- 特殊要求 -->
    <Card class="mb-4">
      <template #title>
        <div class="flex items-center">
          <i class="pi pi-comment mr-2 text-blue-600" />
          特殊要求
        </div>
      </template>
      <template #content>
        <div class="field-group">
          <Textarea
            v-model="formData.specialRequirements"
            placeholder="如有特殊要求或注意事项，请在此说明..."
            rows="3"
          />
        </div>
      </template>
    </Card>

    <!-- 表单操作按钮 -->
    <div class="flex justify-end gap-3">
      <Button
        label="保存草稿"
        icon="pi pi-save"
        class="p-button-outlined"
        :disabled="isSubmitting"
        @click="saveDraft"
      />
      <Button
        label="提交预约"
        icon="pi pi-check"
        :loading="isSubmitting"
        @click="submitReservation"
      />
    </div>
  </div>
</template>

<style scoped>
  .detailed-reservation-form {
    max-width: 1200px;
    margin: 0 auto;
  }

  .field-group {
    margin-bottom: 1rem;
  }

  .field-group label {
    font-weight: 500;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .detailed-reservation-form {
      padding: 0 1rem;
    }

    .grid {
      grid-template-columns: 1fr !important;
    }
  }

  /* 卡片间距优化 */
  .p-card {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  }

  .p-card :deep(.p-card-header) {
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  /* 表单字段样式优化 */
  .p-inputtext,
  .p-dropdown,
  .p-inputnumber,
  .p-textarea {
    transition: all 0.2s ease;
  }

  .p-inputtext:focus,
  .p-dropdown:focus,
  .p-inputnumber:focus,
  .p-textarea:focus {
    box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.1);
  }

  /* 错误状态样式 */
  .p-invalid {
    border-color: #ef4444 !important;
  }

  .text-red-500 {
    color: #ef4444;
  }

  /* 按钮组样式 */
  .flex.justify-end {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
  }
</style>
