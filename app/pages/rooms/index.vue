<template>
  <div class="p-3 bg-gray-50 min-h-screen">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">
        会议室搜索
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        搜索和筛选会议室，快速找到符合需求的会议室资源
      </p>
    </div>

    <!-- 搜索组件 -->
    <div class="mb-6">
      <RoomSearch
        v-model="roomStore.searchQuery"
        :loading="roomStore.searchLoading"
        :suggestions="roomStore.searchSuggestions"
        :quick-tags="roomStore.searchHistory.slice(0, 5)"
        @search="handleSearch"
        @clear="handleClearSearch"
        @suggestion-select="handleSuggestionSelect"
        @update:model-value="handleSearchInput"
      />
    </div>

    <!-- 筛选组件 -->
    <div class="mb-6">
      <RoomFilter
        v-model="searchFilters"
        :collapsed="filterCollapsed"
        @apply="handleApplyFilters"
        @reset="handleResetFilters"
        @update:collapsed="filterCollapsed = $event"
      />
    </div>

    <!-- 快速统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ availableCount }}</div>
            <div class="text-gray-600 text-sm">可用</div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{{ occupiedCount }}</div>
            <div class="text-gray-600 text-sm">使用中</div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ reservedCount }}</div>
            <div class="text-gray-600 text-sm">已预约</div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-600">{{ roomStore.pagination.total }}</div>
            <div class="text-gray-600 text-sm">搜索结果</div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 搜索结果 -->
    <SearchResults
      :rooms="roomStore.rooms"
      :loading="roomStore.searchLoading || roomStore.loading"
      :search-query="roomStore.searchQuery"
      :pagination="roomStore.pagination"
      :has-active-filters="roomStore.hasActiveFilters"
      :initial-view-mode="roomStore.viewMode"
      @room-select="handleRoomSelect"
      @room-details="handleRoomDetails"
      @room-book="handleRoomBook"
      @page-change="handlePageChange"
      @clear-filters="handleClearFilters"
      @view-mode-change="handleViewModeChange"
    />
  </div>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

import type { MeetingRoom } from '~/types/room'

// 使用store
const roomStore = useRoomStore()
const { canAccess } = useAuth()

// 响应式数据
const filterCollapsed = ref(false)
const searchFilters = ref({
  equipment: {},
  sortBy: 'createdAt',
  sortOrder: 'desc'
})

// 计算属性
const availableCount = computed(() =>
  roomStore.rooms.filter(room => room.status === 'AVAILABLE').length
)

const occupiedCount = computed(() =>
  roomStore.rooms.filter(room => room.status === 'OCCUPIED').length
)

const reservedCount = computed(() =>
  roomStore.rooms.filter(room => room.status === 'RESERVED').length
)

// 搜索相关方法
const handleSearch = async (query: string) => {
  roomStore.setSearchQuery(query)
  await roomStore.performSearch()
}

const handleSearchInput = (query: string) => {
  roomStore.setSearchQuery(query)
}

const handleClearSearch = () => {
  roomStore.clearSearch()
}

const handleSuggestionSelect = (suggestion: string) => {
  roomStore.setSearchQuery(suggestion)
  roomStore.performSearch()
}

// 筛选相关方法
const handleApplyFilters = async (filters: any) => {
  roomStore.setFilters(filters)
  await roomStore.performSearch()
}

const handleResetFilters = () => {
  roomStore.resetFilters()
  roomStore.performSearch()
}

const handleClearFilters = () => {
  roomStore.clearSearch()
}

// 分页处理
const handlePageChange = async (event: any) => {
  await roomStore.performSearch({
    page: event.page + 1
  })
}

// 视图模式切换
const handleViewModeChange = (mode: 'grid' | 'table') => {
  roomStore.setViewMode(mode)
}

// 会议室操作方法
const handleRoomSelect = (room: MeetingRoom) => {
  navigateTo(`/rooms/${room.id}`)
}

const handleRoomDetails = (room: MeetingRoom) => {
  navigateTo(`/rooms/${room.id}`)
}

const handleRoomBook = (room: MeetingRoom) => {
  // TODO: 实现预约功能
  if (canAccess('reservation', 'create') && room.status === 'AVAILABLE') {
    navigateTo(`/reservations/new?roomId=${room.id}`)
  }
}

// URL参数处理
const route = useRoute()
const router = useRouter()

// 从URL参数初始化搜索状态
const initializeFromQuery = () => {
  const query = route.query

  if (query.search) {
    roomStore.setSearchQuery(query.search as string)
  }

  if (query.status) {
    roomStore.setFilters({ status: query.status as string })
  }

  if (query.location) {
    roomStore.setFilters({ location: query.location as string })
  }

  if (query.capacityMin) {
    roomStore.setFilters({ capacityMin: parseInt(query.capacityMin as string) })
  }

  if (query.capacityMax) {
    roomStore.setFilters({ capacityMax: parseInt(query.capacityMax as string) })
  }

  if (query.sortBy) {
    roomStore.setFilters({ sortBy: query.sortBy as string })
  }

  if (query.sortOrder) {
    roomStore.setFilters({ sortOrder: query.sortOrder as string })
  }

  // 设备筛选
  const equipmentFilters = {}
  Object.keys(query).forEach(key => {
    if (key.startsWith('equipment.')) {
      const equipmentKey = key.replace('equipment.', '')
      equipmentFilters[equipmentKey] = query[key] === 'true'
    }
  })

  if (Object.keys(equipmentFilters).length > 0) {
    roomStore.setFilters({ equipment: equipmentFilters })
  }
}

// 更新URL参数
const updateQuery = () => {
  const query: any = {}

  if (roomStore.searchQuery) {
    query.search = roomStore.searchQuery
  }

  if (roomStore.filters.status) {
    query.status = roomStore.filters.status
  }

  if (roomStore.filters.location) {
    query.location = roomStore.filters.location
  }

  if (roomStore.filters.capacityMin) {
    query.capacityMin = roomStore.filters.capacityMin
  }

  if (roomStore.filters.capacityMax) {
    query.capacityMax = roomStore.filters.capacityMax
  }

  if (roomStore.filters.sortBy) {
    query.sortBy = roomStore.filters.sortBy
  }

  if (roomStore.filters.sortOrder) {
    query.sortOrder = roomStore.filters.sortOrder
  }

  // 设备筛选
  Object.entries(roomStore.filters.equipment || {}).forEach(([key, value]) => {
    if (value) {
      query[`equipment.${key}`] = 'true'
    }
  })

  // 页码
  if (roomStore.pagination.page > 1) {
    query.page = roomStore.pagination.page
  }

  router.replace({ query })
}

// 初始化
onMounted(async () => {
  // 初始化搜索功能
  roomStore.initSearch()

  // 从URL参数初始化
  initializeFromQuery()

  // 执行搜索
  await roomStore.performSearch()
})

// 监听搜索和筛选变化，更新URL
watch(
  () => ({
    searchQuery: roomStore.searchQuery,
    filters: roomStore.filters,
    page: roomStore.pagination.page
  }),
  () => {
    updateQuery()
  },
  { deep: true }
)

// 监听路由变化
watch(
  () => route.query,
  () => {
    initializeFromQuery()
    roomStore.performSearch()
  }
)
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>