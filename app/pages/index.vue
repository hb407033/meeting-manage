<template>
  <div class="p-3 bg-blue-50 min-h-screen">
    <div class="max-w-6xl mx-auto">
      <!-- 欢迎区域 -->
      <div class="text-center mb-12">
        <h1 class="text-xl font-bold text-blue-600 mb-4">
          会议室管理系统
        </h1>
        <p class="text-base text-gray-700 mb-6">
          轻松预约和管理会议室，提升工作效率
        </p>
      </div>

      <!-- 主要功能卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <!-- 会议室管理 -->
        <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div class="text-blue-600 mb-4">
            <i class="pi pi-building text-3xl"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">会议室管理</h3>
          <p class="text-gray-600 mb-6">
            查看所有可用会议室，了解会议室设施和状态
          </p>
          <NuxtLink
            to="/rooms"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i class="pi pi-eye mr-2"></i>
            查看会议室
          </NuxtLink>
        </div>

        <!-- 快速预约 -->
        <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div class="text-green-600 mb-4">
            <i class="pi pi-calendar-plus text-3xl"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">快速预约</h3>
          <p class="text-gray-600 mb-6">
            快速创建会议室预约，简单三步完成预约流程
          </p>
          <NuxtLink
            to="/reservations/create"
            class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <i class="pi pi-plus mr-2"></i>
            立即预约
          </NuxtLink>
        </div>

        <!-- 个人中心 -->
        <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div class="text-purple-600 mb-4">
            <i class="pi pi-user text-3xl"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">个人中心</h3>
          <p class="text-gray-600 mb-6">
            管理个人信息，查看预约历史和权限设置
          </p>
          <NuxtLink
            to="/reservations"
            class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <i class="pi pi-list mr-2"></i>
            查看预约列表
          </NuxtLink>
        </div>
      </div>

      <!-- 功能特色 -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4 text-center">系统特色</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="text-center">
            <div class="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i class="pi pi-clock text-blue-600 text-xl"></i>
            </div>
            <h4 class="font-semibold text-gray-900 mb-2">实时状态</h4>
            <p class="text-sm text-gray-600">实时显示会议室使用状态</p>
          </div>
          <div class="text-center">
            <div class="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i class="pi pi-mobile text-green-600 text-xl"></i>
            </div>
            <h4 class="font-semibold text-gray-900 mb-2">移动友好</h4>
            <p class="text-sm text-gray-600">支持手机端随时预约</p>
          </div>
          <div class="text-center">
            <div class="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i class="pi pi-shield text-purple-600 text-xl"></i>
            </div>
            <h4 class="font-semibold text-gray-900 mb-2">安全可靠</h4>
            <p class="text-sm text-gray-600">企业级权限管理</p>
          </div>
          <div class="text-center">
            <div class="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i class="pi pi-chart-bar text-orange-600 text-xl"></i>
            </div>
            <h4 class="font-semibold text-gray-900 mb-2">数据分析</h4>
            <p class="text-sm text-gray-600">使用情况统计分析</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
// 首页是公开页面，不需要认证保护
definePageMeta({
  layout: 'public',
  auth: false
})

// 认证相关
const { user, userRole, canAccess } = useAuth()

// 计算属性
const roleBadgeClass = computed(() => {
  switch (userRole.value) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'USER':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
})

const lastLoginTime = computed(() => {
  if (!user.value?.lastLoginAt) return '未知'
  return new Date(user.value.lastLoginAt).toLocaleString('zh-CN')
})

// 处理新建预约
const handleNewReservation = () => {
  // 直接跳转到新建预约页面
  navigateTo('/reservations/create')
}
</script>