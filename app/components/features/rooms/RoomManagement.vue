<template>
  <div class="container mx-auto px-4 py-6">
    <!-- 操作按钮区域 -->
    <div class="flex justify-end mb-6">
      <div class="flex gap-2">
          <Button
          label="导出数据"
          icon="pi pi-download"
          @click="exportRooms"
          class="p-button-outlined"
          :loading="isExporting"
        />
        <!-- 新增会议室按钮 -->
        <Button
          label="新增会议室"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <i class="pi pi-filter text-blue-600"></i>
        筛选条件
      </h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">搜索会议室</label>
            <span class="p-input-icon-left">
              <InputText
                v-model="searchQuery"
                placeholder="输入会议室名称或位置"
                class="w-full"
              />
            </span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">状态筛选</label>
            <Dropdown
              v-model="selectedStatus"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="全部状态"
              class="w-full"
              showClear
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最小容量</label>
            <InputNumber
              v-model="minCapacity"
              placeholder="最小容量"
              class="w-full"
              :min="1"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最大容量</label>
            <InputNumber
              v-model="maxCapacity"
              placeholder="最大容量"
              class="w-full"
              :min="1"
            />
          </div>
        </div>
        <div class="flex justify-end mt-4">
          <Button
            label="应用筛选"
            icon="pi pi-filter"
            @click="loadRooms"
            class="p-button-outlined"
          />
          <Button
            label="重置"
            icon="pi pi-refresh"
            @click="resetFilters"
            class="p-button-outlined p-button-secondary ml-2"
          />
        </div>
    </div>

    <!-- 会议室列表 -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            会议室列表 ({{ rooms.length }})
          </h2>
        </div>
      </div>
      <div class="p-6">
        <DataTable
          :value="rooms"
          :loading="isLoading"
          paginator
          :rows="10"
          :totalRecords="totalRecords"
          :lazy="true"
          @page="onPageChange"
          @sort="onSort"
          sortMode="single"
          :globalFilterFields="['name', 'location', 'description']"
          :filters="filters"
          class="p-datatable-sm"
        >
          <template #empty>
            <div class="text-center py-6">
              <i class="pi pi-info-circle text-3xl text-gray-400"></i>
              <p class="mt-4 text-gray-600">暂无会议室数据</p>
              <Button
                label="新增会议室"
                icon="pi pi-plus"
                @click="showCreateDialog = true"
                class="mt-4"
              />
            </div>
          </template>

          <Column field="name" header="会议室名称" sortable>
            <template #body="{ data }">
              <div class="font-medium">{{ data.name }}</div>
            </template>
          </Column>

          <Column field="location" header="位置" sortable>
            <template #body="{ data }">
              <span class="text-gray-600">{{ data.location || '-' }}</span>
            </template>
          </Column>

          <Column field="capacity" header="容量" sortable>
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <i class="pi pi-users text-gray-400"></i>
                <span>{{ data.capacity }}人</span>
              </div>
            </template>
          </Column>

          <Column field="status" header="状态" sortable>
            <template #body="{ data }">
              <Tag
                :value="getStatusLabel(data.status)"
                :severity="getStatusSeverity(data.status)"
              />
            </template>
          </Column>

          <Column field="createdAt" header="创建时间" sortable>
            <template #body="{ data }">
              <span class="text-gray-600">{{ formatDate(data.createdAt) }}</span>
            </template>
          </Column>

          <Column header="操作" :exportable="false">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button
                  icon="pi pi-eye"
                  size="small"
                  rounded
                  class="action-button"
                  @click="viewRoom(data)"
                  v-tooltip="'查看详情'"
                />
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  rounded
                  class="action-button"
                  @click="editRoom(data)"
                  v-tooltip="'编辑'"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  rounded
                  severity="danger"
                  class="action-button"
                  @click="deleteRoom(data)"
                  v-tooltip="'删除'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

  
    <!-- 创建/编辑对话框 -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      :header="editingRoom ? '编辑会议室' : '新增会议室'"
      :style="{ width: '85vw', maxWidth: '850px' }"
      @hide="resetForm"
    >
      <RoomForm
        :room="editingRoom"
        @save="onRoomSave"
        @cancel="resetForm"
      />
    </Dialog>

  
    <!-- 删除确认对话框 -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      header="确认删除"
      :style="{ width: '350px' }"
    >
      <div class="text-center py-4">
        <i class="pi pi-exclamation-triangle text-4xl text-orange-500"></i>
        <p class="mt-4">
          确定要删除会议室 <strong>{{ deletingRoom?.name }}</strong> 吗？
        </p>
        <p class="text-sm text-gray-600 mt-2">
          此操作不可恢复，相关预约记录也会受到影响。
        </p>
      </div>
      <template #footer>
        <Button
          label="取消"
          icon="pi pi-times"
          @click="showDeleteDialog = false"
          class="p-button-outlined"
        />
        <Button
          label="确认删除"
          icon="pi pi-check"
          @click="confirmDelete"
          severity="danger"
          :loading="isDeleting"
        />
      </template>
    </Dialog>

    <!-- 查看详情对话框 -->
    <Dialog
      v-model:visible="showDetailDialog"
      modal
      header="会议室详情"
      :style="{ width: '85vw', maxWidth: '1000px' }"
      :maximizable="true"
    >
      <RoomDetail
        v-if="viewingRoom"
        :room="viewingRoom"
      />
      <template #footer>
        <div class="flex justify-between">
          <Button
            label="编辑"
            icon="pi pi-pencil"
            @click="editRoomFromDetail"
            class="p-button-outlined"
          />
          <Button
            label="关闭"
            icon="pi pi-times"
            @click="showDetailDialog = false"
            autofocus
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNuxtApp } from '#app'
import { useRooms } from '~/composables/useRooms'
import RoomForm from './RoomForm.vue'
import RoomDetail from './RoomDetail.vue'
import type { MeetingRoom } from '~~/types/room'

