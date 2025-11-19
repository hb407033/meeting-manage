<template>
  <div class="room-detail-page">
    <!-- 返回按钮 -->
    <div class="room-detail-header">
      <Button
        label="返回会议室管理"
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        @click="navigateTo('/admin/rooms')"
      />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="room-detail-loading">
      <ProgressBar mode="indeterminate" />
      <p>加载会议室详情中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="room-detail-error">
      <i class="pi pi-exclamation-triangle" style="font-size: 3rem; color: #ef4444;"></i>
      <h3>加载失败</h3>
      <p>{{ error }}</p>
      <div class="error-actions">
        <Button label="重试" icon="pi pi-refresh" @click="loadRoom" />
        <Button
          label="返回会议室管理"
          icon="pi pi-arrow-left"
          severity="secondary"
          @click="navigateTo('/admin/rooms')"
        />
      </div>
    </div>

    <!-- 会议室详情内容 -->
    <div v-else-if="room" class="room-detail-content">
      <div class="room-detail-container">
        <!-- 主要信息区 -->
        <div class="room-main-info">
          <div class="room-header">
            <div class="room-title-section">
              <h1 class="room-name">{{ room.name }}</h1>
              <Tag
                :value="getStatusText(room.status)"
                :severity="getStatusSeverity(room.status)"
                class="room-status"
              />
            </div>

            <div class="room-actions">
              <Button
                label="编辑"
                icon="pi pi-pencil"
                @click="handleEdit"
                v-if="hasPermission(user?.id || '', 'room:update')"
              />
              <Button
                label="删除"
                icon="pi pi-trash"
                severity="danger"
                @click="handleDelete"
                v-if="hasPermission(user?.id || '', 'room:delete')"
              />
              <Button
                label="查看可用时间"
                icon="pi pi-calendar"
                severity="secondary"
                @click="handleViewAvailability"
              />
            </div>
          </div>

          <div class="room-basic-info">
            <div class="info-grid">
              <div class="info-item">
                <i class="pi pi-map-marker info-icon"></i>
                <div class="info-content">
                  <span class="info-label">位置</span>
                  <span class="info-value">{{ room.location }}</span>
                </div>
              </div>

              <div class="info-item">
                <i class="pi pi-users info-icon"></i>
                <div class="info-content">
                  <span class="info-label">容量</span>
                  <span class="info-value">{{ room.capacity }}人</span>
                </div>
              </div>
            </div>
          </div>

          <div class="room-description" v-if="room.description">
            <h3>描述</h3>
            <p>{{ room.description }}</p>
          </div>
        </div>

        <!-- 设备配置区 -->
        <div class="room-equipment">
          <h3>设备配置</h3>
          <div class="equipment-grid">
            <div
              v-for="(available, equipment) in room.equipment || {}"
              :key="equipment"
              class="equipment-item"
              :class="{ 'available': available }"
            >
              <i :class="getEquipmentIcon(equipment)"></i>
              <span>{{ getEquipmentName(equipment) }}</span>
              <i class="pi pi-check" v-if="available"></i>
              <i class="pi pi-times" v-else></i>
            </div>
          </div>
        </div>

        <!-- 会议室图片 -->
        <div class="room-images" v-if="room.images && room.images.length > 0">
          <h3>会议室图片</h3>
          <div class="images-gallery">
            <div
              v-for="(image, index) in room.images"
              :key="index"
              class="image-item"
              @click="openImagePreview(image, index)"
            >
              <img
                :src="image"
                :alt="`${room.name} 图片${index + 1}`"
                class="room-image"
              />
              <div class="image-overlay">
                <i class="pi pi-eye"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- 管理功能区域 -->
        <div class="room-management">
          <h3>管理功能</h3>
          <div class="management-grid">
            <div class="management-item" @click="handleViewAvailability">
              <i class="pi pi-calendar management-icon"></i>
              <div class="management-content">
                <div class="management-title">查看可用时间</div>
                <div class="management-desc">查看会议室的时间安排和可用情况</div>
              </div>
              <i class="pi pi-arrow-right management-arrow"></i>
            </div>

            <div class="management-item" @click="handleEdit">
              <i class="pi pi-pencil management-icon"></i>
              <div class="management-content">
                <div class="management-title">编辑会议室</div>
                <div class="management-desc">修改会议室信息和配置</div>
              </div>
              <i class="pi pi-arrow-right management-arrow"></i>
            </div>

            <div class="management-item" @click="handleViewReservations">
              <i class="pi pi-list management-icon"></i>
              <div class="management-content">
                <div class="management-title">预约记录</div>
                <div class="management-desc">查看该会议室的所有预约记录</div>
              </div>
              <i class="pi pi-arrow-right management-arrow"></i>
            </div>

            <div class="management-item" @click="handleMaintenanceMode" v-if="hasPermission(user?.id || '', 'room:update')">
              <i class="pi pi-wrench management-icon"></i>
              <div class="management-content">
                <div class="management-title">维护模式</div>
                <div class="management-desc">设置会议室维护状态</div>
              </div>
              <i class="pi pi-arrow-right management-arrow"></i>
            </div>
          </div>
        </div>

        <!-- 操作历史 -->
        <div class="room-history" v-if="hasPermission(user?.id || '', 'audit:read')">
          <h3>操作历史</h3>
          <div class="history-list">
            <div v-if="historyLoading" class="history-loading">
              <ProgressBar mode="indeterminate" style="height: 4px;" />
            </div>
            <div v-else-if="history.length === 0" class="history-empty">
              暂无操作记录
            </div>
            <div v-else class="history-items">
              <div
                v-for="item in history"
                :key="item.id"
                class="history-item"
              >
                <div class="history-action">
                  <Tag
                    :value="getActionText(item.action)"
                    :severity="getActionSeverity(item.action)"
                    size="small"
                  />
                </div>
                <div class="history-details">
                  <div class="history-user">
                    <strong>{{ item.user?.name || '未知用户' }}</strong>
                    <span class="history-time">{{ formatTime(item.createdAt) }}</span>
                  </div>
                  <div class="history-changes" v-if="item.changes">
                    {{ formatChanges(item.changes) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <Dialog
      v-model:visible="showImagePreview"
      header="图片预览"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '800px' }"
    >
      <div class="image-preview">
        <img
          v-if="previewImage"
          :src="previewImage"
          alt="图片预览"
          class="preview-image"
        />
      </div>
    </Dialog>

    <!-- 编辑对话框 -->
    <Dialog
      v-model:visible="showEditDialog"
      :header="'编辑会议室'"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <RoomForm
        :room="room"
        @save="handleSave"
        @cancel="showEditDialog = false"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  layout: 'AdminLayout',
  middleware: 'auth'
})

