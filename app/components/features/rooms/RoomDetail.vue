<template>
  <div class="room-detail">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 主要信息 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 基本信息 -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-home"></i>
              <span>基本信息</span>
            </div>
          </template>
          <template #content>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="field">
                <label class="block text-sm font-medium text-gray-700 mb-1">会议室名称</label>
                <p class="text-lg font-semibold">{{ room?.name || '-' }}</p>
              </div>
              <div class="field">
                <label class="block text-sm font-medium text-gray-700 mb-1">位置</label>
                <p class="text-lg">{{ room?.location || '-' }}</p>
              </div>
              <div class="field">
                <label class="block text-sm font-medium text-gray-700 mb-1">容量</label>
                <div class="flex items-center gap-2">
                  <i class="pi pi-users text-gray-400"></i>
                  <span class="text-lg">{{ room?.capacity || 0 }}人</span>
                </div>
              </div>
              <div class="field">
                <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <Tag
                  :value="getStatusLabel(room?.status)"
                  :severity="getStatusSeverity(room?.status)"
                />
              </div>
              <div class="field md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <p class="text-gray-700">{{ room?.description || '暂无描述' }}</p>
              </div>
            </div>
          </template>
        </Card>

        <!-- 设备配置 -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-cog"></i>
              <span>设备配置</span>
            </div>
          </template>
          <template #content>
            <div v-if="equipment && equipment.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                v-for="item in equipment"
                :key="item.name"
                class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <i :class="getEquipmentIcon(item.name)" class="text-gray-600"></i>
                <div>
                  <p class="font-medium">{{ item.name }}</p>
                  <p class="text-sm text-gray-600">{{ item.quantity }}{{ item.unit || '个' }}</p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              <i class="pi pi-inbox text-4xl mb-2"></i>
              <p>暂无设备配置信息</p>
            </div>
          </template>
        </Card>

        <!-- 使用规则 -->
        <Card v-if="rules && Object.keys(rules).length > 0">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-book"></i>
              <span>使用规则</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-4">
              <div v-if="rules.advanceBookingDays" class="flex items-center justify-between">
                <span class="text-gray-700">最多提前预订天数</span>
                <Tag :value="`${rules.advanceBookingDays}天`" severity="info" />
              </div>
              <div v-if="rules.maxBookingDuration" class="flex items-center justify-between">
                <span class="text-gray-700">单次最长时间</span>
                <Tag :value="`${rules.maxBookingDuration}小时`" severity="info" />
              </div>
              <div v-if="rules.minBookingDuration" class="flex items-center justify-between">
                <span class="text-gray-700">最短预订时间</span>
                <Tag :value="`${rules.minBookingDuration}小时`" severity="info" />
              </div>
              <div v-if="rules.maxConcurrentBookings" class="flex items-center justify-between">
                <span class="text-gray-700">最大并发预订数</span>
                <Tag :value="`${rules.maxConcurrentBookings}个`" severity="info" />
              </div>
              <div v-if="rules.requiresApproval !== undefined" class="flex items-center justify-between">
                <span class="text-gray-700">需要审批</span>
                <Tag :value="rules.requiresApproval ? '是' : '否'" :severity="rules.requiresApproval ? 'warning' : 'success'" />
              </div>
              <div v-if="rules.allowedTimeRange" class="flex items-center justify-between">
                <span class="text-gray-700">允许使用时间</span>
                <Tag :value="`${rules.allowedTimeRange.start} - ${rules.allowedTimeRange.end}`" severity="secondary" />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- 右侧信息 -->
      <div class="space-y-6">
        <!-- 图片展示 -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-images"></i>
              <span>图片展示</span>
            </div>
          </template>
          <template #content>
            <div v-if="images && images.length > 0" class="space-y-3">
              <Galleria
                :value="images"
                :responsiveOptions="responsiveOptions"
                :numVisible="4"
                containerStyle="max-width: 100%"
                :showItemNavigators="true"
                :showThumbnailNavigators="true"
              >
                <template #item="slotProps">
                  <img
                    :src="slotProps.item.url"
                    :alt="slotProps.item.alt || '会议室图片'"
                    class="w-full rounded-lg"
                    style="max-height: 300px; object-fit: cover;"
                  />
                </template>
                <template #thumbnail="slotProps">
                  <img
                    :src="slotProps.item.url"
                    :alt="slotProps.item.alt || '会议室图片'"
                    class="w-full rounded"
                    style="height: 60px; object-fit: cover;"
                  />
                </template>
              </Galleria>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              <i class="pi pi-image text-4xl mb-2"></i>
              <p>暂无图片</p>
            </div>
          </template>
        </Card>

        <!-- 操作历史 -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-history"></i>
              <span>操作历史</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-3 max-h-64 overflow-y-auto">
              <div
                v-for="history in roomHistory"
                :key="history.id"
                class="p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium">{{ getActionTypeLabel(history.actionType) }}</span>
                  <span class="text-xs text-gray-500">{{ formatDate(history.createdAt) }}</span>
                </div>
                <div class="text-gray-600">
                  操作人：{{ history.operator?.name || '未知' }}
                </div>
                <div v-if="history.description" class="text-gray-600 text-xs mt-1">
                  {{ history.description }}
                </div>
              </div>
              <div v-if="!roomHistory || roomHistory.length === 0" class="text-center py-4 text-gray-500">
                <i class="pi pi-history text-2xl mb-1"></i>
                <p>暂无操作历史</p>
              </div>
            </div>
          </template>
        </Card>

        <!-- 统计信息 -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-chart-bar"></i>
              <span>统计信息</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">创建时间</span>
                <span class="text-sm">{{ formatDate(room?.createdAt) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">最后更新</span>
                <span class="text-sm">{{ formatDate(room?.updatedAt) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">预订次数</span>
                <Tag value="暂无统计" severity="secondary" />
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">使用率</span>
                <Tag value="暂无统计" severity="secondary" />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { MeetingRoom } from '~~/types/room'

interface Props {
  room: MeetingRoom
}

const props = defineProps<Props>()

// 图片轮播响应式配置
const responsiveOptions = ref([
  {
    breakpoint: '1300px',
    numVisible: 4
  },
  {
    breakpoint: '575px',
    numVisible: 1
  }
])

// 计算属性
const equipment = computed(() => {
  if (!props.room?.equipment) return []

  // 如果是数组格式，直接返回
  if (Array.isArray(props.room.equipment)) {
    return props.room.equipment
  }

  // 如果是对象格式，转换为数组格式
  const equip = props.room.equipment
  const result: any[] = []

  if (equip?.projector) result.push({ name: '投影仪', quantity: 1, unit: '个' })
  if (equip?.whiteboard) result.push({ name: '白板', quantity: 1, unit: '个' })
  if (equip?.videoConf) result.push({ name: '视频会议', quantity: 1, unit: '套' })
  if (equip?.airCondition) result.push({ name: '空调', quantity: 1, unit: '台' })
  if (equip?.wifi) result.push({ name: '网络', quantity: 1, unit: '个' })

  if (equip?.customEquipment && Array.isArray(equip.customEquipment)) {
    equip.customEquipment.forEach((item: string) => {
      result.push({ name: item, quantity: 1, unit: '个' })
    })
  }

  return result
})

const images = computed(() => {
  if (!props.room?.images) return []
  return Array.isArray(props.room.images) ? props.room.images : []
})

const rules = computed(() => {
  return props.room?.rules || {}
})

// 操作历史数据
const roomHistory = ref([])

// 方法
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'AVAILABLE': '可用',
    'OCCUPIED': '使用中',
    'MAINTENANCE': '维护中',
    'RESERVED': '已预约',
    'DISABLED': '禁用'
  }
  return statusMap[status] || status
}

const getStatusSeverity = (status: string): string => {
  switch (status) {
    case 'AVAILABLE': return 'success'
    case 'OCCUPIED': return 'warning'
    case 'MAINTENANCE': return 'danger'
    case 'RESERVED': return 'info'
    case 'DISABLED': return 'secondary'
    default: return 'secondary'
  }
}

const getEquipmentIcon = (equipmentName: string): string => {
  const iconMap: Record<string, string> = {
    '投影仪': 'pi pi-desktop',
    '白板': 'pi pi-pencil',
    '电视': 'pi pi-mobile',
    '音响': 'pi pi-volume-up',
    '麦克风': 'pi pi-microphone',
    '空调': 'pi pi-sun',
    '网络': 'pi pi-globe',
    '桌椅': 'pi pi-table',
    '电脑': 'pi pi-desktop'
  }
  return iconMap[equipmentName] || 'pi pi-cog'
}

const getActionTypeLabel = (actionType: string): string => {
  const actionMap: Record<string, string> = {
    'CREATE': '创建',
    'UPDATE': '更新',
    'DELETE': '删除',
    'STATUS_CHANGE': '状态变更',
    'UPLOAD_IMAGE': '上传图片'
  }
  return actionMap[actionType] || actionType
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载操作历史
const loadRoomHistory = async () => {
  try {
    const { $apiFetch } = useNuxtApp() as any
    const response = await $apiFetch(`/api/v1/rooms/${props.room.id}/history`)
    roomHistory.value = response.data || []
  } catch (error) {
    console.error('加载会议室历史失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadRoomHistory()
})
</script>

<style scoped>
.room-detail {
  padding: 1rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  margin-bottom: 0.5rem;
}

:deep(.p-card .p-card-content) {
  padding: 1.5rem;
}

:deep(.p-galleria .p-galleria-item) {
  border-radius: 0.5rem;
  overflow: hidden;
}

:deep(.p-galleria .p-galleria-thumbnail-item) {
  border-radius: 0.25rem;
  overflow: hidden;
}

:deep(.p-tag) {
  font-size: 0.875rem;
}
</style>