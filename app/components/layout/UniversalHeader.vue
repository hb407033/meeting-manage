<script setup lang="ts">
import { computed, watch, onMounted, nextTick } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useMenuStore } from '~/stores/menu'
import type { MenuItem, MenuSection } from '../../config/menu-config'

// 认证相关
const { user, canAccess, logout, userPermissions } = useAuth()
const route = useRoute()
const router = useRouter()

// 菜单状态管理
const menuStore = useMenuStore()

// 组件状态
const showReservationMenu = ref(false)
const showRoomMenu = ref(false)
const showSystemMenu = ref(false)
const showUserMenu = ref(false)
const showMobileMenu = ref(false)

// 计算属性
const userRole = computed(() => user.value?.role || 'USER')
const isAdmin = computed(() => user.value?.role === 'ADMIN')

// 获取缓存的权限菜单
const filteredMainMenu = computed(() => menuStore.getCachedMainMenu)
const filteredUserMenu = computed(() => menuStore.getCachedUserMenu)

// 菜单加载状态
const menuLoading = computed(() => menuStore.loading)

// 根据当前路由获取页面标题
const currentPageTitle = computed(() => {
  const path = route.path

  // 预约相关页面
  if (path.startsWith('/reservations')) {
    if (path.includes('/create'))
      return '快速预约'
    if (path.includes('/detailed'))
      return '详细预约配置'
    if (path.includes('/my'))
      return '我的预约'
    if (path.includes('/calendar'))
      return '预约日历'
    if (path === '/reservations')
      return '预约列表'
    return '预约管理'
  }

  // 会议室相关页面
  if (path.startsWith('/rooms')) {
    if (path.includes('/search'))
      return '会议室搜索'
    if (path.includes('/admin/rooms'))
      return '会议室管理'
    return '会议室列表'
  }

  // 管理员页面
  if (path.startsWith('/admin')) {
    if (path.includes('/users'))
      return '用户管理'
    if (path.includes('/permissions'))
      return '权限管理'
    if (path.includes('/settings'))
      return '系统配置'
    if (path.includes('/audit'))
      return path.includes('/audit-test') ? '审计日志测试' : '审计日志'
    return '系统管理'
  }

  // 默认标题
  switch (path) {
    case '/dashboard':
      return '预约仪表盘'
    case '/profile':
      return '个人资料'
    case '/settings':
      return '系统设置'
    case '/analytics':
      return '数据分析'
    case '/availability':
      return '会议室可用时间'
    default:
      return '智能会议室管理系统'
  }
})

// 检查路由是否激活
function isRouteActive(targetPath: string): boolean {
  if (targetPath === route.path)
    return true
  if (targetPath !== '/' && route.path.startsWith(targetPath))
    return true
  return false
}

// 查找菜单项对应的配置
function findMenuItem(routePath: string): MenuItem | null {
  for (const section of filteredMainMenu.value) {
    const item = section.items.find(item => item.route === routePath)
    if (item) return item
  }
  return null
}

// 初始化菜单缓存
async function initializeMenuCache() {
  if (!userPermissions.value || !userRole.value) {
    return
  }

  try {
    await menuStore.refreshMenuCache(
      userPermissions.value,
      userRole.value,
      canAccess
    )
  } catch (error) {
    console.error('Failed to initialize menu cache:', error)
  }
}

// 监听权限变化
watch([userPermissions, userRole], async () => {
  if (userPermissions.value && userRole.value) {
    await initializeMenuCache()
  }
}, { immediate: true })

// 监听路由变化，关闭移动端菜单
watch(route, () => {
  showMobileMenu.value = false
  // 权限变化时重新初始化菜单
  initializeMenuCache()
})

// 处理登出
async function handleLogout() {
  showUserMenu.value = false
  showMobileMenu.value = false
  try {
    await logout()
    // 清除菜单缓存
    menuStore.clearCache()
  }
  catch (error) {
    console.error('Logout failed:', error)
    // 即使登出失败也重定向
    await router.push('/auth/login')
  }
}

// 处理ESC键关闭菜单
onKeyStroke('Escape', () => {
  showMobileMenu.value = false
  showUserMenu.value = false
  showReservationMenu.value = false
  showRoomMenu.value = false
  showSystemMenu.value = false
})

// 初始化
onMounted(async () => {
  await nextTick()
  await initializeMenuCache()
})

// 动态菜单处理函数
function handleMenuHover(menuKey: string) {
  // 重置所有菜单状态
  showReservationMenu.value = false
  showRoomMenu.value = false
  showSystemMenu.value = false

  // 设置对应菜单状态
  switch (menuKey) {
    case 'reservations':
      showReservationMenu.value = true
      break
    case 'rooms':
      showRoomMenu.value = true
      break
    case 'system':
      showSystemMenu.value = true
      break
  }
}
</script>