// 动态路由参数
const route = useRoute()
const roomId = route.params.id as string

// 认证和权限
const { user } = useAuth()
const { hasPermission } = usePermissions()

// 状态管理
const { updateRoom } = useRooms()

// 本地状态
const room = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const history = ref<any[]>([])
const historyLoading = ref(false)
const showEditDialog = ref(false)
const showImagePreview = ref(false)
const previewImage = ref<string | null>(null)

// 页面头部信息
useHead({
  title: computed(() => `会议室详情 - ${room.value?.name || '加载中'} - 智能会议室管理系统`),
  meta: [
    { name: 'description', content: '查看会议室详细信息和操作历史' }
  ]
})

// 加载会议室详情
const loadRoom = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await $fetch(`/api/v1/rooms/${roomId}`)
    room.value = response.data

    // 加载操作历史
    if (hasPermission(user.value?.id || '', 'audit:read')) {
      await loadHistory()
    }
  } catch (err: any) {
    error.value = err.data?.message || '加载会议室详情失败'
    console.error('加载会议室详情失败:', err)
  } finally {
    loading.value = false
  }
}

// 加载操作历史
const loadHistory = async () => {
  try {
    historyLoading.value = true
    const response = await $fetch(`/api/v1/rooms/${roomId}/history`)
    history.value = response.data || []
  } catch (err) {
    console.error('加载操作历史失败:', err)
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

// 管理功能处理
const handleViewAvailability = () => {
  navigateTo(`/admin/rooms/availability?room=${roomId}`)
}

const handleViewReservations = () => {
  navigateTo(`/reservations?room=${roomId}`)
}

const handleMaintenanceMode = () => {
  if (!room.value) return

  const newStatus = room.value.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'
  const action = newStatus === 'MAINTENANCE' ? '设置为维护模式' : '取消维护模式'

  const confirmed = confirm(`确定要${action}吗？`)
  if (confirmed) {
    console.log(`${action}:`, roomId)
    // TODO: 调用状态更新API
  }
}

// 处理编辑
const handleEdit = () => {
  showEditDialog.value = true
}

// 处理保存
const handleSave = async (roomData: any) => {
  try {
    await updateRoom(roomId, roomData)
    showEditDialog.value = false
    await loadRoom() // 重新加载数据
  } catch (err: any) {
    console.error('保存会议室失败:', err)
    // 可以显示错误消息
  }
}

// 处理删除
const handleDelete = () => {
  if (!room.value) return

  const confirmed = confirm(`确定要删除会议室"${room.value.name}"吗？此操作不可恢复。`)
  if (!confirmed) return

  // 导航到删除API或调用删除方法
  navigateTo(`/admin/rooms?delete=${roomId}`)
}

// 打开图片预览
const openImagePreview = (image: string, index: number) => {
  previewImage.value = image
  showImagePreview.value = true
}

// 工具函数
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'AVAILABLE': '可用',
    'OCCUPIED': '使用中',
    'MAINTENANCE': '维护中',
    'DISABLED': '禁用'
  }
  return statusMap[status] || status
}

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    'AVAILABLE': 'success',
    'OCCUPIED': 'warning',
    'MAINTENANCE': 'info',
    'DISABLED': 'danger'
  }
  return severityMap[status] || 'secondary'
}

