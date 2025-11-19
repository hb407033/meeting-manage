<template>
  <div class="room-create-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <Button
            label="返回会议室管理"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="navigateTo('/admin/rooms')"
          />
          <div class="header-title">
            <h1>新建会议室</h1>
            <p>创建新的会议室，配置基本信息和设备</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="page-content">
      <div class="form-container">
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-home text-blue-600"></i>
              会议室基本信息
            </div>
          </template>
          <template #content>
            <RoomForm
              mode="create"
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

// 页面头部信息
useHead({
  title: '新建会议室 - 智能会议室管理系统',
  meta: [
    { name: 'description', content: '创建新的会议室' }
  ]
})

// 处理保存
const handleSave = async (roomData: any) => {
  try {
    // TODO: 调用创建会议室API
    console.log('创建会议室:', roomData)

    // 创建成功后导航到会议室管理页面
    navigateTo('/admin/rooms')
  } catch (err: any) {
    console.error('创建会议室失败:', err)
    // 可以显示错误消息
  }
}

// 处理取消
const handleCancel = () => {
  navigateTo('/admin/rooms')
}
</script>

<style scoped>
.room-create-page {
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