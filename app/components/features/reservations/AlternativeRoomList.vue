<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { format, addMinutes, isAfter, isBefore, isEqual } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface AlternativeRoom {
  id: string
  name: string
  type: string
  capacity: number
  location: string
  floor?: string
  equipment: string[]
  features: string[]
  status: 'available' | 'occupied' | 'maintenance'
  rating?: number
  price?: number
  images?: string[]
  availableSlots: TimeSlot[]
}

interface TimeSlot {
  startTime: Date
  endTime: Date
}

interface Filters {
  roomType: string
  minCapacity: number
  location: string
  equipment: string[]
  priceRange: [number, number]
  rating: number
}

interface Props {
  rooms: AlternativeRoom[]
  startTime: Date
  endTime: Date
  attendeeCount: number
  requiredEquipment?: string[]
  loading?: boolean
  showFilters?: boolean
  maxResults?: number
}

interface Emits {
  (e: 'roomSelect', room: AlternativeRoom, timeSlot: TimeSlot): void
  (e: 'roomCompare', rooms: AlternativeRoom[]): void
  (e: 'filtersChange', filters: Filters): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showFilters: true,
  maxResults: 10,
  requiredEquipment: () => []
})

const emit = defineEmits<Emits>()

// 内部状态
const selectedRoom = ref<AlternativeRoom | null>(null)
const selectedTimeSlot = ref<TimeSlot | null>(null)
const compareMode = ref(false)
const compareList = ref<AlternativeRoom[]>([])
const sortBy = ref<'match' | 'capacity' | 'rating' | 'price'>('match')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 过滤器
const filters = ref<Filters>({
  roomType: '',
  minCapacity: props.attendeeCount,
  location: '',
  equipment: [],
  priceRange: [0, 1000],
  rating: 0
})

// 计算属性
const roomTypes = computed(() => {
  const types = [...new Set(props.rooms.map(room => room.type))]
  return types.filter(Boolean)
})

const locations = computed(() => {
  const locs = [...new Set(props.rooms.map(room => room.location))]
  return locs.filter(Boolean)
})

const allEquipment = computed(() => {
  const equipment = new Set<string>()
  props.rooms.forEach(room => {
    room.equipment.forEach(eq => equipment.add(eq))
  })
  return Array.from(equipment).sort()
})

const filteredRooms = computed(() => {
  let filtered = [...props.rooms]

  // 类型过滤
  if (filters.value.roomType) {
    filtered = filtered.filter(room => room.type === filters.value.roomType)
  }

  // 容量过滤
  filtered = filtered.filter(room => room.capacity >= filters.value.minCapacity)

  // 位置过滤
  if (filters.value.location) {
    filtered = filtered.filter(room =>
      room.location.toLowerCase().includes(filters.value.location.toLowerCase())
    )
  }

  // 设备过滤
  if (filters.value.equipment.length > 0) {
    filtered = filtered.filter(room =>
      filters.value.equipment.every(eq => room.equipment.includes(eq))
    )
  }

  // 价格过滤
  if (props.rooms.some(room => room.price)) {
    filtered = filtered.filter(room => {
      if (!room.price) return true
      return room.price >= filters.value.priceRange[0] && room.price <= filters.value.priceRange[1]
    })
  }

  // 评分过滤
  if (filters.value.rating > 0) {
    filtered = filtered.filter(room =>
      (room.rating || 0) >= filters.value.rating
    )
  }

  return filtered
})

const sortedRooms = computed(() => {
  const rooms = [...filteredRooms.value]

  rooms.sort((a, b) => {
    let comparison = 0

    switch (sortBy.value) {
      case 'match':
        comparison = calculateMatchScore(b) - calculateMatchScore(a)
        break
      case 'capacity':
        comparison = b.capacity - a.capacity
        break
      case 'rating':
        comparison = (b.rating || 0) - (a.rating || 0)
        break
      case 'price':
        comparison = (a.price || 0) - (b.price || 0)
        break
    }

    return sortOrder.value === 'asc' ? comparison : -comparison
  })

  return rooms.slice(0, props.maxResults)
})

