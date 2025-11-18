<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MeetingRoom } from '~/types/meeting'

interface FilterOptions {
  roomIds: string[]
  roomTypes: string[]
  capacities: {
    min: number
    max: number
  }
  equipment: string[]
  features: string[]
  status: string[]
}

interface Props {
  rooms: MeetingRoom[]
  selectedRoomIds: string[]
  loading?: boolean
  showAdvancedFilters?: boolean
  maxVisibleRooms?: number
  allowMultipleSelection?: boolean
  compactMode?: boolean
}

interface Emits {
  (e: 'filterChange', filters: FilterOptions): void
  (e: 'roomSelect', roomIds: string[]): void
  (e: 'roomToggle', roomId: string): void
  (e: 'clearFilters'): void
  (e: 'search', query: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedRoomIds: () => [],
  loading: false,
  showAdvancedFilters: false,
  maxVisibleRooms: 8,
  allowMultipleSelection: true,
  compactMode: false
})

const emit = defineEmits<Emits>()

// 内部状态
const searchQuery = ref('')
const expandedFilters = ref(false)
const selectedRoomTypes = ref<string[]>([])
const selectedEquipments = ref<string[]>([])
const selectedFeatures = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
const capacityRange = ref({ min: 1, max: 100 })
const sortBy = ref<'name' | 'capacity' | 'floor' | 'availability'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

// 计算属性
const availableRoomTypes = computed(() => {
  const types = new Set(props.rooms.map(room => room.type).filter(Boolean))
  return Array.from(types)
})

const availableEquipments = computed(() => {
  const equipmentSet = new Set<string>()
  props.rooms.forEach(room => {
    if (room.equipment && Array.isArray(room.equipment)) {
      room.equipment.forEach(eq => equipmentSet.add(eq))
    }
  })
  return Array.from(equipmentSet)
})

const availableFeatures = computed(() => {
  const featureSet = new Set<string>()
  props.rooms.forEach(room => {
    if (room.features && Array.isArray(room.features)) {
      room.features.forEach(feature => featureSet.add(feature))
    }
  })
  return Array.from(featureSet)
})

const availableStatuses = computed(() => {
  const statuses = new Set(props.rooms.map(room => room.status).filter(Boolean))
  return Array.from(statuses)
})

const filteredRooms = computed(() => {
  let rooms = [...props.rooms]

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    rooms = rooms.filter(room =>
      room.name.toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.location?.toLowerCase().includes(query) ||
      room.floor?.toLowerCase().includes(query)
    )
  }

  // 类型过滤
  if (selectedRoomTypes.value.length > 0) {
    rooms = rooms.filter(room => selectedRoomTypes.value.includes(room.type))
  }

  // 设备过滤
  if (selectedEquipments.value.length > 0) {
    rooms = rooms.filter(room => {
      if (!room.equipment || !Array.isArray(room.equipment)) return false
      return selectedEquipments.value.some(eq => room.equipment.includes(eq))
    })
  }

  // 功能过滤
  if (selectedFeatures.value.length > 0) {
    rooms = rooms.filter(room => {
      if (!room.features || !Array.isArray(room.features)) return false
      return selectedFeatures.value.some(feature => room.features.includes(feature))
    })
  }

  // 状态过滤
  if (selectedStatuses.value.length > 0) {
    rooms = rooms.filter(room => selectedStatuses.value.includes(room.status))
  }

  // 容量过滤
  rooms = rooms.filter(room =>
    room.capacity >= capacityRange.value.min &&
    room.capacity <= capacityRange.value.max
  )

  // 排序
  rooms.sort((a, b) => {
    let compareValue = 0
    switch (sortBy.value) {
      case 'name':
        compareValue = a.name.localeCompare(b.name)
        break
      case 'capacity':
        compareValue = a.capacity - b.capacity
        break
      case 'floor':
        compareValue = (a.floor || '').localeCompare(b.floor || '')
        break
      case 'availability':
        // 这里可以根据实际可用性数据进行排序
        compareValue = 0
        break
    }
    return sortOrder.value === 'asc' ? compareValue : -compareValue
  })

  return rooms
})

