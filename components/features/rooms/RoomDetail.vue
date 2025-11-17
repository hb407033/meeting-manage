<template>
  <div class="room-detail">
    <div v-if="room" class="space-y-6">
      <!-- 基本信息 -->
      <div>
        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i class="pi pi-info-circle"></i>
          基本信息
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-600">会议室名称</label>
            <p class="text-base font-medium">{{ room.name }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600">位置</label>
            <p class="text-base">{{ room.location || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600">容量</label>
            <div class="flex items-center gap-2">
              <i class="pi pi-users text-gray-400"></i>
              <span class="text-base">{{ room.capacity }}人</span>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600">状态</label>
            <Tag
              :value="getStatusLabel(room.status)"
              :severity="getStatusSeverity(room.status)"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600">是否需要审批</label>
            <Tag
              :value="room.requiresApproval ? '需要审批' : '无需审批'"
              :severity="room.requiresApproval ? 'warning' : 'success'"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600">创建时间</label>
            <p class="text-base">{{ formatDate(room.createdAt) }}</p>
          </div>
        </div>
        <div v-if="room.description" class="mt-4">
          <label class="text-sm font-medium text-gray-600">描述</label>
          <p class="text-base mt-1">{{ room.description }}</p>
        </div>
      </div>

      <!-- 设备配置 -->
      <div>
        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i class="pi pi-cog"></i>
          设备配置
        </h3>
        <div v-if="hasEquipment" class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div
            v-for="(enabled, equipment) in equipmentList"
            :key="equipment"
            class="flex items-center gap-2 p-3 rounded-lg border"
            :class="enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'"
          >
            <i
              class="pi"
              :class="enabled ? 'pi-check-circle text-green-600' : 'pi-times-circle text-gray-400'"
            ></i>
            <span :class="enabled ? 'text-green-700 font-medium' : 'text-gray-500'">
              {{ getEquipmentLabel(equipment) }}
            </span>
          </div>
        </div>
        <div v-if="room.equipment?.customList?.length" class="mt-4">
          <label class="text-sm font-medium text-gray-600">其他设备</label>
          <div class="flex flex-wrap gap-2 mt-2">
            <Tag
              v-for="item in room.equipment.customList"
              :key="item"
              :value="item"
              severity="info"
            />
          </div>
        </div>
        <div v-if="!hasEquipment" class="text-center py-4 text-gray-500">
          <i class="pi pi-info-circle text-2xl mb-2"></i>
          <p>暂无设备配置</p>
        </div>
      </div>

      <!-- 预约规则 -->
      <div>
        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i class="pi pi-clock"></i>
          预约规则
        </h3>
        <div v-if="hasRules" class="space-y-3">
          <div v-if="room.rules?.minBookingDuration" class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span class="text-blue-700">最短预约时长</span>
            <span class="font-medium text-blue-900">{{ room.rules.minBookingDuration }}分钟</span>
          </div>
          <div v-if="room.rules?.maxBookingDuration" class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span class="text-blue-700">最长预约时长</span>
            <span class="font-medium text-blue-900">{{ room.rules.maxBookingDuration }}分钟</span>
          </div>
          <div v-if="room.rules?.allowedTimeRange?.start || room.rules?.allowedTimeRange?.end" class="p-3 bg-blue-50 rounded-lg">
            <div class="text-blue-700 mb-2">允许预约时间范围</div>
            <div class="flex justify-center gap-4">
              <span class="font-medium text-blue-900">
                <i class="pi pi-sun text-yellow-500 mr-1"></i>
                {{ room.rules.allowedTimeRange.start || '不限' }}
              </span>
              <span class="text-blue-600">至</span>
              <span class="font-medium text-blue-900">
                <i class="pi pi-moon text-indigo-500 mr-1"></i>
                {{ room.rules.allowedTimeRange.end || '不限' }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4 text-gray-500">
          <i class="pi pi-clock text-2xl mb-2"></i>
          <p>暂无特殊预约规则</p>
        </div>
      </div>

      <!-- 图片展示 -->
      <div v-if="room.images?.length">
        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i class="pi pi-image"></i>
          会议室图片
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(image, index) in room.images"
            :key="index"
            class="relative group"
          >
            <img
              :src="image.url"
              :alt="image.caption || `会议室图片${index + 1}`"
              class="w-full h-48 object-cover rounded-lg border border-gray-200"
              @error="handleImageError"
            />
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
              <Button
                icon="pi pi-eye"
                size="small"
                class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                @click="previewImage(image)"
                v-tooltip="'查看大图'"
              />
            </div>
            <div v-if="image.caption" class="mt-2 text-sm text-gray-600 text-center">
              {{ image.caption }}
            </div>
          </div>
        </div>
      </div>

      <!-- 操作历史 -->
      <div>
        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i class="pi pi-history"></i>
          操作历史
        </h3>
        <RoomHistoryView :room-id="room.id" />
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <Dialog
      v-model:visible="showImagePreview"
      modal
      header="图片预览"
      :style="{ width: '90vw', maxWidth: '800px' }"
    >
      <div v-if="previewImage" class="text-center">
        <img
          :src="previewImage.url"
          :alt="previewImage.caption || '图片'"
          class="max-w-full max-h-96 object-contain"
        />
        <p v-if="previewImage.caption" class="mt-4 text-gray-600">{{ previewImage.caption }}</p>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
interface Room {
  id: string
  name: string
  description?: string
  capacity: number
  location?: string
  status: string
  equipment?: any
  images?: Array<{ url: string; type: string; caption?: string }>
  rules?: any
  requiresApproval: boolean
  createdAt: string
  updatedAt: string
}

interface Props {
  room: Room
}

defineProps<Props>()

// 响应式数据
const showImagePreview = ref(false)
const previewImage = ref<{ url: string; caption?: string } | null>(null)

// 计算属性
const hasEquipment = computed(() => {
  if (!props.room?.equipment) return false
  return Object.keys(props.room.equipment).some(key => {
    if (key === 'customList') return false
    return props.room.equipment[key]
  })
})

const equipmentList = computed(() => {
  const defaultEquipment = {
    projector: false,
    whiteboard: false,
    videoConf: false,
    airCondition: false,
    wifi: false,
    tv: false
  }

  return {
    ...defaultEquipment,
    ...(props.room?.equipment || {})
  }
})

const hasRules = computed(() => {
  if (!props.room?.rules) return false
  return Object.keys(props.room.rules).some(key => {
    if (key === 'allowedTimeRange') {
      const timeRange = props.room.rules[key]
      return timeRange && (timeRange.start || timeRange.end)
    }
    return props.room.rules[key] !== null && props.room.rules[key] !== undefined
  })
})

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
  const severityMap: Record<string, string> = {
    'AVAILABLE': 'success',
    'OCCUPIED': 'warning',
    'MAINTENANCE': 'danger',
    'RESERVED': 'info',
    'DISABLED': 'secondary'
  }
  return severityMap[status] || 'secondary'
}

const getEquipmentLabel = (equipment: string): string => {
  const labelMap: Record<string, string> = {
    'projector': '投影仪',
    'whiteboard': '白板',
    'videoConf': '视频会议',
    'airCondition': '空调',
    'wifi': 'WiFi',
    'tv': '电视'
  }
  return labelMap[equipment] || equipment
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.src = '/images/placeholder-room.jpg' // 设置默认图片
}

const previewImage = (image: { url: string; caption?: string }) => {
  previewImage.value = image
  showImagePreview.value = true
}
</script>

<style scoped>
.room-detail {
  max-width: 100%;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
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

@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.items-end {
  align-items: flex-end;
}

.justify-between {
  justify-content: space-between;
}

.justify-center {
  justify-content: center;
}

.gap-1 {
  gap: 0.25rem;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.relative {
  position: relative;
}

.group:hover .group-hover\:bg-opacity-30 {
  background-color: rgba(0, 0, 0, 0.3);
}

.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

.opacity-0 {
  opacity: 0;
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.duration-200 {
  transition-duration: 200ms;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.border {
  border-width: 1px;
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.border-green-200 {
  border-color: #bbf7d0;
}

.object-cover {
  object-fit: cover;
}

.object-contain {
  object-fit: contain;
}

.w-full {
  width: 100%;
}

.h-48 {
  height: 12rem;
}

.max-w-full {
  max-width: 100%;
}

.max-h-96 {
  max-height: 24rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.text-center {
  text-align: center;
}

.text-sm {
  font-size: 0.875rem;
}

.text-base {
  font-size: 1rem;
}

.text-lg {
  font-size: 1.125rem;
}

.text-2xl {
  font-size: 1.5rem;
}

.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-600 {
  color: #4b5563;
}

.text-gray-700 {
  color: #374151;
}

.text-gray-800 {
  color: #1f2937;
}

.text-gray-900 {
  color: #111827;
}

.text-blue-600 {
  color: #2563eb;
}

.text-blue-700 {
  color: #1d4ed8;
}

.text-blue-900 {
  color: #1e3a8a;
}

.text-green-600 {
  color: #059669;
}

.text-green-700 {
  color: #047857;
}

.text-green-900 {
  color: #14532d;
}

.text-yellow-500 {
  color: #eab308;
}

.text-indigo-500 {
  color: #6366f1;
}

.bg-green-50 {
  background-color: #f0fdf4;
}

.bg-blue-50 {
  background-color: #eff6ff;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.bg-opacity-0 {
  background-color: rgba(0, 0, 0, 0);
}

.flex-wrap {
  flex-wrap: wrap;
}

.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.absolute {
  position: absolute;
}

.cursor-pointer {
  cursor: pointer;
}

:deep(.p-tag) {
  font-size: 0.875rem;
}

:deep(.p-dialog .p-dialog-header) {
  padding: 1.5rem 1.5rem 0 1.5rem;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 1.5rem;
}
</style>