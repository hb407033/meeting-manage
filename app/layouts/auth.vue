<template>
  <div class="min-h-screen flex items-center w-full justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8">
    <!-- 使用固定高度的容器确保垂直居中 -->
    <div class="flex flex-col items-center justify-center w-full min-h-[600px]">
      <!-- Logo 和标题 -->
      <div class="text-center mb-8">
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500 mb-4">
          <i class="pi pi-building text-white text-2xl"></i>
        </div>
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          会议室管理系统
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ subtitle }}
        </p>
      </div>

      <!-- 主要内容 - 插槽内容 -->
      <div class="w-full flex-shrink-0">
        <slot />
      </div>

      <!-- 页脚信息 -->
      <div class="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
        <p>&copy; 2025 会议室管理系统. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 定义页面元数据
const route = useRoute()

// 根据路由决定副标题
const subtitle = computed(() => {
  switch (route.path) {
    case '/auth/login':
      return '登录您的账户'
    case '/auth/register':
      return '创建新账户'
    default:
      return '欢迎回来'
  }
})

// 设置页面标题
useHead({
  title: computed(() => `${subtitle.value} - 会议室管理系统`),
  meta: [
    {
      name: 'description',
      content: '智能会议室管理系统的登录和注册页面'
    }
  ]
})
</script>

<style scoped>
/* 自定义样式 */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to));
}
</style>