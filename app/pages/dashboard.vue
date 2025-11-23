<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 统一头部组件 -->
    <UniversalHeader />

    <!-- 主要内容区域 -->
    <main class="container mx-auto px-4 py-6 max-w-7xl">
      <!-- 页面标题 -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">预约仪表盘</h1>
        <p class="text-gray-600">管理您的会议室预约，查看系统统计信息</p>
      </div>

      <!-- 统计卡片区域 -->
      <SystemStatistics class="mb-6" />

      <!-- 主要内容网格 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左侧：我的预约列表 -->
        <div class="lg:col-span-2">
          <MyReservationsList />
        </div>

        <!-- 右侧：快速操作 -->
        <div class="space-y-6">
          <!-- 快捷预约 -->
          <QuickReservationDialog />

          <!-- 会议室可用性快速查看 -->
          <RoomAvailabilityQuickView />
        </div>
      </div>
    </main>

    <!-- 实时状态指示器 -->
    <RealTimeStatusIndicator />
  </div>
</template>

<script setup lang="ts">
import SystemStatistics from '~/components/features/reservations/SystemStatistics.vue'
import MyReservationsList from '~/components/features/reservations/MyReservationsList.vue'
import QuickReservationDialog from '~/components/features/reservations/QuickReservationDialog.vue'
import RoomAvailabilityQuickView from '~/components/features/reservations/RoomAvailabilityQuickView.vue'
import { onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

// 页面元数据
definePageMeta({
  title: '预约仪表盘',
  description: '管理会议室预约，查看系统统计',
  requiresAuth: true,
  middleware: ['auth']
})

// 权限检查
const { user, canAccess } = useAuth()

// 确保用户有访问权限
if (!canAccess('dashboard', 'read')) {
  throw createError({
    statusCode: 403,
    statusMessage: '您没有权限访问仪表盘'
  })
}

// 页面初始化
onMounted(() => {
  // 页面加载完成后的初始化逻辑
  console.log('预约仪表盘加载完成')
})

onUnmounted(() => {
  // 页面卸载时的清理逻辑
  console.log('预约仪表盘卸载')
})
</script>

<style scoped>
/* 确保页面在小屏幕上也能正常显示 */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>