<template>
  <div class="room-management">
    <!-- 页面标题和操作栏 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">会议室管理</h1>
        <p class="text-gray-600 mt-1">管理和配置会议室信息</p>
      </div>
      <Button
        label="添加会议室"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
      />
    </div>

    <!-- 搜索和筛选栏 -->
    <Card class="mb-6">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="flex-1">
            <IconField iconPosition="left">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="searchKeyword"
                placeholder="搜索会议室名称、描述..."
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

          <Dropdown
            v-model="selectedSort"
            :options="sortOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="排序方式"
            class="w-full"
            @change="handleSort"
          />

          <Button
            label="重置"
            icon="pi pi-refresh"
            severity="secondary"
            variant="text"
            @click="resetFilters"
          />
        </div>
      </template>
    </Card>

    <!-- 统计信息 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ availableCount }}</div>
            <div class="text-gray-600 text-sm">可用会议室</div>
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
            <div class="text-2xl font-bold text-orange-600">{{ maintenanceCount }}</div>
            <div class="text-gray-600 text-sm">维护中</div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ totalCount }}</div>
            <div class="text-gray-600 text-sm">总会议室数</div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 会议室列表 -->
    <div v-if="roomStore.loading" class="flex justify-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else-if="roomStore.error" class="text-center py-8">
      <Message severity="error" :closable="false">
        {{ roomStore.error }}
      </Message>
      <Button
        label="重试"
        icon="pi pi-refresh"
        class="mt-4"
        @click="loadRooms"
      />
    </div>

    <div v-else-if="roomStore.rooms.length === 0" class="text-center py-8">
      <div class="text-gray-500">
        <i class="pi pi-home text-4xl mb-4"></i>
        <p class="text-lg">暂无会议室</p>
        <p class="text-sm mt-2">点击"添加会议室"创建第一个会议室</p>
      </div>
    </div>

    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RoomCard
          v-for="room in roomStore.rooms"
          :key="room.id"
          :room="room"
          @view="handleViewRoom"
          @edit="handleEditRoom"
          @delete="handleDeleteRoom"
        />
      </div>

      <!-- 分页 -->
      <div class="flex justify-center mt-8">
        <Paginator
          :rows="roomStore.pagination.limit"
          :totalRecords="roomStore.pagination.total"
          :first="(roomStore.pagination.page - 1) * roomStore.pagination.limit"
          @page="handlePageChange"
        />
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <Dialog
      v-model:visible="showCreateDialog"
      :header="editingRoom ? '编辑会议室' : '添加会议室'"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <RoomForm
        :room="editingRoom"
        @save="handleSaveRoom"
        @cancel="showCreateDialog = false"
      />
    </Dialog>

    <!-- 详情对话框 -->
    <Dialog
      v-model:visible="showDetailDialog"
      header="会议室详情"
      :modal="true"
      :style="{ width: '800px' }"
    >
      <RoomDetail
        v-if="selectedRoom"
        :room="selectedRoom"
        @edit="handleEditRoom"
        @close="showDetailDialog = false"
      />
    </Dialog>

    <!-- 删除确认对话框 -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="确认删除"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="text-center">
        <i class="pi pi-exclamation-triangle text-4xl text-orange-500 mb-4"></i>
        <p class="text-lg font-semibold mb-2">确定要删除这个会议室吗？</p>
        <p class="text-gray-600" v-if="roomToDelete">
          {{ roomToDelete.name }}
        </p>
        <p class="text-sm text-gray-500 mt-2">
          此操作不可恢复，请谨慎操作。
        </p>
      </div>

      <template #footer>
        <Button
          label="取消"
          icon="pi pi-times"
          severity="secondary"
          @click="showDeleteDialog = false"
        />
        <Button
          label="确认删除"
          icon="pi pi-check"
          severity="danger"
          @click="confirmDelete"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { MeetingRoom } from '~/stores/rooms'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const roomStore = useRoomStore()
const toast = useToast()

// 响应式数据
const searchKeyword = ref('')
const selectedStatus = ref('')
const selectedSort = ref('createdAt-desc')

const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showDeleteDialog = ref(false)

const editingRoom = ref<MeetingRoom | null>(null)
const selectedRoom = ref<MeetingRoom | null>(null)
const roomToDelete = ref<MeetingRoom | null>(null)