// 方法
function calculateMatchScore(room: AlternativeRoom): number {
  let score = 0

  // 容量匹配 (30分)
  if (room.capacity >= props.attendeeCount) {
    const capacityRatio = room.capacity / props.attendeeCount
    if (capacityRatio <= 1.2) score += 30 // 容量适中
    else if (capacityRatio <= 2) score += 20 // 容量稍大
    else score += 10 // 容量过大
  }

  // 设备匹配 (25分)
  if (props.requiredEquipment.length > 0) {
    const matchCount = props.requiredEquipment.filter(eq =>
      room.equipment.includes(eq)
    ).length
    score += (matchCount / props.requiredEquipment.length) * 25
  } else {
    score += 15 // 无设备要求时给予基础分数
  }

  // 可用时间匹配 (25分)
  const matchingSlot = room.availableSlots.find(slot =>
    isEqual(slot.startTime, props.startTime) && isEqual(slot.endTime, props.endTime)
  )
  if (matchingSlot) {
    score += 25
  } else {
    // 检查是否有重叠的可用时间段
    const overlappingSlot = room.availableSlots.find(slot =>
      isBefore(slot.startTime, props.endTime) && isAfter(slot.endTime, props.startTime)
    )
    if (overlappingSlot) {
      score += 15
    }
  }

  // 评分 (15分)
  if (room.rating) {
    score += room.rating * 3
  } else {
    score += 8 // 无评分时给予基础分数
  }

  // 位置偏好 (5分)
  if (room.location.includes('一楼') || room.location.includes('1F')) {
    score += 3 // 优先推荐一楼
  }

  return Math.round(score)
}

function handleRoomSelect(room: AlternativeRoom, timeSlot: TimeSlot): void {
  selectedRoom.value = room
  selectedTimeSlot.value = timeSlot
  emit('roomSelect', room, timeSlot)
}

function handleCompareToggle(): void {
  compareMode.value = !compareMode.value
}

function handleAddToCompare(room: AlternativeRoom): void {
  const index = compareList.value.findIndex(r => r.id === room.id)
  if (index > -1) {
    compareList.value.splice(index, 1)
  } else if (compareList.value.length < 3) {
    compareList.value.push(room)
  }
}

function handleCompareRooms(): void {
  if (compareList.value.length >= 2) {
    emit('roomCompare', compareList.value)
  }
}

function handleSortChange(newSortBy: typeof sortBy.value): void {
  if (sortBy.value === newSortBy) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = newSortBy
    sortOrder.value = 'desc'
  }
}

function handleFilterChange(): void {
  emit('filtersChange', filters.value)
}

function formatTimeRange(startTime: Date, endTime: Date): string {
  return `${format(startTime, 'HH:mm', { locale: zhCN })} - ${format(endTime, 'HH:mm', { locale: zhCN })}`
}

function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-100'
  if (score >= 60) return 'text-blue-600 bg-blue-100'
  if (score >= 40) return 'text-orange-600 bg-orange-100'
  return 'text-gray-600 bg-gray-100'
}

function getAvailabilityStatus(room: AlternativeRoom): {
  label: string
  color: string
  icon: string
} {
  const matchingSlot = room.availableSlots.find(slot =>
    isEqual(slot.startTime, props.startTime) && isEqual(slot.endTime, props.endTime)
  )

  if (matchingSlot) {
    return {
      label: '完全可用',
      color: 'text-green-600',
      icon: 'pi-check-circle'
    }
  }

  const overlappingSlot = room.availableSlots.find(slot =>
    isBefore(slot.startTime, props.endTime) && isAfter(slot.endTime, props.startTime)
  )

  if (overlappingSlot) {
    return {
      label: '部分可用',
      color: 'text-orange-600',
      icon: 'pi-exclamation-triangle'
    }
  }

  return {
    label: '不可用',
    color: 'text-red-600',
    icon: 'pi-times-circle'
  }
}

// 监听器
watch(() => props.requiredEquipment, (newEquipment) => {
  filters.value.equipment = [...newEquipment]
}, { immediate: true })
</script>

