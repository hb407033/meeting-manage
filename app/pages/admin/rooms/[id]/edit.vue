<template>
  <div class="room-edit-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <Button
            label="返回会议室详情"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="navigateTo(`/admin/rooms/${roomId}`)"
          />
          <div class="header-title">
            <h1>编辑会议室</h1>
            <p v-if="room">修改 {{ room.name }} 的信息和配置</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-content">
        <ProgressBar mode="indeterminate" />
        <p>加载会议室信息中...</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <div class="error-content">
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
    </div>

    <!-- 主体内容 -->
    <div v-else class="page-content">
      <div class="form-container">
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-pencil text-blue-600"></i>
              编辑会议室信息
            </div>
          </template>
          <template #content>
            <RoomForm
              :room="room"
              mode="edit"
              @save="handleSave"
              @cancel="handleCancel"
            />
          </template>
        </Card>
      </div>
    </div>
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

// 本地状态
const room = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// 页面头部信息
useHead({
  title: computed(() => `编辑会议室 - ${room.value?.name || '加载中'} - 智能会议室管理系统`),
  meta: [
    { name: 'description', content: '编辑会议室信息' }
  ]
})

// 加载会议室详情
const loadRoom = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await roomStore.getRoomById(roomId)
    room.value = response.data
  } catch (err: any) {
    error.value = err.data?.message || '加载会议室详情失败'
    console.error('加载会议室详情失败:', err)
  } finally {
    loading.value = false
  }
}

// 处理保存
const handleSave = async (roomData: any) => {
  try {
    // TODO: 调用更新会议室API
    console.log('更新会议室:', roomId, roomData)

    // 更新成功后导航到会议室详情页面
    navigateTo(`/admin/rooms/${roomId}`)
  } catch (err: any) {
    console.error('更新会议室失败:', err)
    // 可以显示错误消息
  }
}

// 处理取消
const handleCancel = () => {
  navigateTo(`/admin/rooms/${roomId}`)
}

// 页面加载时获取数据
onMounted(async () => {
  await loadRoom()
})
</script>

<style scoped>
.room-edit-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.page-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1.5rem 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.header-title h1 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.header-title p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.loading-content,
.error-content {
  text-align: center;
  max-width: 400px;
}

.loading-content p,
.error-content h3,
.error-content p {
  margin-top: 1rem;
}

.error-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.page-content {
  padding: 2rem 0;
}

.form-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (max-width: 768px) {
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-title h1 {
    font-size: 1.5rem;
  }
}
</style>