const visibleRooms = computed(() => {
  return filteredRooms.value.slice(0, props.maxVisibleRooms)
})

const hasMoreRooms = computed(() => {
  return filteredRooms.value.length > props.maxVisibleRooms
})

const selectedRooms = computed(() => {
  return props.rooms.filter(room => props.selectedRoomIds.includes(room.id))
})

const activeFiltersCount = computed(() => {
  return selectedRoomTypes.value.length +
         selectedEquipments.value.length +
         selectedFeatures.value.length +
         selectedStatuses.value.length +
         (searchQuery.value.trim() ? 1 : 0) +
         (capacityRange.value.min > 1 || capacityRange.value.max < 100 ? 1 : 0)
})

// 方法
function handleRoomToggle(roomId: string) {
  emit('roomToggle', roomId)
}

function handleRoomSelect(roomIds: string[]) {
  emit('roomSelect', roomIds)
}

function handleSearch(query: string) {
  searchQuery.value = query
  emit('search', query)
}

function handleFilterChange() {
  const filters: FilterOptions = {
    roomIds: filteredRooms.value.map(room => room.id),
    roomTypes: selectedRoomTypes.value,
    capacities: capacityRange.value,
    equipment: selectedEquipments.value,
    features: selectedFeatures.value,
    status: selectedStatuses.value
  }
  emit('filterChange', filters)
}

function clearAllFilters() {
  searchQuery.value = ''
  selectedRoomTypes.value = []
  selectedEquipments.value = []
  selectedFeatures.value = []
  selectedStatuses.value = []
  capacityRange.value = { min: 1, max: 100 }
  emit('clearFilters')
}

function selectAllFilteredRooms() {
  const roomIds = filteredRooms.value.map(room => room.id)
  handleRoomSelect(roomIds)
}

function clearRoomSelection() {
  handleRoomSelect([])
}

function toggleAdvancedFilters() {
  expandedFilters.value = !expandedFilters.value
}

