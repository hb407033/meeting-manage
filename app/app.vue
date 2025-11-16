<script setup lang="ts">
// 设置页面标题
useHead({
  title: '智能会议室管理系统',
  meta: [
    { name: 'description', content: '基于现代Web技术栈的智能会议室管理平台' },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 顶部导航栏 -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
              智能会议室管理系统
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <button class="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-white">
              <!-- 主题切换按钮占位 -->
              🌙
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- 主要内容区域 -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="card p-6">
          <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            系统状态
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- 状态卡片 -->
            <div class="card p-4">
              <h3 class="text-lg font-medium mb-2">
                前端框架
              </h3>
              <p class="text-green-600">
                ✅ Nuxt 4 + PrimeVue + Tailwind CSS
              </p>
            </div>
            <div class="card p-4">
              <h3 class="text-lg font-medium mb-2">
                开发工具
              </h3>
              <p class="text-green-600">
                ✅ ESLint + Prettier + TypeScript
              </p>
            </div>
            <div class="card p-4">
              <h3 class="text-lg font-medium mb-2">
                开发模式
              </h3>
              <p class="text-blue-600">
                🚀 热重载已启用
              </p>
            </div>
          </div>

          <div class="mt-6">
            <h3 class="text-lg font-medium mb-3">
              快速操作
            </h3>
            <div class="flex space-x-4">
              <button class="btn-primary">
                创建会议室
              </button>
              <button class="btn-secondary">
                查看预约
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 路由通知 -->
    <NuxtRouteAnnouncer />
  </div>
</template>