// 筛选选项
const statusOptions = [
  { label: '所有状态', value: '' },
  { label: '可用', value: 'AVAILABLE' },
  { label: '使用中', value: 'OCCUPIED' },
  { label: '维护中', value: 'MAINTENANCE' },
  { label: '已预约', value: 'RESERVED' },
  { label: '禁用', value: 'DISABLED' }
]

const sortOptions = [
  { label: '创建时间（最新）', value: 'createdAt-desc' },
  { label: '创建时间（最早）', value: 'createdAt-asc' },
  { label: '名称（A-Z）', value: 'name-asc' },
  { label: '名称（Z-A）', value: 'name-desc' },
  { label: '容量（大到小）', value: 'capacity-desc' },
  { label: '容量（小到大）', value: 'capacity-asc' }
]

// 计算属性
const availableCount = computed(() => roomStore.availableRooms.length)
const occupiedCount = computed(() => roomStore.rooms.filter(r => r.status === 'OCCUPIED').length)
const maintenanceCount = computed(() => roomStore.maintenanceRooms.length)
const totalCount = computed(() => roomStore.rooms.length)

// 加载会议室列表
const loadRooms = async () => {
  const [sortBy, sortOrder] = selectedSort.value.split('-')

  await roomStore.fetchRooms({
    search: searchKeyword.value,
    status: selectedStatus.value,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any
  })
}

// 处理搜索
const handleSearch = useDebounceFn(() => {
  loadRooms()
}, 500)

// 处理筛选
const handleFilter = () => {
  loadRooms()
}

// 处理排序
const handleSort = () => {
  loadRooms()
}

// 重置筛选
const resetFilters = () => {
  searchKeyword.value = ''
  selectedStatus.value = ''
  selectedSort.value = 'createdAt-desc'
  roomStore.resetFilters()
  loadRooms()
}

// 处理分页变化
const handlePageChange = (event: any) => {
  roomStore.pagination.page = event.page + 1
  loadRooms()
}

// 处理查看会议室
const handleViewRoom = (room: MeetingRoom) => {
  selectedRoom.value = room
  showDetailDialog.value = true
}

// 处理编辑会议室
const handleEditRoom = (room: MeetingRoom) => {
  editingRoom.value = room
  showCreateDialog.value = true
  showDetailDialog.value = false
}

// 处理删除会议室
const handleDeleteRoom = (room: MeetingRoom) => {
  roomToDelete.value = room
  showDeleteDialog.value = true
}

// 确认删除
const confirmDelete = async () => {
  if (!roomToDelete.value) return

  const success = await roomStore.deleteRoom(roomToDelete.value.id)

  if (success) {
    toast.add({
      severity: 'success',
      summary: '删除成功',
      detail: `会议室 "${roomToDelete.value.name}" 已删除`,
      life: 3000
    })
  } else {
    toast.add({
      severity: 'error',
      summary: '删除失败',
      detail: roomStore.error || '删除会议室失败',
      life: 3000
    })
  }

  showDeleteDialog.value = false
  roomToDelete.value = null
}

// 处理保存会议室
const handleSaveRoom = async (roomData: any) => {
  let success = false

  if (editingRoom.value) {
    success = await roomStore.updateRoom(editingRoom.value.id, roomData)
  } else {
    success = await roomStore.createRoom(roomData)
  }

  if (success) {
    toast.add({
      severity: 'success',
      summary: editingRoom.value ? '更新成功' : '创建成功',
      detail: `会议室 "${roomData.name}" ${editingRoom.value ? '已更新' : '已创建'}`,
      life: 3000
    })

    showCreateDialog.value = false
    editingRoom.value = null
    loadRooms()
  } else {
    toast.add({
      severity: 'error',
      summary: editingRoom.value ? '更新失败' : '创建失败',
      detail: roomStore.error || '操作失败',
      life: 3000
    })
  }
}

// 初始化
onMounted(() => {
  loadRooms()
})

// 监听页面切换
watch(() => roomStore.pagination.page, () => {
  loadRooms()
})
</script>

<style scoped>
.room-management {
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .room-management {
    padding: 1rem;
  }
}
</style>