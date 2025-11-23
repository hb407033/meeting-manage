<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRoute, useRouter } from 'vue-router'

// 导入详细预约表单组件
import DetailedReservationForm from '~/components/features/reservations/DetailedReservationForm.vue'

// 导入store
import { useReservationStore } from '~/stores/reservations'
import { useRoomStore } from '~/stores/rooms'

// 导入认证composable
import { useAuth } from '~/composables/useAuth'

// 使用路由
const route = useRoute()
const router = useRouter()

// 检查是否为编辑模式
const isEditMode = computed(() => !!route.query.edit)
const editReservationId = computed(() => route.query.edit as string)

// 检查是否为查看模式（通过hash参数传递预约ID）
const isViewMode = computed(() => !isEditMode.value && !!route.hash && route.hash.startsWith('#'))
const viewReservationId = computed(() => isViewMode.value ? route.hash.slice(1) : '')

// 页面设置
definePageMeta({
  layout: 'default',
  title: computed(() => {
    if (isEditMode.value) return '编辑预约'
    if (isViewMode.value) return '预约详情'
    return '详细预约配置'
  }),
  description: computed(() => {
    if (isEditMode.value) return '编辑会议室预约信息'
    if (isViewMode.value) return '查看会议室预约详细信息'
    return '使用详细配置表单创建新的会议室预约'
  })
})

// 响应式数据
const message = ref('欢迎使用详细预约配置系统!')
const isSubmitting = ref(false)
const initialData = ref<Partial<ReservationFormData>>({})

// 使用store
const reservationStore = useReservationStore()
const roomStore = useRoomStore()

// 使用认证composable
const { user } = useAuth()