interface StatusOption {
  label: string
  value: string
}

// 组件元数据
// definePageMeta 只能在页面中使用，不能在组件中使用

// 使用rooms store
const {
  rooms,
  loading: isLoading,
  pagination,
  filters: storeFilters,
  fetchRooms,
  deleteRoom: deleteRoomFromStore,
  exportRooms: exportRoomsFromStore
} = useRooms()

// 响应式数据
const isExporting = ref(false)
const isDeleting = ref(false)
const totalRecords = computed(() => pagination.value.total)

// 筛选相关
const searchQuery = ref('')
const selectedStatus = ref<string | undefined>(undefined)
const minCapacity = ref<number | null>(null)
const maxCapacity = ref<number | null>(null)
const filters = ref({})

// 分页相关
const currentPage = ref(1) // store使用的是基于1的页面索引
const pageSize = ref(10)
const sortField = ref('createdAt')
const sortOrder = ref(-1)

// 对话框状态
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showDetailDialog = ref(false)

// 表单相关
const editingRoom = ref<MeetingRoom | null>(null)
const deletingRoom = ref<MeetingRoom | null>(null)
const viewingRoom = ref<MeetingRoom | null>(null)

// 状态选项
const statusOptions: StatusOption[] = [
  { label: '可用', value: 'AVAILABLE' },
  { label: '使用中', value: 'OCCUPIED' },
  { label: '维护中', value: 'MAINTENANCE' },
  { label: '已预约', value: 'RESERVED' },
  { label: '禁用', value: 'DISABLED' }
]

// 方法
const loadRooms = async () => {
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value === 1 ? 'asc' : 'desc'
    }

    // 添加筛选条件
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    if (selectedStatus.value) {
      params.status = selectedStatus.value
    }
    if (minCapacity.value) {
      params.capacityMin = minCapacity.value
    }
    if (maxCapacity.value) {
      params.capacityMax = maxCapacity.value
    }
    await fetchRooms(params)
  } catch (error) {
    console.error('加载会议室列表失败:', error)
    const { $toast } = useNuxtApp() as any
    if ($toast) {
      $toast.add({
        severity: 'error',
        summary: '加载失败',
        detail: '无法加载会议室列表',
        life: 3000
      })
    }
  }
}

const onPageChange = (event: any) => {
  // DataTable使用基于0的索引，store使用基于1的
  currentPage.value = event.page + 1
  loadRooms()
}

const onSort = (event: any) => {
  sortField.value = event.sortField
  sortOrder.value = event.sortOrder === 1 ? 1 : -1
  loadRooms()
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = undefined
  minCapacity.value = null
  maxCapacity.value = null
  currentPage.value = 1
  loadRooms()
}

