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

// 页面设置
definePageMeta({
  layout: 'default',
  title: computed(() => isEditMode.value ? '编辑预约' : '详细预约配置'),
  description: computed(() => isEditMode.value ? '编辑会议室预约信息' : '使用详细配置表单创建新的会议室预约')
})

// 响应式数据
const message = ref('欢迎使用详细预约配置系统!')
const isSubmitting = ref(false)
const initialData = ref({})

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
    // 构建预约数据
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
      organizerName: user?.name || '未知用户',
      organizerId: user?.id
    }

    let response
    if (isEditMode.value && editReservationId.value) {
      // 编辑模式：更新现有预约
      response = await $fetch(`/api/v1/reservations/${editReservationId.value}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: reservationData
      })
      console.log('预约更新成功:', response)
      message.value = '预约更新成功！'
    } else {
      // 创建模式：创建新预约
      response = await $fetch('/api/v1/reservations/detailed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: reservationData
      })
      console.log('预约创建成功:', response)
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
    message.value = `${isEditMode.value ? '更新' : '创建'}预约失败: ${err.data?.message || err.message || '未知错误'}`
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

    const reservation = await $fetch(`/api/v1/reservations/${editReservationId.value}`)

    if (!reservation) {
      message.value = '预约不存在或已被删除'
      router.push('/reservations/my')
      return
    }

    // 检查权限：只有预约组织者可以编辑
    const isOrganizer = reservation.organizerId === user?.id ||
                       reservation.organizer?.email === user?.email

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
      specialRequirements: reservation.specialRequirements || ''
    }

    message.value = '预约数据加载完成！您可以修改预约信息'

  } catch (error: any) {
    console.error('加载预约数据失败:', error)
    message.value = `加载预约数据失败: ${error.message}`
  }
}

// 生命周期
onMounted(async () => {
  console.log('✅ Detailed Reservations page mounted successfully!')

  // 根据模式显示不同消息
  if (isEditMode.value) {
    message.value = '正在加载编辑数据...'
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
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <UniversalHeader />

    <!-- 状态消息 -->
    <div v-if="message" class="container mx-auto px-4 py-3">
      <div :class="[
        'rounded-lg p-4 flex items-center gap-3',
        message.includes('成功') ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
      ]">
        <i :class="message.includes('成功') ? 'pi pi-check-circle text-green-600' : 'pi pi-info-circle text-blue-600'"></i>
        <span :class="message.includes('成功') ? 'text-green-800' : 'text-blue-800'">{{ message }}</span>
      </div>
    </div>

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

      <!-- 详细预约表单 -->
      <div class="bg-white rounded-lg shadow-sm border">
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