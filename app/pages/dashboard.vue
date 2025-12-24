<template>
  <!-- 主要内容区域 -->
  <div class="py-6">
      <!-- 统计卡片区域（仅基础统计，不含趋势和热门会议室） -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-3 bg-blue-100 rounded-full">
              <Icon name="i-heroicons-building-office-2" class="h-6 w-6 text-blue-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">总会议室数</p>
              <p class="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-3 bg-green-100 rounded-full">
              <Icon name="i-heroicons-calendar-days" class="h-6 w-6 text-green-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">今日预约</p>
              <p class="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-3 bg-yellow-100 rounded-full">
              <Icon name="i-heroicons-clock" class="h-6 w-6 text-yellow-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">当前可用</p>
              <p class="text-2xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-3 bg-purple-100 rounded-full">
              <Icon name="i-heroicons-chart-bar" class="h-6 w-6 text-purple-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">使用率</p>
              <p class="text-2xl font-bold text-gray-900">68%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间内容区域：快捷操作和我的预约列表（等高布局） -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- 左侧：我的预约列表 -->
        <div class="lg:col-span-2">
          <div class="h-full flex flex-col">
            <MyReservationsList class="flex-1" />
          </div>
        </div>

        <!-- 右侧：快速操作 -->
        <div class="lg:col-span-1">
          <div class="h-full flex flex-col">
            <QuickActions class="flex-1" />
          </div>
        </div>
      </div>

      <!-- 底部内容区域：使用率趋势和热门会议室 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 使用率趋势 -->
        <div class="lg:col-span-1">
          <UsageTrendChart />
        </div>

        <!-- 热门会议室 -->
        <div class="lg:col-span-1">
          <PopularRooms />
        </div>
      </div>

    <!-- 实时状态指示器 -->
    <RealTimeStatusIndicator />
  </div>
</template>

<script setup lang="ts">
import MyReservationsList from '~/components/features/reservations/MyReservationsList.vue'
import QuickActions from '~/components/features/reservations/QuickActions.vue'
import UsageTrendChart from '~/components/features/reservations/UsageTrendChart.vue'
import PopularRooms from '~/components/features/reservations/PopularRooms.vue'
import { onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

// 页面元数据
definePageMeta({
  title: '预约仪表盘',
  description: '管理会议室预约，查看系统统计',
  middleware: ['auth']
})

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
/* 等高布局样式 */
.h-full {
  height: 100%;
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.flex-1 {
  flex: 1;
}

/* 确保中间两个组件等高 */
.grid > div[class*="col-span"] {
  display: flex;
  flex-direction: column;
}

.grid > div[class*="col-span"] > div {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.grid > div[class*="col-span"] > div > * {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: 1fr;
  }

  .lg\:col-span-2,
  .lg\:col-span-1 {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .lg\:grid-cols-2 {
    grid-template-columns: 1fr;
  }

  .lg\:col-span-1 {
    grid-column: span 1;
  }
}

/* 组件之间的间距优化 */
.space-y-6 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 1.5rem;
  margin-bottom: 0;
}

.gap-6 {
  gap: 1.5rem;
}
</style>