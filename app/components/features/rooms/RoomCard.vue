<template>
  <div class="room-card">
    <Card class="h-full">
      <!-- 图片区域 -->
      <template #header>
        <div class="relative h-48 overflow-hidden rounded-t-lg">
          <img
            :src="mainImage?.url || '/images/default-room.jpg'"
            :alt="room.name"
            class="w-full h-full object-cover"
            @error="handleImageError"
          />

          <!-- 状态标签 -->
          <Tag
            :value="statusText"
            :severity="getStatusSeverity(room.status)"
            class="absolute top-2 right-2"
          />

          <!-- 容量标签 -->
          <div class="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
            <i class="pi pi-users mr-1"></i>
            {{ room.capacity }}人
          </div>
        </div>
      </template>

      <!-- 内容区域 -->
      <template #content>
        <div class="space-y-3">
          <!-- 标题和位置 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ room.name }}</h3>
            <div v-if="room.location" class="flex items-center text-gray-600 text-sm">
              <i class="pi pi-map-marker mr-1"></i>
              {{ room.location }}
            </div>
          </div>

          <!-- 描述 -->
          <p v-if="room.description" class="text-gray-600 text-sm line-clamp-2">
            {{ room.description }}
          </p>

          <!-- 设施标签 -->
          <div class="flex flex-wrap gap-1">
            <Tag
              v-if="room.equipment?.projector"
              icon="pi pi-desktop"
              value="投影仪"
              severity="secondary"
              class="text-xs"
            />
            <Tag
              v-if="room.equipment?.whiteboard"
              icon="pi pi-pencil"
              value="白板"
              severity="secondary"
              class="text-xs"
            />
            <Tag
              v-if="room.equipment?.videoConf"
              icon="pi pi-video"
              value="视频会议"
              severity="secondary"
              class="text-xs"
            />
            <Tag
              v-if="room.equipment?.airCondition"
              icon="pi pi-sun"
              value="空调"
              severity="secondary"
              class="text-xs"
            />
            <Tag
              v-if="room.equipment?.wifi"
              icon="pi pi-wifi"
              value="WiFi"
              severity="secondary"
              class="text-xs"
            />
          </div>

          <!-- 预约信息 -->
          <div v-if="room._count?.reservations" class="text-sm text-gray-500">
            <i class="pi pi-calendar mr-1"></i>
            {{ room._count.reservations }} 个即将到来的预约
          </div>
        </div>
      </template>

      <!-- 操作按钮 -->
      <template #footer>
        <div class="flex gap-2">
          <Button
            label="查看详情"
            icon="pi pi-eye"
            size="small"
            variant="text"
            @click="$emit('view', room)"
          />

          <Button
            label="编辑"
            icon="pi pi-pencil"
            size="small"
            severity="secondary"
            variant="text"
            @click="$emit('edit', room)"
          />

          <Button
            label="删除"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            variant="text"
            @click="handleDelete"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { MeetingRoom } from '~/stores/rooms'

interface Props {
  room: MeetingRoom
}

const props = defineProps<Props>()

const emit = defineEmits<{
  view: [room: MeetingRoom]
  edit: [room: MeetingRoom]
  delete: [room: MeetingRoom]
}>()

const roomStore = useRoomStore()

// 获取主图片
const mainImage = computed(() => roomStore.getMainImage(props.room))

// 获取状态文本
const statusText = computed(() => roomStore.getStatusText(props.room.status))

// 获取状态严重程度
const getStatusSeverity = (status: string) => {
  const severityMap = {
    'AVAILABLE': 'success',
    'OCCUPIED': 'danger',
    'MAINTENANCE': 'warning',
    'RESERVED': 'info',
    'DISABLED': 'secondary'
  }
  return severityMap[status as keyof typeof severityMap] || 'secondary'
}

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/images/default-room.jpg'
}

// 处理删除
const handleDelete = () => {
  emit('delete', props.room)
}
</script>

<style scoped>
.room-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>