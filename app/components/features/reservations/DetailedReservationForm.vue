<script setup lang="ts">
  // 导入类型
  import type { TimeSlot } from './TimeSlotSelector.vue'
  import type { DetailedReservationData, EquipmentSelection, ServiceSelection } from '~/stores/reservations'
  import type { MaterialFile } from '../../../../types/meeting'

// EquipmentSelector 的内部类型定义
interface EquipmentSelectionInput {
  equipment: {
    id: string
    name: string
    type: string
    cost: number
    description?: string
  }
  quantity: number
}

interface EquipmentConflictInput {
  equipmentId: string
  equipmentName: string
  type: 'unavailable' | 'insufficient_quantity' | 'time_conflict'
  message: string
}

interface ServiceSelectionInput {
  service: {
    id: string
    name: string
    type: string
    baseCost: number
  }
  quantity: number
  config?: any
  discount?: number
}
  import { format } from 'date-fns'

  import { zhCN } from 'date-fns/locale'
  import { computed, onMounted, reactive, ref } from 'vue'
  // 导入composable
  import { useAuth } from '~/composables/useAuth'
  import { useToast } from 'primevue/usetoast'
  // 导入store
  import { useReservationStore } from '~/stores/reservations'
  import { useRoomStore } from '~/stores/rooms'

  import AttendeeManager from './AttendeeManager.vue'
  import EquipmentSelector from './EquipmentSelector.vue'

  import MaterialsUploader from './MaterialsUploader.vue'


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
    submit: [data: any] // 改为 any 类型，因为可能返回 Reservation 对象
    saveDraft: [data: DetailedReservationFormData]
    cancel: []
  }>()

  // 使用store和composable
  const reservationStore = useReservationStore()
  const roomStore = useRoomStore()
  const { user: _user } = useAuth()
  const toast = useToast()

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

  // 服务配置相关数据
  const servicesExpanded = ref(false)
  const selectedServices = ref<any[]>([])

  // 服务数据
  const technicalServices = ref([
    { id: 'tech-1', name: '投影仪租赁', baseCost: 50, type: 'equipment' },
    { id: 'tech-2', name: '音响设备', baseCost: 80, type: 'equipment' },
    { id: 'tech-3', name: '网络服务', baseCost: 30, type: 'network' },
    { id: 'tech-4', name: '技术支持', baseCost: 100, type: 'support' }
  ])

  const logisticsServices = ref([
    { id: 'log-1', name: '茶水服务', baseCost: 20, type: 'beverage' },
    { id: 'log-2', name: '餐饮服务', baseCost: 60, type: 'catering' },
    { id: 'log-3', name: '场地布置', baseCost: 40, type: 'setup' },
    { id: 'log-4', name: '清洁服务', baseCost: 30, type: 'cleaning' }
  ])

  const otherServices = ref([
    { id: 'other-1', name: '翻译服务', baseCost: 200, type: 'translation' },
    { id: 'other-2', name: '会议记录', baseCost: 80, type: 'recording' },
    { id: 'other-3', name: '摄影服务', baseCost: 150, type: 'photography' },
    { id: 'other-4', name: '安保服务', baseCost: 120, type: 'security' }
  ])

  // 计算选择的服务数量
  const selectedServicesCount = computed(() => selectedServices.value.length)

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
    specialRequirements: '',
    organizerName: ''
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

  function onEquipmentSelectionChange(selection: EquipmentSelectionInput[]) {
    formData.equipment = selection.map(item => ({
      id: item.equipment.id,
      name: item.equipment.name,
      type: item.equipment.type,
      quantity: item.quantity,
      cost: item.equipment.cost,
      totalCost: (item.equipment.cost || 0) * item.quantity,
      config: {},
      discount: 0
    }))
  }

  function onEquipmentConflictDetected(conflicts: EquipmentConflictInput[]) {
    console.warn('设备冲突检测:', conflicts)
    // 这里可以显示冲突提示给用户
  }

  function onServiceSelectionChange(selection: ServiceSelectionInput[]) {
    formData.services = selection.map(item => ({
      id: item.service.id,
      name: item.service.name,
      type: item.service.type,
      quantity: item.quantity,
      cost: item.service.baseCost,
      totalCost: item.service.baseCost * item.quantity + (item.config?.additionalCost || 0),
      config: item.config,
      discount: item.discount || 0
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

  // 简单时间槽点击处理
  function handleSimpleTimeSlotClick(slot: any) {
    if (slot.status !== 'available') return

    // 清除之前的选择
    selectedTimeSlots.value = []

    // 设置新的选择
    selectedTimeSlots.value = [slot]

    // 更新表单时间
    formData.startTime = slot.startTime
    formData.endTime = slot.endTime

    validateField('time')
  }

  // 获取时间槽样式类
  function getTimeSlotClass(slot: any): string {
    const isSelected = selectedTimeSlots.value.some((s: any) => s.id === slot.id)

    if (isSelected) return 'bg-blue-500 text-white border-blue-500'

    switch (slot.status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
      case 'unavailable':
        return 'bg-red-100 text-red-800 border border-red-300'
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 border border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300'
    }
  }

  // 格式化简单时间槽
  function formatSimpleTimeSlot(slot: any): string {
    const start = slot.startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    const end = slot.endTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    return `${start} - ${end}`
  }

  // 服务相关方法
  function toggleServicesExpanded() {
    servicesExpanded.value = !servicesExpanded.value
  }

  function isServiceSelected(serviceId: string): boolean {
    return selectedServices.value.some((s: any) => s.id === serviceId)
  }

  function toggleService(service: any) {
    const isSelected = isServiceSelected(service.id)

    if (isSelected) {
      // 取消选择
      selectedServices.value = selectedServices.value.filter((s: any) => s.id !== service.id)
    } else {
      // 添加选择
      selectedServices.value.push({
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          baseCost: service.baseCost
        },
        quantity: 1,
        config: {}
      })
    }

    // 更新表单数据
    updateFormDataServices()
  }

  function updateFormDataServices() {
    formData.services = selectedServices.value.map((item: any) => ({
      id: item.service.id,
      name: item.service.name,
      type: item.service.type,
      quantity: item.quantity,
      cost: item.service.baseCost,
      totalCost: item.service.baseCost * item.quantity + (item.config?.additionalCost || 0),
      config: item.config,
      discount: item.discount
    }))
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

      // 准备详细预约数据
      const detailedReservationData: DetailedReservationData = {
        title: formData.title,
        description: formData.description,
        importanceLevel: formData.importanceLevel,
        attendeeCount: formData.attendeeCount,
        roomId: formData.roomId,
        startTime: formData.startTime!, // 已经在验证中确保不为 null
        endTime: formData.endTime!,     // 已经在验证中确保不为 null
        budgetAmount: formData.budgetAmount,
        equipment: formData.equipment || [],
        services: formData.services || [],
        attendeeList: formData.attendeeList || [],
        meetingMaterials: formData.meetingMaterials || [],
        isRecurring: formData.isRecurring || false,
        recurringPattern: formData.recurringPattern,
        specialRequirements: formData.specialRequirements
      }

      // 调用 store 创建详细预约
      const reservation = await reservationStore.createDetailedReservation(detailedReservationData)

      // 成功创建后，可以选择跳转或显示成功消息
      console.log('详细预约创建成功:', reservation)

      // 仍然发射事件以保持兼容性
      emit('submit', reservation)

    } catch (error: any) {
      console.error('提交详细预约失败:', error)
      // 显示错误消息给用户
      toast.add({
        severity: 'error',
        summary: '提交失败',
        detail: error.message || '创建详细预约时发生错误，请重试',
        life: 5000
      })
      throw error // 重新抛出错误，让调用方也能处理
    } finally {
      isSubmitting.value = false
    }
  }

  // 监听 initialData 变化
  watch(() => props.initialData, (newData) => {
    if (newData && Object.keys(newData).length > 0) {
      console.log('📝 接收到新的初始数据:', newData)
      Object.assign(formData, newData)
      
      // 如果有roomId，加载时间段
      if (formData.roomId) {
        loadTimeSlots()
      }
    }
  }, { deep: true })

  // 初始化
  onMounted(async () => {
    // 加载房间列表
    await roomStore.fetchRooms()

    // 设置初始数据
    if (props.initialData && Object.keys(props.initialData).length > 0) {
      Object.assign(formData, props.initialData)
    }

    // 如果有roomId，加载时间段
    if (formData.roomId) {
      await loadTimeSlots()
    }
  })

  // 组件内部表单数据类型，与 store 兼容
  interface DetailedReservationFormData {
    title: string
    description?: string
    importanceLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    attendeeCount: number
    roomId: string
    startTime: Date | null  // 在组件中可以为 null，提交时验证
    endTime: Date | null    // 在组件中可以为 null，提交时验证
    budgetAmount?: number | null
    equipment?: EquipmentSelection[]
    services?: ServiceSelection[]
    attendeeList?: any[]
    meetingMaterials?: any[]
    isRecurring?: boolean
    recurringPattern?: any
    specialRequirements?: string
    organizerName?: string
  }
</script>

<template>
  <div class="container mx-auto px-4 py-6 detailed-reservation-form" >
    <!-- 表单标题 -->
    <div class="form-header">
      <h2 class="mb-2 text-2xl font-bold text-gray-800">详细预约配置</h2>
      <p class="text-gray-600">请填写完整的会议信息，确保会议室资源满足您的需求</p>
    </div>

    <!-- 基础信息部分 - 两列布局 -->
    <Card class="mb-3">
      <template #title>
        <div class="flex items-center text-base">
          <i class="pi pi-info-circle mr-2 text-blue-600" />
          会议信息
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- 左列：会议基本信息 -->
          <div class="space-y-3">
            <!-- 会议主题 -->
            <div class="field-group-horizontal">
              <label for="title" class="field-label">
                会议主题
                <span class="text-red-500">*</span>
              </label>
              <div class="field-input-wrapper">
                <InputText
                  id="title"
                  v-model="formData.title"
                  placeholder="请输入会议主题"
                  :class="{ 'p-invalid': errors.title }"
                  class="w-full"
                  @blur="validateField('title')"
                />
                <small v-if="errors.title" class="text-red-500 text-xs mt-1 block">{{ errors.title }}</small>
              </div>
            </div>

            <!-- 会议主持人 -->
            <div class="field-group-horizontal">
              <label for="organizerName" class="field-label">
                会议主持人
                <span class="text-red-500">*</span>
              </label>
              <div class="field-input-wrapper">
                <InputText
                  id="organizerName"
                  v-model="formData.organizerName"
                  placeholder="请输入主持人姓名"
                  class="w-full"
                />
              </div>
            </div>

            <!-- 会议室选择 -->
            <div class="field-group-horizontal">
              <label for="roomId" class="field-label">
                会议室
                <span class="text-red-500">*</span>
              </label>
              <div class="field-input-wrapper">
                <Dropdown
                  id="roomId"
                  v-model="formData.roomId"
                  :options="availableRooms"
                  option-label="name"
                  option-value="id"
                  placeholder="选择会议室"
                  :class="{ 'p-invalid': errors.roomId }"
                  class="w-full"
                  @blur="validateField('roomId')"
                  @change="onRoomChange"
                />
                <small v-if="errors.roomId" class="text-red-500 text-xs mt-1 block">{{ errors.roomId }}</small>
              </div>
            </div>

            <!-- 重要性级别 -->
            <div class="field-group-horizontal">
              <label for="importanceLevel" class="field-label">
                重要性级别
                <span class="text-red-500">*</span>
              </label>
              <div class="field-input-wrapper">
                <Dropdown
                  id="importanceLevel"
                  v-model="formData.importanceLevel"
                  :options="importanceOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="选择重要性"
                  :class="{ 'p-invalid': errors.importanceLevel }"
                  class="w-full"
                  @blur="validateField('importanceLevel')"
                />
                <small v-if="errors.importanceLevel" class="text-red-500 text-xs mt-1 block">
                  {{ errors.importanceLevel }}
                </small>
              </div>
            </div>

            <!-- 参会人数 -->
            <div class="field-group-horizontal">
              <label for="attendeeCount" class="field-label">
                参会人数
                <span class="text-red-500">*</span>
              </label>
              <div class="field-input-wrapper">
                <InputNumber
                  id="attendeeCount"
                  v-model="formData.attendeeCount"
                  :min="1"
                  :max="selectedRoom?.capacity || 50"
                  placeholder="人数"
                  :class="{ 'p-invalid': errors.attendeeCount }"
                 
                  @blur="validateField('attendeeCount')"
                />
                <small v-if="errors.attendeeCount" class="text-red-500 text-xs mt-1">
                  {{ errors.attendeeCount }}
                </small>
                <small v-if="selectedRoom" class="text-gray-500 text-xs mt-1">
                  容量: {{ selectedRoom.capacity }}人
                </small>
              </div>
            </div>

            <!-- 会议描述 -->
            <div class="field-group-horizontal">
              <label for="description" class="field-label">
                会议描述
              </label>
              <div class="field-input-wrapper">
                <Textarea
                  id="description"
                  v-model="formData.description"
                  placeholder="请描述会议内容、议程或特殊要求..."
                  rows="2"
                  :class="{ 'p-invalid': errors.description }"
                  class="w-full"
                  @blur="validateField('description')"
                />
                <small v-if="errors.description" class="text-red-500 text-xs mt-1 block">{{ errors.description }}</small>
              </div>
            </div>
          </div>

          <!-- 右列：时间选择 -->
          <div class="space-y-3">
            <!-- 时间选择器标题 -->
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700">
                选择会议时间
                <span class="text-red-500">*</span>
              </label>
              <div v-if="selectedTimeSlots.length > 0" class="text-sm text-blue-600">
                已选择 {{ selectedTimeSlots.length }} 个时间段
              </div>
            </div>

            <!-- 时间选择显示 -->
            <div v-if="formData.startTime && formData.endTime" class="rounded-md bg-blue-50 p-3 text-sm">
              <div class="flex items-center text-blue-700">
                <i class="pi pi-calendar mr-2" />
                <span class="font-medium">{{ formatDate(formData.startTime) }} - {{ formatDate(formData.endTime) }}</span>
              </div>
            </div>

            <!-- 时间选择器 - 使用快速预约样式 -->
            <div class="field-group">
              <div v-if="formData.roomId" class="max-h-80 overflow-y-auto">
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div
                    v-for="slot in timeSlots"
                    :key="slot.id"
                    :class="[
                      'p-3 rounded-lg cursor-pointer transition-all duration-200 border text-center',
                      'hover:shadow-md hover:scale-105',
                      getTimeSlotClass(slot),
                      slot.status !== 'available' ? 'cursor-not-allowed opacity-60' : ''
                    ]"
                    @click="handleSimpleTimeSlotClick(slot)"
                  >
                    <div class="text-sm font-medium">
                      {{ formatSimpleTimeSlot(slot) }}
                    </div>
                    <div class="text-xs mt-1">
                      <span v-if="slot.status === 'available'" class="text-green-600">✓ 可用</span>
                      <span v-else-if="slot.status === 'unavailable'" class="text-red-600">✗ 已预约</span>
                      <span v-else-if="slot.status === 'maintenance'" class="text-orange-600">⚠ 维护中</span>
                    </div>
                  </div>
                </div>

                <div v-if="timeSlots.length === 0" class="text-center py-8 text-gray-500">
                  <p class="text-sm">暂无可选时间段</p>
                </div>
              </div>
              <div v-else class="rounded-md bg-gray-50 py-8 text-center">
                <i class="pi pi-info-circle mb-2 text-3xl text-gray-400" />
                <p class="text-gray-500 text-sm">请先选择会议室以查看可用时间</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- 子组件占位符 - 后续任务中实现 -->
    <!-- 设备选择组件 - 紧凑化 -->
    <div class="equipment-compact">
      <equipment-selector
        v-if="formData.roomId"
        :room-id="formData.roomId"
        :selected-date="formData.startTime || undefined"
        :selected-time-slot="
          formData.startTime && formData.endTime
            ? { startTime: formData.startTime, endTime: formData.endTime }
            : undefined
        "
        :compact="true"
        @selection-change="onEquipmentSelectionChange"
        @conflict-detected="onEquipmentConflictDetected"
      />
    </div>

    <!-- 会议服务配置 - 折叠和紧凑化 -->
    <Card class="services mb-0 p-0" :body-style="{ padding: '5px' }">
      <template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center">
            <i class="pi pi-star mr-2 text-blue-600" />
            <span>会议服务配置</span>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="selectedServicesCount > 0" class="text-sm text-blue-600">
              已选择 {{ selectedServicesCount }} 项服务
            </span>
            <Button
              :icon="servicesExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
              variant="text"
              size="small"
              @click="toggleServicesExpanded"
              v-tooltip="servicesExpanded ? '收起服务配置' : '展开服务配置'"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div class="services-compact-content">
          <!-- 服务分类 - 一行三列布局 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- 技术支持服务 -->
            <div class="service-category h-72 flex flex-col">
              <div class="category-header flex items-center mb-2 flex-shrink-0">
                <i class="pi pi-desktop mr-2 text-blue-600"></i>
                <h4 class="font-medium text-gray-800 text-sm">技术支持</h4>
              </div>
              <div class="service-items space-y-2 overflow-y-auto flex-1 pr-1">
                <div
                  v-for="service in technicalServices"
                  :key="service.id"
                  class="service-item flex items-center justify-between p-2 rounded border hover:bg-gray-50 cursor-pointer"
                  :class="{ 'bg-blue-50 border-blue-300': isServiceSelected(service.id) }"
                  @click="toggleService(service)"
                >
                  <div class="flex items-center">
                    <Checkbox
                      :binary="true"
                      :modelValue="isServiceSelected(service.id)"
                      @click.stop
                      class="mr-2"
                    />
                    <span class="text-sm">{{ service.name }}</span>
                  </div>
                  <span class="text-xs text-gray-500">¥{{ service.baseCost }}</span>
                </div>
              </div>
            </div>

            <!-- 后勤服务 -->
            <div class="service-category h-72 flex flex-col">
              <div class="category-header flex items-center mb-2 flex-shrink-0">
                <i class="pi pi-truck mr-2 text-green-600"></i>
                <h4 class="font-medium text-gray-800 text-sm">后勤服务</h4>
              </div>
              <div class="service-items space-y-2 overflow-y-auto flex-1 pr-1">
                <div
                  v-for="service in logisticsServices"
                  :key="service.id"
                  class="service-item flex items-center justify-between p-2 rounded border hover:bg-gray-50 cursor-pointer"
                  :class="{ 'bg-green-50 border-green-300': isServiceSelected(service.id) }"
                  @click="toggleService(service)"
                >
                  <div class="flex items-center">
                    <Checkbox
                      :binary="true"
                      :modelValue="isServiceSelected(service.id)"
                      @click.stop
                      class="mr-2"
                    />
                    <span class="text-sm">{{ service.name }}</span>
                  </div>
                  <span class="text-xs text-gray-500">¥{{ service.baseCost }}</span>
                </div>
              </div>
            </div>

            <!-- 其他服务 -->
            <div class="service-category h-72 flex flex-col">
              <div class="category-header flex items-center mb-2 flex-shrink-0">
                <i class="pi pi-ellipsis-h mr-2 text-purple-600"></i>
                <h4 class="font-medium text-gray-800 text-sm">其他服务</h4>
              </div>
              <div class="service-items space-y-2 overflow-y-auto flex-1 pr-1">
                <div
                  v-for="service in otherServices"
                  :key="service.id"
                  class="service-item flex items-center justify-between p-2 rounded border hover:bg-gray-50 cursor-pointer"
                  :class="{ 'bg-purple-50 border-purple-300': isServiceSelected(service.id) }"
                  @click="toggleService(service)"
                >
                  <div class="flex items-center">
                    <Checkbox
                      :binary="true"
                      :modelValue="isServiceSelected(service.id)"
                      @click.stop
                      class="mr-2"
                    />
                    <span class="text-sm">{{ service.name }}</span>
                  </div>
                  <span class="text-xs text-gray-500">¥{{ service.baseCost }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- 参会人员管理 - 紧凑化 -->
    <div class="attendees-compact">
      <attendee-manager
        v-if="formData.roomId"
        :room-capacity="selectedRoom?.capacity || 10"
        :compact="true"
        @attendees-change="onAttendeesChange"
        @capacity-warning="onCapacityWarning"
      />
    </div>

    <!-- 会议材料上传 - 紧凑设计 -->
    <Card class="materials mb-4">
      <template #title>
        <div class="flex items-center">
          <i class="pi pi-file mr-2 text-blue-600" />
          会议材料
        </div>
      </template>
      <template #content>
        <div class="materials-uploader-compact">
          <materials-uploader
            :materials="meetingMaterials"
            :is-loading="isUploading"
            :compact="true"
            :upload-options="{ ...uploadOptions, maxFiles: 10 }"
            @upload="handleMaterialsUpload"
            @delete="handleMaterialDelete"
            @preview="handleMaterialPreview"
            @download="handleMaterialDownload"
            @refresh="refreshMaterials"
          />
        </div>
      </template>
    </Card>

    <!-- 特殊要求 - 紧凑设计 -->
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
            rows="2"
            class="w-full"
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
    max-width: 1400px;
    margin: 0 auto;
  }

  .field-group {
    margin-bottom: 0.5rem;
  }

  .field-group label {
    font-weight: 500;
    font-size: 0.875rem;
  }

  /* 横向布局的表单组 */
  .field-group-horizontal {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .field-label {
    min-width: 100px;
    width: 100px;
    flex-shrink: 0;
    padding-top: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
    text-align: right;
  }

  .field-input-wrapper {
    flex: 1;
    min-width: 0;
  }

  /* 紧凑布局样式 */
  .space-y-3 > * + * {
    margin-top: 0.5rem;
  }

  .gap-3 {
    gap: 0.5rem;
  }

  /* 会议材料上传紧凑样式 */
  .materials-uploader-compact {
    /* max-height: 180px; */
    overflow-y: auto;
  }

  .materials-uploader-compact :deep(.p-card-body) {
    padding: 0.5rem;
  }

  /* 响应式设计 */
  @media (max-width: 1024px) {
    .grid.lg\\:grid-cols-2 {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 768px) {
    .detailed-reservation-form {
      padding: 0 0.5rem;
    }

    .grid {
      grid-template-columns: 1fr !important;
    }

    .grid.sm\\:grid-cols-2 {
      grid-template-columns: 1fr !important;
    }
  }

  /* 卡片间距优化 - 更紧凑 */
  .p-card {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    border-radius: 6px;
    margin-bottom: 0.75rem;
  }

  .p-card :deep(.p-card-header) {
    background-color: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
    padding: 0.5rem 0.75rem;
  }

  .p-card :deep(.p-card-title) {
    font-size: 1rem;
    font-weight: 600;
  }

  .p-card :deep(.p-card-content) {
    padding: 0.75rem;
  }

  /* 表单字段样式优化 - 更紧凑 */
  .p-inputtext,
  .p-dropdown,
  .p-inputnumber,
  .p-textarea {
    transition: all 0.2s ease;
    padding: 0.375rem 0.625rem;
    font-size: 0.875rem;
  }

  .p-inputtext:focus,
  .p-dropdown:focus,
  .p-inputnumber:focus,
  .p-textarea:focus {
    box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.1);
  }

  /* PrimeVue 组件紧凑化 */
  .p-dropdown :deep(.p-dropdown-label) {
    font-size: 0.875rem;
    padding: 0.375rem 0.625rem;
  }

  .p-inputnumber :deep(.p-inputnumber-input) {
    font-size: 0.875rem;
    padding: 0.375rem 0.625rem;
  }

  /* 时间选择器紧凑化 */
  .max-h-64 {
    max-height: 16rem;
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
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
  }

  /* 设备选择和服务选择组件紧凑化 */
  .equipment-compact,
  .services-compact {
    margin-bottom: 0.75rem;
  }

  .equipment-compact, services, materials :deep(.p-card-content),
  .services-compact :deep(.p-card-content) {
    padding: 0.5rem;
  }

  /* 参会人员管理紧凑化 */
  .attendees-compact :deep(.p-card-content) {
    padding: 0.5rem;
  }

  /* 时间显示区域紧凑化 */
  .rounded-md {
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
  }

  /* 滚动条样式 */
  .overflow-y-auto::-webkit-scrollbar {
    width: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  
  .service-category {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 0.75rem;
    background-color: #f9fafb;
  }

  .category-header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0.5rem;
  }

  .service-item {
    background-color: white;
    border-color: #e5e7eb;
    transition: all 0.2s ease;
  }

  .service-item:hover {
    background-color: #f3f4f6;
    transform: translateY(-1px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .service-item.selected {
    background-color: #eff6ff;
    border-color: #3b82f6;
  }

  /* Checkbox 样式优化 */
  .service-item :deep(.p-checkbox .p-checkbox-box) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .service-item :deep(.p-checkbox .p-checkbox-box.p-highlight) {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }
</style>
