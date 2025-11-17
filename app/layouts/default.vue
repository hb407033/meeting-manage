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
      <!-- 导航栏 -->
      <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <!-- 左侧 Logo 和导航 -->
            <div class="flex items-center">
              <NuxtLink to="/dashboard" class="flex items-center">
                <div class="flex-shrink-0">
                  <Icon name="i-heroicons-building-office-2" class="h-8 w-8 text-blue-600" />
                </div>
                <span class="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
                  会议室管理
                </span>
              </NuxtLink>

              <!-- 主导航 -->
              <div class="hidden md:ml-10 md:flex md:space-x-8">
                <NuxtLink
                  to="/dashboard"
                  class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  :class="route.path === '/dashboard'
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'"
                >
                  仪表盘
                </NuxtLink>
                <NuxtLink
                  to="/rooms"
                  class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  :class="route.path.startsWith('/rooms')
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'"
                  v-if="canAccess('room')"
                >
                  会议室
                </NuxtLink>
                <NuxtLink
                  to="/reservations"
                  class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  :class="route.path.startsWith('/reservations')
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'"
                  v-if="canAccess('reservation')"
                >
                  预约
                </NuxtLink>
                <NuxtLink
                  to="/analytics"
                  class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  :class="route.path === '/analytics'
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'"
                  v-if="isAdmin"
                >
                  数据分析
                </NuxtLink>
                <NuxtLink
                  to="/admin"
                  class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  :class="route.path.startsWith('/admin')
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'"
                  v-if="isAdmin"
                >
                  系统管理
                </NuxtLink>
              </div>
            </div>

            <!-- 右侧用户菜单 -->
            <div class="flex items-center space-x-4">
              <!-- 通知 -->
              <button class="relative p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <Icon name="i-heroicons-bell" class="h-6 w-6" />
                <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>

              <!-- 用户菜单 -->
              <div class="relative" @click="showUserMenu = !showUserMenu">
                <button class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <div class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span class="text-white font-medium">
                      {{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}
                    </span>
                  </div>
                  <span class="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ user?.name }}
                  </span>
                  <Icon name="i-heroicons-chevron-down" class="ml-1 h-4 w-4 text-gray-400" />
                </button>

                <!-- 下拉菜单 -->
                <div
                  v-if="showUserMenu"
                  class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
                  @click.stop
                >
                  <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ user?.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ user?.email }}</p>
                    <p class="text-xs text-blue-600 dark:text-blue-400">{{ userRole }}</p>
                  </div>
                  <NuxtLink
                    to="/profile"
                    class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    个人资料
                  </NuxtLink>
                  <NuxtLink
                    to="/settings"
                    class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    设置
                  </NuxtLink>
                  <button
                    @click="handleLogout"
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    登出
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

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
import { onClickOutside } from '@vueuse/core'

// 认证相关
const { user, isAuthenticated, hasPermission, canAccess, logout } = useAuth()
const route = useRoute()
const router = useRouter()

// 组件状态
const authLoading = ref(process.server ? true : false)
const showUserMenu = ref(false)

// 计算属性
const userRole = computed(() => user.value?.role || 'USER')
const isAdmin = computed(() => user.value?.role === 'ADMIN')

// 处理登出
const handleLogout = async () => {
  showUserMenu.value = false
  try {
    await logout()
  } catch (error) {
    console.error('Logout failed:', error)
    // 即使登出失败也重定向
    await router.push('/auth/login')
  }
}

// 点击外部关闭用户菜单
onClickOutside(() => {
  showUserMenu.value = false
}, {
  ignore: ['.user-menu']
})

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