<template>
  <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <!-- 菜单加载状态指示器 -->
    <div v-if="menuLoading" class="h-1 bg-blue-600 animate-pulse" />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- 左侧功能标题 -->
        <div class="flex items-center">
          <NuxtLink to="/dashboard" class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="i-heroicons-building-office-2" class="h-8 w-8 text-blue-600" />
            </div>
            <span class="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
              {{ currentPageTitle }}
            </span>
          </NuxtLink>
        </div>

        <!-- 右侧主导航菜单 - 桌面端 -->
        <div class="hidden md:flex items-center space-x-10">
          <!-- 动态渲染主菜单 -->
          <template v-for="section in filteredMainMenu" :key="section.key">
            <!-- 单个菜单项 -->
            <template v-if="section.items.length === 1">
              <NuxtLink
                :to="section.items[0].route"
                class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                :class="{ 'text-blue-600 dark:text-blue-400': isRouteActive(section.items[0].route || '') }"
              >
                <Icon :name="section.items[0].icon || 'i-heroicons-link'" class="mr-2 h-4 w-4" />
                {{ section.items[0].label }}
                <span v-if="section.items[0].badge" class="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                  {{ section.items[0].badge }}
                </span>
              </NuxtLink>
            </template>

            <!-- 多级菜单项 -->
            <template v-else>
              <div
                class="relative"
                @mouseenter="handleMenuHover(section.key)"
                @mouseleave="() => { showReservationMenu = false; showRoomMenu = false; showSystemMenu = false }"
              >
                <button class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  {{ section.label }}
                  <Icon name="i-heroicons-chevron-down" class="ml-1 h-4 w-4" />
                </button>

                <!-- 下拉子菜单 -->
                <Transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <div
                    v-if="(section.key === 'reservations' && showReservationMenu) ||
                         (section.key === 'rooms' && showRoomMenu) ||
                         (section.key === 'system' && showSystemMenu)"
                    class="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
                  >
                    <NuxtLink
                      v-for="item in section.items"
                      :key="item.key"
                      :to="item.route"
                      class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive(item.route || '') }"
                    >
                      <Icon :name="item.icon || 'i-heroicons-link'" class="mr-2 h-4 w-4" />
                      {{ item.label }}
                      <span v-if="item.badge" class="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                        {{ item.badge }}
                      </span>
                    </NuxtLink>
                  </div>
                </Transition>
              </div>
            </template>
          </template>
        </div>

        <!-- 右侧用户信息和操作入口 -->
        <div class="flex items-center space-x-4">
          <!-- 消息通知 -->
          <button class="relative p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <Icon name="i-heroicons-bell" class="h-6 w-6" />
            <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400" />
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

            <!-- 用户下拉菜单 -->
            <Transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
                @click.stop
              >
                <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ user?.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ user?.email }}
                  </p>
                  <p class="text-xs text-blue-600 dark:text-blue-400">
                    {{ userRole }}
                  </p>
                </div>

                <!-- 动态用户菜单项 -->
                <NuxtLink
                  v-for="item in filteredUserMenu"
                  :key="item.key"
                  :to="item.route"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Icon :name="item.icon || 'i-heroicons-link'" class="mr-2 h-4 w-4" />
                  {{ item.label }}
                </NuxtLink>

                <div class="border-t border-gray-200 dark:border-gray-700">
                  <button
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    @click="handleLogout"
                  >
                    <Icon name="i-heroicons-arrow-right-on-rectangle" class="mr-2 h-4 w-4" />
                    登出
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- 移动端菜单按钮 -->
          <div class="md:hidden">
            <button
              class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              @click="showMobileMenu = !showMobileMenu"
            >
              <Icon name="i-heroicons-bars-3" class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <!-- 移动端导航菜单 -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="transform -translate-y-full opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-full opacity-0"
      >
        <div
          v-if="showMobileMenu"
          class="md:hidden border-t border-gray-200 dark:border-gray-700"
        >
          <div class="px-2 pt-2 pb-3 space-y-1">
            <!-- 动态移动端菜单 -->
            <template v-for="section in filteredMainMenu" :key="section.key">
              <div>
                <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ section.label }}
                </div>
                <NuxtLink
                  v-for="item in section.items"
                  :key="item.key"
                  :to="item.route"
                  class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive(item.route || '') }"
                  @click="showMobileMenu = false"
                >
                  <Icon :name="item.icon || 'i-heroicons-link'" class="mr-2 h-5 w-5" />
                  {{ item.label }}
                  <span v-if="item.badge" class="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                    {{ item.badge }}
                  </span>
                </NuxtLink>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
/* 确保下拉菜单在正确位置显示 */
.relative {
  position: relative;
}

/* 移动端菜单滚动优化 */
.md\:hidden .max-h-96 {
  max-height: 24rem;
  overflow-y: auto;
}
</style>