// 适配表单数据类型
interface ReservationFormData {
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

// 处理表单提交
async function handleFormSubmit(formData: ReservationFormData) {
  if (!formData.roomId || !formData.startTime || !formData.endTime) {
    message.value = '请完善预约信息'
    return
  }

  isSubmitting.value = true
  message.value = isEditMode.value ? '正在更新预约...' : '正在提交预约...'

  try {
    let response
    if (isEditMode.value && editReservationId.value) {
      // 编辑模式：更新现有预约 - 仍使用原来的逻辑，因为store中暂时没有详细更新方法
      const reservationData = {
        title: formData.title.trim(),
        roomId: formData.roomId,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        attendeeCount: formData.attendeeCount,
        description: formData.description?.trim() || '',
        importanceLevel: formData.importanceLevel,
        equipment: formData.equipment || [],
        services: formData.services || [],
        attendeeList: formData.attendeeList || [],
        meetingMaterials: formData.meetingMaterials || [],
        budgetAmount: formData.budgetAmount,
        isRecurring: formData.isRecurring || false,
        recurringPattern: formData.recurringPattern,
        specialRequirements: formData.specialRequirements || '',
        organizerName: user.value?.name || '未知用户',
        organizerId: user.value?.id
      }

      response = await reservationStore.updateReservationData(editReservationId.value, reservationData)
      console.log('预约更新成功:', response)
      message.value = '预约更新成功！'
    } else {
      // 创建模式：使用新的 store 方法创建详细预约
      console.log('使用 store 创建详细预约...')
      response = await reservationStore.createDetailedReservation({
        title: formData.title.trim(),
        description: formData.description?.trim(),
        importanceLevel: formData.importanceLevel,
        attendeeCount: formData.attendeeCount,
        roomId: formData.roomId,
        startTime: formData.startTime,
        endTime: formData.endTime,
        budgetAmount: formData.budgetAmount,
        equipment: formData.equipment || [],
        services: formData.services || [],
        attendeeList: formData.attendeeList || [],
        meetingMaterials: formData.meetingMaterials || [],
        isRecurring: formData.isRecurring || false,
        recurringPattern: formData.recurringPattern,
        specialRequirements: formData.specialRequirements || ''
      })
      console.log('详细预约创建成功:', response)
      message.value = '预约创建成功！'
    }

    // 只有在创建模式下才跳转
    if (!isEditMode.value) {
      setTimeout(() => {
        router.push('/reservations/my')
      }, 2000)
    }

  } catch (err: any) {
    console.error(isEditMode.value ? '预约更新失败:' : '预约创建失败:', err)

    // 使用 store 的错误信息
    const errorMessage = reservationStore.error || err.data?.message || err.message || '未知错误'
    message.value = `${isEditMode.value ? '更新' : '创建'}预约失败: ${errorMessage}`
  } finally {
    isSubmitting.value = false
  }
}

// 处理保存草稿
async function handleSaveDraft(formData: ReservationFormData) {
  try {
    // 这里可以实现保存草稿的逻辑
    console.log('保存草稿:', formData)
    message.value = '草稿保存成功！'
  } catch (error) {
    console.error('保存草稿失败:', error)
    message.value = '保存草稿失败'
  }
}

// 处理取消
function handleCancel() {
  if (isEditMode.value) {
    router.push('/reservations/my')
  } else {
    router.push('/reservations')
  }
}

// 加载编辑模式的预约数据
async function loadEditReservation() {
  if (!isEditMode.value || !editReservationId.value) return

  try {
    message.value = '正在加载预约数据...'
    
    // 使用 store 获取预约数据
    await reservationStore.fetchReservation(editReservationId.value)
    const reservation = reservationStore.currentReservation

    if (!reservation) {
      message.value = '预约不存在或已被删除'
      router.push('/reservations/my')
      return
    }

    // 检查是否已结束
    if (reservation.endTime && new Date(reservation.endTime) < new Date()) {
      message.value = '不能编辑已结束的预约'
      setTimeout(() => {
        router.push('/reservations/my')
      }, 2000)
      return
    }

    // 检查权限：只有预约组织者可以编辑
    const isOrganizer = reservation.organizerId === user.value?.id ||
                       reservation.organizer?.email === user.value?.email

    if (!isOrganizer) {
      message.value = '您没有权限编辑此预约'
      router.push('/reservations/my')
      return
    }

    // 设置初始数据
    initialData.value = {
      title: reservation.title || '',
      description: reservation.description || '',
      importanceLevel: reservation.importanceLevel || 'NORMAL',
      attendeeCount: reservation.attendeeCount || 1,
      roomId: reservation.roomId || '',
      startTime: reservation.startTime ? new Date(reservation.startTime) : null,
      endTime: reservation.endTime ? new Date(reservation.endTime) : null,
      budgetAmount: reservation.budgetAmount || null,
      equipment: reservation.equipment || [],
      services: reservation.services || [],
      attendeeList: reservation.attendeeList || [],
      meetingMaterials: reservation.meetingMaterials || [],
      isRecurring: reservation.isRecurring || false,
      recurringPattern: reservation.recurringPattern || null,
      specialRequirements: reservation.specialRequirements || '',
      organizerName: reservation.organizerName || reservation.organizer?.name || user.value?.name || ''
    }

    message.value = '预约数据加载完成！您可以修改预约信息'

  } catch (error: any) {
    console.error('加载预约数据失败:', error)
    message.value = `加载预约数据失败: ${error.message}`
  }
}

// 加载查看模式的预约数据
async function loadViewReservation() {
  if (!isViewMode.value || !viewReservationId.value) return

  try {
    message.value = '正在加载预约详情...'

    // 使用 store 获取预约数据
    await reservationStore.fetchReservation(viewReservationId.value)
    const reservation = reservationStore.currentReservation

    if (!reservation) {
      message.value = '预约不存在或已被删除'
      router.push('/reservations/my')
      return
    }

    // 设置初始数据用于显示
    initialData.value = {
      title: reservation.title || '',
      description: reservation.description || '',
      importanceLevel: reservation.importanceLevel || 'NORMAL',
      attendeeCount: reservation.attendeeCount || 1,
      roomId: reservation.roomId || '',
      startTime: reservation.startTime ? new Date(reservation.startTime) : null,
      endTime: reservation.endTime ? new Date(reservation.endTime) : null,
      budgetAmount: reservation.budgetAmount || null,
      equipment: reservation.equipment || [],
      services: reservation.services || [],
      attendeeList: reservation.attendeeList || [],
      meetingMaterials: reservation.meetingMaterials || [],
      isRecurring: reservation.isRecurring || false,
      recurringPattern: reservation.recurringPattern || null,
      specialRequirements: reservation.specialRequirements || ''
    }

    message.value = '预约详情加载完成'

  } catch (error: any) {
    console.error('加载预约详情失败:', error)
    message.value = `加载预约详情失败: ${error.message}`
  }
}

// 获取重要性级别文本
function getImportanceLevelText(level: string): string {
  switch (level) {
    case 'LOW': return '低'
    case 'NORMAL': return '普通'
    case 'HIGH': return '高'
    case 'URGENT': return '紧急'
    default: return '普通'
  }
}

// 获取会议室名称
function getRoomName(roomId?: string): string {
  if (!roomId) return '未知'
  const room = roomStore.rooms.find(r => r.id === roomId)
  return room ? room.name : '未知会议室'
}

// 格式化日期时间
function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '未知'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
}