function getRoomStatusColor(status: string): string {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'occupied':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'maintenance':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'reserved':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getRoomStatusText(status: string): string {
  switch (status) {
    case 'available':
      return '可用'
    case 'occupied':
      return '使用中'
    case 'maintenance':
      return '维护中'
    case 'reserved':
      return '已预约'
    default:
      return '未知'
  }
}

function formatCapacity(capacity: number): string {
  return `${capacity}人`
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// 监听器
watch([searchQuery, selectedRoomTypes, selectedEquipments, selectedFeatures, selectedStatuses, capacityRange, sortBy, sortOrder], () => {
  handleFilterChange()
}, { deep: true })

// 暴露给父组件的方法
defineExpose({
  clearAllFilters,
  selectAllFilteredRooms,
  clearRoomSelection,
  filteredRooms,
  activeFiltersCount
})
</script>

<template>
  <div class="calendar-filter">
    <!-- 搜索栏 -->
    <div class="search-section mb-4">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索会议室名称、位置..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        >
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <i class="pi pi-search text-gray-400"></i>
        </div>
      </div>
    </div>

    <!-- 快速选择 -->
    <div v-if="!compactMode" class="quick-actions mb-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-700">快速选择</h3>
        <div class="flex space-x-2">
          <button
            @click="selectAllFilteredRooms"
            class="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            :disabled="loading || filteredRooms.length === 0"
          >
            全选 ({{ filteredRooms.length }})
          </button>
          <button
            @click="clearRoomSelection"
            class="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            :disabled="loading || selectedRooms.length === 0"
          >
            清除选择
          </button>
        </div>
      </div>
    </div>

    <!-- 高级过滤器切换 -->
    <div v-if="showAdvancedFilters" class="advanced-filters-toggle mb-4">
      <button
        @click="toggleAdvancedFilters"
        class="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <i class="pi pi-filter"></i>
        <span>高级筛选</span>
        <span v-if="activeFiltersCount > 0" class="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
          {{ activeFiltersCount }}
        </span>
        <i :class="expandedFilters ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
      </button>
    </div>

    <!-- 高级过滤器 -->
    <div v-if="expandedFilters && showAdvancedFilters" class="advanced-filters mb-4 p-4 bg-gray-50 rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 会议室类型 -->
        <div class="filter-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">会议室类型</label>
          <div class="space-y-2">
            <label
              v-for="type in availableRoomTypes"
              :key="type"
              class="flex items-center"
            >
              <input
                v-model="selectedRoomTypes"
                type="checkbox"
                :value="type"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">{{ type }}</span>
            </label>
          </div>
        </div>

        <!-- 设备 -->
        <div class="filter-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">设备</label>
          <div class="space-y-2 max-h-32 overflow-y-auto">
            <label
              v-for="equipment in availableEquipments"
              :key="equipment"
              class="flex items-center"
            >
              <input
                v-model="selectedEquipments"
                type="checkbox"
                :value="equipment"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">{{ equipment }}</span>
            </label>
          </div>
        </div>

        <!-- 功能特性 -->
        <div class="filter-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">功能特性</label>
          <div class="space-y-2 max-h-32 overflow-y-auto">
            <label
              v-for="feature in availableFeatures"
              :key="feature"
              class="flex items-center"
            >
              <input
                v-model="selectedFeatures"
                type="checkbox"
                :value="feature"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">{{ feature }}</span>
            </label>
          </div>
        </div>

        <!-- 容量范围 -->
        <div class="filter-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            容量范围: {{ capacityRange.min }} - {{ capacityRange.max }}人
          </label>
          <div class="space-y-2">
            <input
              v-model="capacityRange.min"
              type="range"
              min="1"
              max="100"
              class="w-full"
            >
            <input
              v-model="capacityRange.max"
              type="range"
              min="1"
              max="100"
              class="w-full"
            >
          </div>
        </div>

        <!-- 状态 -->
        <div class="filter-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">状态</label>
          <div class="space-y-2">
            <label
              v-for="status in availableStatuses"
              :key="status"
              class="flex items-center"
            >
              <input
                v-model="selectedStatuses"
                type="checkbox"
                :value="status"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">{{ getRoomStatusText(status) }}</span>
            </label>
          </div>
        </div>

        <!-- 排序 -->
        <div class="filter-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">排序</label>
          <div class="space-y-2">
            <select
              v-model="sortBy"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">名称</option>
              <option value="capacity">容量</option>
              <option value="floor">楼层</option>
              <option value="availability">可用性</option>
            </select>
            <select
              v-model="sortOrder"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 清除过滤器 -->
      <div class="mt-4 flex justify-end">
        <button
          @click="clearAllFilters"
          class="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
        >
          清除所有过滤器
        </button>
      </div>
    </div>

    <!-- 会议室列表 -->
    <div class="rooms-list">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state text-center py-8">
        <i class="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
        <p class="text-sm text-gray-600 mt-2">加载会议室...</p>
      </div>

      <!-- 会议室项目 -->
      <div v-else class="rooms-grid">
        <div
          v-for="room in visibleRooms"
          :key="room.id"
          class="room-item"
          :class="{
            'selected': selectedRoomIds.includes(room.id),
            'compact': compactMode
          }"
          @click="handleRoomToggle(room.id)"
        >
          <!-- 选择状态 -->
          <div class="room-checkbox">
            <div
              class="checkbox-indicator"
              :class="{ 'checked': selectedRoomIds.includes(room.id) }"
            >
              <i v-if="selectedRoomIds.includes(room.id)" class="pi pi-check text-white"></i>
            </div>
          </div>

          <!-- 会议室信息 -->
          <div class="room-info">
            <div class="room-header">
              <h4 class="room-name">{{ room.name }}</h4>
              <span
                class="room-status"
                :class="getRoomStatusColor(room.status)"
              >
                {{ getRoomStatusText(room.status) }}
              </span>
            </div>

            <div class="room-details">
              <div class="detail-item">
                <i class="pi pi-users text-gray-400"></i>
                <span>{{ formatCapacity(room.capacity) }}</span>
              </div>
              <div v-if="room.location" class="detail-item">
                <i class="pi pi-map-marker text-gray-400"></i>
                <span>{{ room.location }}</span>
              </div>
              <div v-if="room.floor" class="detail-item">
                <i class="pi pi-building text-gray-400"></i>
                <span>{{ room.floor }}层</span>
              </div>
            </div>

            <div v-if="room.description && !compactMode" class="room-description">
              {{ truncateText(room.description, 60) }}
            </div>

            <!-- 设备标签 -->
            <div v-if="room.equipment && room.equipment.length > 0 && !compactMode" class="equipment-tags">
              <span
                v-for="eq in room.equipment.slice(0, 3)"
                :key="eq"
                class="equipment-tag"
              >
                {{ eq }}
              </span>
              <span v-if="room.equipment.length > 3" class="equipment-tag more">
                +{{ room.equipment.length - 3 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 显示更多 -->
      <div v-if="hasMoreRooms && !compactMode" class="show-more mt-4 text-center">
        <p class="text-sm text-gray-500">
          还有 {{ filteredRooms.length - maxVisibleRooms }} 个会议室未显示
        </p>
        <p class="text-xs text-gray-400">
          请使用搜索功能查找特定会议室
        </p>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredRooms.length === 0" class="empty-state text-center py-8">
        <i class="pi pi-search text-4xl text-gray-300 mb-2"></i>
        <p class="text-gray-500">未找到符合条件的会议室</p>
        <button
          @click="clearAllFilters"
          class="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          清除所有过滤器
        </button>
      </div>
    </div>

    <!-- 选中统计 -->
    <div v-if="selectedRooms.length > 0 && !compactMode" class="selection-summary mt-4 p-3 bg-blue-50 rounded-lg">
      <div class="flex items-center justify-between">
        <span class="text-sm text-blue-800">
          已选择 {{ selectedRooms.length }} 个会议室
        </span>
        <button
          @click="clearRoomSelection"
          class="text-sm text-blue-600 hover:text-blue-700"
        >
          清除选择
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-filter {
  @apply space-y-4;
}

.filter-group {
  @apply space-y-2;
}

.rooms-grid {
  @apply space-y-3;
}

.room-item {
  @apply flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300;
}

.room-item.selected {
  @apply bg-blue-50 border-blue-500;
}

.room-item.compact {
  @apply p-2 space-x-2;
}

.room-checkbox {
  @apply flex-shrink-0 mt-1;
}

.checkbox-indicator {
  @apply w-4 h-4 border-2 border-gray-300 rounded transition-colors;
}

.checkbox-indicator.checked {
  @apply bg-blue-500 border-blue-500 flex items-center justify-center;
}

.room-info {
  @apply flex-1 min-w-0;
}

.room-header {
  @apply flex items-center justify-between mb-2;
}

.room-name {
  @apply font-medium text-gray-900 truncate;
}

.room-status {
  @apply px-2 py-1 text-xs rounded-full border;
}

.room-details {
  @apply flex flex-wrap gap-3 text-sm text-gray-600;
}

.detail-item {
  @apply flex items-center space-x-1;
}

.room-description {
  @apply text-sm text-gray-500 mt-2 line-clamp-2;
}

.equipment-tags {
  @apply flex flex-wrap gap-1 mt-2;
}

.equipment-tag {
  @apply px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full;
}

.equipment-tag.more {
  @apply bg-gray-200 text-gray-600;
}

.loading-state {
  @apply py-8;
}

.empty-state {
  @apply text-center py-8;
}

.show-more {
  @apply text-center;
}

.selection-summary {
  @apply sticky bottom-0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .advanced-filters .grid {
    @apply grid-cols-1;
  }

  .room-details {
    @apply flex-col gap-1;
  }

  .room-header {
    @apply flex-col items-start space-y-1;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .advanced-filters {
    @apply bg-gray-800;
  }

  .room-item {
    @apply border-gray-600;
  }

  .room-item.selected {
    @apply bg-blue-900 border-blue-400;
  }

  .room-name {
    @apply text-gray-100;
  }

  .room-details {
    @apply text-gray-400;
  }

  .room-description {
    @apply text-gray-400;
  }
}

/* 无障碍支持 */
.room-item:focus-visible {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

.checkbox-indicator:focus-visible {
  @apply ring-2 ring-blue-500 ring-offset-1;
}
</style>