<template>
  <div class="alternative-room-list">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">替代会议室</h3>
        <p class="text-sm text-gray-600 mt-1">
          为 {{ format(startTime, 'HH:mm', { locale: zhCN }) }} - {{ format(endTime, 'HH:mm', { locale: zhCN }) }} 的预约寻找替代方案
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <!-- 排序选项 -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">排序:</span>
          <select
            v-model="sortBy"
            @change="handleSortChange(sortBy)"
            class="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="match">匹配度</option>
            <option value="capacity">容量</option>
            <option value="rating">评分</option>
            <option value="price">价格</option>
          </select>
          <button
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
            class="p-1 text-gray-500 hover:text-gray-700"
          >
            <i :class="`pi pi-sort-${sortOrder === 'asc' ? 'up' : 'down'}`"></i>
          </button>
        </div>

        <!-- 比较模式 -->
        <button
          @click="handleCompareToggle"
          class="px-3 py-2 text-sm border rounded-md transition-colors"
          :class="compareMode
            ? 'bg-blue-500 text-white border-blue-500'
            : 'border-gray-300 hover:bg-gray-50'"
        >
          <i class="pi pi-objects-column mr-2"></i>
          {{ compareMode ? '退出比较' : '比较会议室' }}
        </button>
      </div>
    </div>

    <!-- 过滤器 -->
    <div v-if="showFilters" class="bg-gray-50 rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 会议室类型 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">会议室类型</label>
          <select
            v-model="filters.roomType"
            @change="handleFilterChange"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部类型</option>
            <option v-for="type in roomTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>

        <!-- 最小容量 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            最小容量: {{ filters.minCapacity }}人
          </label>
          <input
            v-model="filters.minCapacity"
            type="range"
            :min="attendeeCount"
            :max="50"
            @input="handleFilterChange"
            class="w-full"
          >
        </div>

        <!-- 位置 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">位置</label>
          <select
            v-model="filters.location"
            @change="handleFilterChange"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部位置</option>
            <option v-for="location in locations" :key="location" :value="location">
              {{ location }}
            </option>
          </select>
        </div>

        <!-- 设备需求 -->
        <div class="md:col-span-2 lg:col-span-3">
          <label class="block text-sm font-medium text-gray-700 mb-2">设备需求</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="equipment in allEquipment"
              :key="equipment"
              class="flex items-center space-x-1 bg-white px-3 py-1 rounded-lg border border-gray-200 cursor-pointer hover:bg-blue-50"
            >
              <input
                v-model="filters.equipment"
                type="checkbox"
                :value="equipment"
                @change="handleFilterChange"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="text-sm text-gray-700">{{ equipment }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      <p class="text-gray-600 mt-2">正在搜索替代会议室...</p>
    </div>

    <!-- 会议室列表 -->
    <div v-else-if="sortedRooms.length > 0" class="space-y-4">
      <div
        v-for="room in sortedRooms"
        :key="room.id"
        class="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
        :class="{
          'ring-2 ring-blue-500': selectedRoom?.id === room.id,
          'border-blue-300': compareList.some(r => r.id === room.id)
        }"
      >
        <div class="flex items-start justify-between">
          <!-- 会议室信息 -->
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <h4 class="text-lg font-semibold text-gray-900">{{ room.name }}</h4>
              <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {{ room.type }}
              </span>
              <div class="flex items-center" :class="getAvailabilityStatus(room).color">
                <i :class="`pi ${getAvailabilityStatus(room).icon} mr-1`"></i>
                <span class="text-sm">{{ getAvailabilityStatus(room).label }}</span>
              </div>
            </div>

            <!-- 基本信息 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div class="text-sm">
                <span class="text-gray-600">位置:</span>
                <span class="font-medium">{{ room.location }}</span>
              </div>
              <div class="text-sm">
                <span class="text-gray-600">容量:</span>
                <span class="font-medium">{{ room.capacity }}人</span>
              </div>
              <div v-if="room.rating" class="text-sm">
                <span class="text-gray-600">评分:</span>
                <span class="font-medium">{{ room.rating }}/5.0</span>
              </div>
              <div v-if="room.price" class="text-sm">
                <span class="text-gray-600">价格:</span>
                <span class="font-medium">¥{{ room.price }}/小时</span>
              </div>
            </div>

            <!-- 设备信息 -->
            <div class="mb-3">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="equipment in room.equipment.slice(0, 5)"
                  :key="equipment"
                  class="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded"
                >
                  <i class="pi pi-cog mr-1"></i>
                  {{ equipment }}
                </span>
                <span
                  v-if="room.equipment.length > 5"
                  class="text-xs text-gray-500"
                >
                  +{{ room.equipment.length - 5 }} 更多
                </span>
              </div>
            </div>

            <!-- 可用时间段 -->
            <div class="mb-3">
              <h5 class="text-sm font-medium text-gray-900 mb-2">可用时间段</h5>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="slot in room.availableSlots.slice(0, 3)"
                  :key="slot.startTime.toISOString()"
                  class="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                >
                  {{ formatTimeRange(slot.startTime, slot.endTime) }}
                </span>
                <span
                  v-if="room.availableSlots.length > 3"
                  class="text-xs text-gray-500"
                >
                  +{{ room.availableSlots.length - 3 }} 更多
                </span>
              </div>
            </div>

            <!-- 匹配度 -->
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600">匹配度:</span>
              <div class="flex items-center space-x-2">
                <span
                  class="font-bold text-sm px-2 py-1 rounded"
                  :class="getMatchScoreColor(calculateMatchScore(room))"
                >
                  {{ calculateMatchScore(room) }}%
                </span>
                <div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300 bg-green-500"
                    :style="{ width: `${calculateMatchScore(room)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-col space-y-2 ml-4">
            <!-- 选择按钮 -->
            <div v-if="!compareMode">
              <button
                v-if="getAvailabilityStatus(room).label === '完全可用'"
                @click="handleRoomSelect(room, room.availableSlots.find(slot =>
                  isEqual(slot.startTime, startTime) && isEqual(slot.endTime, endTime)
                ) || room.availableSlots[0])"
                class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
              >
                选择此会议室
              </button>
              <button
                v-else
                disabled
                class="px-4 py-2 bg-gray-300 text-gray-500 text-sm rounded-md cursor-not-allowed"
              >
                不可用
              </button>
            </div>

            <!-- 比较模式按钮 -->
            <div v-else class="flex flex-col space-y-2">
              <button
                @click="handleAddToCompare(room)"
                class="px-4 py-2 text-sm rounded-md transition-colors"
                :class="compareList.some(r => r.id === room.id)
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'border border-orange-500 text-orange-500 hover:bg-orange-50'"
              >
                {{ compareList.some(r => r.id === room.id) ? '已添加' : '添加到比较' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <i class="pi pi-search text-4xl text-gray-300 mb-3"></i>
      <p class="text-gray-500">未找到合适的替代会议室</p>
      <p class="text-sm text-gray-400 mt-1">
        请尝试调整过滤条件或修改预约时间
      </p>
    </div>

    <!-- 比较模式底部栏 -->
    <div v-if="compareMode && compareList.length > 0" class="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">
            已选择 {{ compareList.length }}/3 个会议室进行比较
          </span>
          <div class="flex -space-x-2">
            <div
              v-for="room in compareList"
              :key="room.id"
              class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white"
              :title="room.name"
            >
              {{ room.name.charAt(0) }}
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button
            @click="compareList = []"
            class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            清空选择
          </button>
          <button
            @click="handleCompareRooms"
            :disabled="compareList.length < 2"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm rounded-md transition-colors"
          >
            开始比较 ({{ compareList.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alternative-room-list {
  @apply space-y-6;
}

/* 动画效果 */
.transition-shadow {
  @apply transition-all duration-200;
}

.transition-all {
  @apply transition-all duration-300;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .grid {
    @apply grid-cols-1;
  }

  .flex.items-center.justify-between {
    @apply flex-col items-start space-y-3;
  }
}

/* 比较模式固定栏 */
.fixed.bottom-0 {
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
}
</style>