const exportRooms = async () => {
  isExporting.value = true

  try {
    // 构建导出参数
    const exportParams = {
      status: selectedStatus.value,
      minCapacity: minCapacity.value || undefined,
      maxCapacity: maxCapacity.value || undefined
    }

    // 调用store的导出方法
    const result = await exportRoomsFromStore(exportParams)

    // 显示成功消息
    const { $toast } = useNuxtApp() as any
    if ($toast && result.success) {
      $toast.add({
        severity: 'success',
        summary: '导出成功',
        detail: `会议室数据已成功导出到 ${result.filename}`,
        life: 3000
      })
    }
  } catch (error) {
    console.error('导出失败:', error)

    // 显示错误消息
    const { $toast } = useNuxtApp() as any
    if ($toast) {
      $toast.add({
        severity: 'error',
        summary: '导出失败',
        detail: '无法导出会议室数据，请稍后重试',
        life: 5000
      })
    }
  } finally {
    isExporting.value = false
  }
}


const viewRoom = (room: MeetingRoom) => {
  viewingRoom.value = room
  showDetailDialog.value = true
}

const editRoom = (room: MeetingRoom) => {
  editingRoom.value = { ...room }
  showCreateDialog.value = true
}

const editRoomFromDetail = () => {
  if (viewingRoom.value) {
    editingRoom.value = { ...viewingRoom.value }
    showDetailDialog.value = false
    showCreateDialog.value = true
  }
}

const deleteRoom = (room: MeetingRoom) => {
  deletingRoom.value = room
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!deletingRoom.value) return

  isDeleting.value = true
  try {
    const success = await deleteRoomFromStore(deletingRoom.value.id)

    if (success) {
      const { $toast } = useNuxtApp() as any
      if ($toast) {
        $toast.add({
          severity: 'success',
          summary: '删除成功',
          detail: `会议室 ${deletingRoom.value.name} 已删除`,
          life: 3000
        })
      }
    }

    showDeleteDialog.value = false
    deletingRoom.value = null
  } catch (error) {
    console.error('删除失败:', error)
    const { $toast } = useNuxtApp() as any
    if ($toast) {
      $toast.add({
        severity: 'error',
        summary: '删除失败',
        detail: '无法删除会议室',
        life: 3000
      })
    }
  } finally {
    isDeleting.value = false
  }
}

const onRoomSave = () => {
  resetForm()
  loadRooms()
}

const resetForm = () => {
  editingRoom.value = null
  showCreateDialog.value = false
}


// 工具方法
const getStatusLabel = (status: string): string => {
  const option = statusOptions.find(opt => opt.value === status)
  return option?.label || status
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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  loadRooms()
})
</script>

<style scoped>

/* 操作按钮样式 - 确保图标按钮可见 */
:deep(.action-button) {
  width: 28px !important;
  height: 28px !important;
  background-color: rgba(30, 64, 175, 0.05) !important;
  border: 1px solid rgba(30, 64, 175, 0.2) !important;
  color: #1e40af !important;
}

:deep(.action-button:hover) {
  background-color: rgba(30, 64, 175, 0.1) !important;
  border-color: rgba(30, 64, 175, 0.3) !important;
  color: #1e40af !important;
}

:deep(.action-button:active) {
  background-color: rgba(30, 64, 175, 0.15) !important;
  border-color: rgba(30, 64, 175, 0.4) !important;
  color: #1e40af !important;
}

:deep(.action-button.p-button-danger) {
  color: #dc2626 !important;
  border-color: rgba(220, 38, 38, 0.2) !important;
  background-color: rgba(220, 38, 38, 0.05) !important;
}

:deep(.action-button.p-button-danger:hover) {
  background-color: rgba(220, 38, 38, 0.1) !important;
  border-color: rgba(220, 38, 38, 0.3) !important;
  color: #dc2626 !important;
}

:deep(.action-button.p-button-danger:active) {
  background-color: rgba(220, 38, 38, 0.15) !important;
  border-color: rgba(220, 38, 38, 0.4) !important;
  color: #dc2626 !important;
}

/* 确保图标按钮有合适的尺寸 */
:deep(.action-button .p-button-icon) {
  font-size: 12px !important;
}

/* 确保按钮内容居中 */
:deep(.action-button .p-button-label) {
  display: none;
}

/* 针对圆形图标按钮的样式优化 */
:deep(.action-button.p-button-rounded) {
  border-radius: 50% !important;
  min-width: 28px !important;
  min-height: 28px !important;
}

/* 移动端优化：确保小按钮有足够的触控区域 */
@media (max-width: 768px) {
  :deep(.action-button) {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
  }

  :deep(.action-button .p-button-icon) {
    font-size: 14px !important;
  }
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.5rem;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  padding: 0.5rem;
  font-weight: 600;
}

:deep(.p-dialog .p-dialog-header) {
  padding: 1rem 1rem 0 1rem;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 1rem;
}

:deep(.p-card .p-card-content) {
  padding: 1rem;
}
</style>