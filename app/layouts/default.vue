<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 认证检查加载中 -->
    <div v-if="authLoading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <Icon name="i-heroicons-arrow-path" class="h-8 w-8 text-blue-600 animate-spin mx-auto" />
        <p class="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    </div>

    <!-- 已认证用户 -->
    <div v-else-if="isAuthenticated" class="min-h-screen">
      <!-- 开发环境指示器 -->
      <DevModeIndicator
        position="top-right"
        variant="badge"
        :animated="true"
        :closable="false"
        :show-user="true"
        :show-environment="true"
        :show-actions="true"
        :allow-switch="true"
        @switch-user="handleUserSwitch"
        @close="handleIndicatorClose"
      />

      <!-- 通用头部导航组件 -->
      <UniversalHeader />

      <!-- 主要内容 -->
      <main class="flex-1">
        <slot />
      </main>
    </div>

    <!-- 未认证用户 - 重定向到登录页 -->
    <div v-else class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <Icon name="i-heroicons-lock-closed" class="h-12 w-12 text-gray-400 mx-auto" />
        <h2 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">需要登录</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          请先登录以访问此页面
        </p>
        <NuxtLink
          to="/auth/login"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          前往登录
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

// 认证相关
const { isAuthenticated } = useAuth()
const route = useRoute()
const router = useRouter()

// 组件状态
const authLoading = ref(process.server ? true : false)

// 事件处理方法
const handleUserSwitch = () => {
  // 打开用户切换对话框或导航到用户切换页面
  router.push('/dev/user-switch')
}

const handleIndicatorClose = () => {
  // 开发环境指示器关闭事件（通常不允许关闭）
  console.log('开发环境指示器关闭事件')
}

// 初始化认证状态
// 在客户端初始化认证状态
onMounted(() => {
  // 等待插件完成认证状态初始化
  nextTick(() => {
    authLoading.value = false
  })
})

// 路由保护
watch([isAuthenticated, authLoading], () => {
  if (!authLoading.value && !isAuthenticated.value && !route.path.startsWith('/auth/')) {
    const currentPath = route.fullPath
    router.push({
      path: '/auth/login',
      query: { redirect: currentPath }
    })
  }
}, { immediate: true })
</script>