const getEquipmentIcon = (equipment: string) => {
  const iconMap: Record<string, string> = {
    'projector': 'pi pi-desktop',
    'whiteboard': 'pi pi-table',
    'tv': 'pi pi-mobile',
    'phone': 'pi pi-phone',
    'computer': 'pi pi-server',
    'air_conditioner': 'pi pi-spin',
    'wifi': 'pi pi-wifi',
    'speaker': 'pi pi-volume-up'
  }
  return iconMap[equipment] || 'pi pi-cog'
}

const getEquipmentName = (equipment: string) => {
  const nameMap: Record<string, string> = {
    'projector': '投影仪',
    'whiteboard': '白板',
    'tv': '电视',
    'phone': '电话',
    'computer': '电脑',
    'air_conditioner': '空调',
    'wifi': '无线网络',
    'speaker': '音响'
  }
  return nameMap[equipment] || equipment
}

const getActionText = (action: string) => {
  const actionMap: Record<string, string> = {
    'CREATE': '创建',
    'UPDATE': '更新',
    'DELETE': '删除',
    'STATUS_CHANGE': '状态变更'
  }
  return actionMap[action] || action
}

const getActionSeverity = (action: string) => {
  const severityMap: Record<string, string> = {
    'CREATE': 'success',
    'UPDATE': 'info',
    'DELETE': 'danger',
    'STATUS_CHANGE': 'warning'
  }
  return severityMap[action] || 'secondary'
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const formatChanges = (changes: any) => {
  if (!changes || typeof changes !== 'object') return ''

  const items = Object.entries(changes).map(([key, value]) => {
    return `${key}: ${JSON.stringify(value)}`
  })

  return items.join(', ')
}

// 页面加载时获取数据
onMounted(async () => {
  await loadRoom()
})

// 监听路由变化
watch(() => route.params.id, async (newId) => {
  if (newId && newId !== roomId) {
    await loadRoom()
  }
})
</script>

<style scoped>
.room-detail-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 1rem;
}

.room-detail-header {
  max-width: 1200px;
  margin: 0 auto 1rem;
}

.room-detail-loading,
.room-detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.room-detail-loading p,
.room-detail-error h3,
.room-detail-error p {
  margin-top: 1rem;
}

.room-detail-error h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.room-detail-content {
  max-width: 1200px;
  margin: 0 auto;
}

.room-detail-container {
  display: grid;
  gap: 1.5rem;
}

/* 主要信息区 */
.room-main-info {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.room-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.room-name {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.room-status {
  font-size: 0.875rem;
}

.room-actions {
  display: flex;
  gap: 0.5rem;
}

.room-basic-info {
  margin-bottom: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.info-icon {
  font-size: 1.25rem;
  color: #6b7280;
  width: 1.5rem;
  text-align: center;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.room-description h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.75rem 0;
}

.room-description p {
  color: #6b7280;
  line-height: 1.625;
  margin: 0;
}

/* 设备配置区 */
.room-equipment {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.room-equipment h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.equipment-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: #f9fafb;
  color: #9ca3af;
}

.equipment-item.available {
  background-color: #ecfdf5;
  border-color: #10b981;
  color: #047857;
}

.equipment-item i:first-child {
  font-size: 1rem;
}

.equipment-item span {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.equipment-item .pi-check {
  color: #10b981;
}

.equipment-item .pi-times {
  color: #ef4444;
}

/* 会议室图片 */
.room-images {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.room-images h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.images-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.image-item {
  position: relative;
  border-radius: 0.375rem;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 4/3;
}

.room-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-item:hover .room-image {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-overlay i {
  color: white;
  font-size: 1.5rem;
}

/* 管理功能 */
.room-management {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.room-management h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.management-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.management-item:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}

.management-icon {
  font-size: 1.5rem;
  color: #3b82f6;
  width: 2rem;
  text-align: center;
}

.management-content {
  flex: 1;
}

.management-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.management-desc {
  font-size: 0.75rem;
  color: #6b7280;
}

.management-arrow {
  font-size: 0.875rem;
  color: #9ca3af;
}

/* 操作历史 */
.room-history {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.room-history h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.history-loading {
  margin-bottom: 1rem;
}

.history-empty {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
  background-color: #f9fafb;
  border-radius: 0.375rem;
}

.history-items {
  display: grid;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  border-left: 3px solid #e5e7eb;
}

.history-action {
  flex-shrink: 0;
}

.history-details {
  flex: 1;
  min-width: 0;
}

.history-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.history-user strong {
  font-weight: 600;
  color: #111827;
}

.history-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.history-changes {
  font-size: 0.875rem;
  color: #6b7280;
  word-break: break-all;
}

/* 图片预览 */
.image-preview {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 0.375rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .room-detail-page {
    padding: 0.5rem;
  }

  .room-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .room-title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .room-name {
    font-size: 1.5rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .equipment-grid {
    grid-template-columns: 1fr;
  }

  .images-gallery {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .management-grid {
    grid-template-columns: 1fr;
  }

  .history-item {
    flex-direction: column;
    gap: 0.5rem;
  }

  .history-user {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>