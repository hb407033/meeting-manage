<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        会议室列表
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        浏览和查看可用会议室
      </p>
    </div>

    <!-- 搜索栏 -->
    <Card class="mb-6">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <IconField iconPosition="left">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="searchKeyword"
                placeholder="搜索会议室名称、位置..."
                class="w-full"
                @input="handleSearch"
              />
            </IconField>
          </div>
          <Dropdown
            v-model="selectedStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="所有状态"
            class="w-full"
            @change="handleFilter"
          />
        </div>
      </template>
    </Card>

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
            <div class="text-2xl font-bold text-gray-600">{{ totalCount }}</div>
            <div class="text-gray-600 text-sm">总数</div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="text-center py-8">
      <Message severity="error" :closable="false">
        {{ error }}
      </Message>
      <Button
        label="重试"
        icon="pi pi-refresh"
        class="mt-4"
        @click="loadRooms"
      />
    </div>

    <!-- 空状态 -->
    <div v-else-if="rooms.length === 0" class="text-center py-8">
      <div class="text-gray-500">
        <i class="pi pi-home text-4xl mb-4"></i>
        <p class="text-lg">暂无会议室</p>
        <p class="text-sm mt-2">请联系管理员添加会议室</p>
      </div>
    </div>

    <!-- 会议室列表 -->
    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          v-for="room in rooms"
          :key="room.id"
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="navigateToRoom(room.id)"
        >
          <template #header>
            <div class="h-48 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <i class="pi pi-building text-white text-4xl"></i>
            </div>
          </template>

          <template #title>
            <div class="flex justify-between items-start">
              <span class="text-lg font-semibold">{{ room.name }}</span>
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="getStatusClass(room.status)"
              >
                {{ getStatusLabel(room.status) }}
              </span>
            </div>
          </template>

          <template #subtitle>
            <div class="flex items-center text-gray-600 dark:text-gray-400">
              <i class="pi pi-map-marker mr-2"></i>
              {{ room.location }}
            </div>
          </template>

          <template #content>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">容量</span>
                <span class="font-medium">{{ room.capacity }}人</span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">类型</span>
                <span class="font-medium">{{ room.type || '标准会议室' }}</span>
              </div>

              <div v-if="room.description" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ room.description }}
              </div>

              <div v-if="room.equipment && room.equipment.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="equipment in room.equipment.slice(0, 3)"
                  :key="equipment"
                  class="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded"
                >
                  {{ equipment }}
                </span>
                <span
                  v-if="room.equipment.length > 3"
                  class="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs rounded"
                >
                  +{{ room.equipment.length - 3 }}
                </span>
              </div>
            </div>
          </template>

          <template #footer>
            <div class="flex justify-between items-center">
              <Button
                label="查看详情"
                icon="pi pi-eye"
                size="small"
                outlined
                @click.stop="navigateToRoom(room.id)"
              />
              <Button
                v-if="canBookRoom(room)"
                label="立即预约"
                icon="pi pi-calendar-plus"
                size="small"
                @click.stop="bookRoom(room)"
              />
            </div>
          </template>
        </Card>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex justify-center mt-8">
        <Paginator
          :rows="limit"
          :totalRecords="total"
          :first="(page - 1) * limit"
          @page="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  layout: 'public', // 使用public布局避免认证检查
  // middleware: 'auth' // 临时注释掉认证中间件用于开发调试
})

// 认证相关
const { canAccess } = useAuth()

// 响应式数据
const rooms = ref([])
const loading = ref(false)
const error = ref('')
const searchKeyword = ref('')
const selectedStatus = ref('')

// 分页
const page = ref(1)
const limit = ref(12)
const total = ref(0)
const totalPages = computed(() => Math.ceil(total.value / limit.value))

// 状态选项
const statusOptions = [
  { label: '所有状态', value: '' },
  { label: '可用', value: 'AVAILABLE' },
  { label: '使用中', value: 'OCCUPIED' },
  { label: '已预约', value: 'RESERVED' },
  { label: '维护中', value: 'MAINTENANCE' },
  { label: '禁用', value: 'DISABLED' }
]

// 计算属性
const availableCount = computed(() =>
  rooms.value.filter(room => room.status === 'AVAILABLE').length
)

const occupiedCount = computed(() =>
  rooms.value.filter(room => room.status === 'OCCUPIED').length
)

const reservedCount = computed(() =>
  rooms.value.filter(room => room.status === 'RESERVED').length
)

const totalCount = computed(() => rooms.value.length)

// 加载会议室列表
const loadRooms = async () => {
  loading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      limit: limit.value.toString(),
      sortBy: 'name',
      sortOrder: 'asc'
    })

    if (searchKeyword.value) {
      params.append('search', searchKeyword.value)
    }

    if (selectedStatus.value) {
      params.append('status', selectedStatus.value)
    }

    // 使用带认证的请求
    const { authenticatedFetch } = useAuth()
    const response = await authenticatedFetch(`/api/v1/rooms?${params.toString()}`)

    if (response.success) {
      rooms.value = response.data
      total.value = response.meta.total
    } else {
      error.value = response.message || '加载会议室列表失败'
    }
  } catch (err: any) {
    console.error('加载会议室列表失败:', err)
    if (err.response?.status === 401) {
      error.value = '认证失败，请重新登录'
      // 重定向到登录页
      await navigateTo('/auth/login')
    } else if (err.response?.status === 403) {
      error.value = '权限不足，无法访问会议室信息'
    } else {
      error.value = '网络错误，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  page.value = 1
  // 使用简单的防抖实现
  clearTimeout(handleSearch.timeoutId)
  handleSearch.timeoutId = setTimeout(() => {
    loadRooms()
  }, 500)
}

// 筛选处理
const handleFilter = () => {
  page.value = 1
  loadRooms()
}

// 分页处理
const handlePageChange = (event: any) => {
  page.value = event.page + 1
  loadRooms()
}

// 导航到会议室详情
const navigateToRoom = (roomId: string) => {
  navigateTo(`/rooms/${roomId}`)
}

// 预约会议室
const bookRoom = (room: any) => {
  // TODO: 实现预约功能
  console.log('预约会议室:', room.name)
}

// 检查是否可以预约
const canBookRoom = (room: any) => {
  return canAccess('reservation', 'create') && room.status === 'AVAILABLE'
}

// 获取状态样式
const getStatusClass = (status: string) => {
  const classes = {
    'AVAILABLE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'OCCUPIED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'RESERVED': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'MAINTENANCE': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'DISABLED': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
  return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const labels = {
    'AVAILABLE': '可用',
    'OCCUPIED': '使用中',
    'RESERVED': '已预约',
    'MAINTENANCE': '维护中',
    'DISABLED': '禁用'
  }
  return labels[status as keyof typeof labels] || status
}

// 初始化
onMounted(() => {
  loadRooms()
})

// 监听搜索词变化
watch([searchKeyword, selectedStatus], () => {
  page.value = 1
  loadRooms()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>