// 检查是否可以编辑当前预约
function canEditCurrentReservation(): boolean {
  if (!user.value || !viewReservationId.value) return false

  const reservation = reservationStore.currentReservation
  if (!reservation) return false

  // 检查是否已结束
  if (reservation.endTime && new Date(reservation.endTime) < new Date()) {
    return false
  }

  // 管理员可以编辑
  if (user.value.role === 'ADMIN') return true

  // 检查是否是组织者
  const isOrganizer = reservation.organizerId === user.value.id ||
                     reservation.organizer?.email === user.value.email
  return isOrganizer
}

// 编辑当前预约
function editCurrentReservation() {
  if (viewReservationId.value) {
    router.push(`/reservations/detailed?edit=${viewReservationId.value}`)
  }
}

// 生命周期
onMounted(async () => {
  console.log('✅ Detailed Reservations page mounted successfully!')

  // 根据模式显示不同消息
  if (isEditMode.value) {
    message.value = '正在加载编辑数据...'
  } else if (isViewMode.value) {
    message.value = '正在加载预约详情...'
  } else {
    message.value = '欢迎使用详细预约配置系统！'
  }

  // 加载会议室数据
  try {
    await roomStore.fetchRooms()
  } catch (err: any) {
    console.error('加载会议室失败:', err)
    message.value = `加载会议室失败: ${err.message}`
  }

  // 如果是编辑模式，加载预约数据
  if (isEditMode.value) {
    await loadEditReservation()
  } else if (isViewMode.value) {
    // 如果是查看模式，加载预约详情
    await loadViewReservation()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <UniversalHeader />

    <!-- 状态消息 -->
    <!-- <div v-if="message" class="container mx-auto px-4 py-3">
      <div :class="[
        'rounded-lg p-4 flex items-center gap-3',
        message.includes('成功') ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
      ]">
        <i :class="message.includes('成功') ? 'pi pi-check-circle text-green-600' : 'pi pi-info-circle text-blue-600'"></i>
        <span :class="message.includes('成功') ? 'text-green-800' : 'text-blue-800'">{{ message }}</span>
      </div>
    </div> -->

    <!-- 主要内容区域 -->
    <div class="container mx-auto px-4 py-6">
      <!-- 页面标题 -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <i class="pi pi-calendar-plus text-blue-600"></i>
              {{ isEditMode ? '编辑预约' : '详细预约配置' }}
            </h1>
            <p class="mt-2 text-gray-600">
              {{ isEditMode ? '修改会议室预约信息' : '使用详细配置表单创建新的会议室预约，支持设备、服务、材料等完整配置' }}
            </p>
          </div>

          <!-- 返回按钮 -->
          <Button
            label="返回"
            icon="pi pi-arrow-left"
            class="p-button-outlined"
            @click="handleCancel"
          />
        </div>
      </div>

      <!-- 查看模式：预约详情 -->
    <div v-if="isViewMode" class="bg-white rounded-lg shadow-sm border">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">预约详情</h2>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 左列：基本信息 -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">会议主题</label>
              <p class="mt-1 text-sm text-gray-900">{{ initialData.title || '无' }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">会议描述</label>
              <p class="mt-1 text-sm text-gray-900">{{ initialData.description || '无' }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">重要性级别</label>
              <p class="mt-1 text-sm text-gray-900">
                {{ getImportanceLevelText(initialData.importanceLevel) }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">参会人数</label>
              <p class="mt-1 text-sm text-gray-900">{{ initialData.attendeeCount || 1 }}人</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">特殊要求</label>
              <p class="mt-1 text-sm text-gray-900">{{ initialData.specialRequirements || '无' }}</p>
            </div>
          </div>

          <!-- 右列：时间地点信息 -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">会议室</label>
              <p class="mt-1 text-sm text-gray-900">{{ getRoomName(initialData.roomId) }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">开始时间</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatDateTime(initialData.startTime) }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">结束时间</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatDateTime(initialData.endTime) }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">预算金额</label>
              <p class="mt-1 text-sm text-gray-900">
                {{ initialData.budgetAmount ? `¥${initialData.budgetAmount}` : '无' }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">重复预约</label>
              <p class="mt-1 text-sm text-gray-900">
                {{ initialData.isRecurring ? '是' : '否' }}
              </p>
            </div>
          </div>
        </div>

        <!-- 详细配置信息 -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <h3 class="text-lg font-medium text-gray-900 mb-4">详细配置</h3>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 设备信息 -->
            <div v-if="initialData.equipment && initialData.equipment.length > 0">
              <h4 class="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                <i class="pi pi-cog text-blue-600"></i>
                设备配置
              </h4>
              <div class="space-y-2">
                <div
                  v-for="(item, index) in initialData.equipment"
                  :key="index"
                  class="flex items-center p-3 bg-blue-50 rounded-lg"
                >
                  <i class="pi pi-check-circle text-blue-600 mr-3"></i>
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ item.name || item }}</div>
                    <div v-if="item.specification" class="text-xs text-gray-500">{{ item.specification }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 服务配置 -->
            <div v-if="initialData.services && initialData.services.length > 0">
              <h4 class="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                <i class="pi pi-star text-yellow-600"></i>
                服务预订
              </h4>
              <div class="space-y-2">
                <div
                  v-for="(service, index) in initialData.services"
                  :key="index"
                  class="flex items-center p-3 bg-yellow-50 rounded-lg"
                >
                  <i class="pi pi-check-circle text-yellow-600 mr-3"></i>
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ service.name || service }}</div>
                    <div v-if="service.quantity" class="text-xs text-gray-500">数量: {{ service.quantity }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 会议材料 -->
            <div v-if="initialData.meetingMaterials && initialData.meetingMaterials.length > 0">
              <h4 class="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                <i class="pi pi-file text-green-600"></i>
                会议材料
              </h4>
              <div class="space-y-2">
                <div
                  v-for="(material, index) in initialData.meetingMaterials"
                  :key="index"
                  class="flex items-center p-3 bg-green-50 rounded-lg"
                >
                  <i class="pi pi-file-pdf text-green-600 mr-3"></i>
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900">{{ material.name || material.fileName }}</div>
                    <div v-if="material.type" class="text-xs text-gray-500">类型: {{ material.type }}</div>
                    <div v-if="material.size" class="text-xs text-gray-500">大小: {{ material.size }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 参与人员列表 -->
            <div v-if="initialData.attendeeList && initialData.attendeeList.length > 0">
              <h4 class="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                <i class="pi pi-users text-purple-600"></i>
                参与人员
              </h4>
              <div class="space-y-2">
                <div
                  v-for="(attendee, index) in initialData.attendeeList"
                  :key="index"
                  class="flex items-center p-3 bg-purple-50 rounded-lg"
                >
                  <div class="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center mr-3">
                    <span class="text-xs font-medium text-purple-800">
                      {{ (attendee.name || '').charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900">{{ attendee.name }}</div>
                    <div v-if="attendee.email" class="text-xs text-gray-500">{{ attendee.email }}</div>
                    <div v-if="attendee.phone" class="text-xs text-gray-500">{{ attendee.phone }}</div>
                  </div>
                  <div v-if="attendee.type" class="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded-full">
                    {{ attendee.type === 'internal' ? '内部' : '外部' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="mt-6 flex gap-3">
          <Button
            label="返回列表"
            icon="pi pi-arrow-left"
            class="p-button-outlined"
            @click="handleCancel"
          />
          <Button
            v-if="canEditCurrentReservation()"
            label="编辑预约"
            icon="pi pi-pencil"
            @click="editCurrentReservation"
          />
        </div>
      </div>
    </div>

    <!-- 编辑/创建模式：详细预约表单 -->
    <div v-else class="bg-white rounded-lg shadow-sm border">
      <DetailedReservationForm
        :room-id="route.query.roomId as string"
        :initial-data="initialData"
        @submit="handleFormSubmit"
        @save-draft="handleSaveDraft"
        @cancel="handleCancel"
      />
    </div>

      <!-- 功能说明 -->
      <div class="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <i class="pi pi-info-circle"></i>
          功能说明
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div class="flex items-start gap-2">
            <i class="pi pi-check-circle text-blue-600 mt-0.5"></i>
            <div>
              <strong>详细配置：</strong>支持设置会议主题、重要性级别、预算等信息
            </div>
          </div>
          <div class="flex items-start gap-2">
            <i class="pi pi-check-circle text-blue-600 mt-0.5"></i>
            <div>
              <strong>设备选择：</strong>可选择投影仪、音响、白板等会议设备
            </div>
          </div>
          <div class="flex items-start gap-2">
            <i class="pi pi-check-circle text-blue-600 mt-0.5"></i>
            <div>
              <strong>服务配置：</strong>可预订茶水、餐饮、技术支持等服务
            </div>
          </div>
          <div class="flex items-start gap-2">
            <i class="pi pi-check-circle text-blue-600 mt-0.5"></i>
            <div>
              <strong>人员管理：</strong>支持添加内部员工和外部访客信息
            </div>
          </div>
          <div class="flex items-start gap-2">
            <i class="pi pi-check-circle text-blue-600 mt-0.5"></i>
            <div>
              <strong>材料上传：</strong>支持上传会议相关文档和材料
            </div>
          </div>
          <div class="flex items-start gap-2">
            <i class="pi pi-check-circle text-blue-600 mt-0.5"></i>
            <div>
              <strong>重复预约：</strong>支持设置定期重复会议模式
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  @apply max-w-7xl;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>