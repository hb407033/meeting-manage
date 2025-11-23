<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

// 认证相关
const { user, canAccess, logout } = useAuth()
const route = useRoute()
const router = useRouter()

// 组件状态
const showReservationMenu = ref(false)
const showRoomMenu = ref(false)
const showSystemMenu = ref(false)
const showUserMenu = ref(false)
const showMobileMenu = ref(false)

// 计算属性
const userRole = computed(() => user.value?.role || 'USER')
const isAdmin = computed(() => user.value?.role === 'ADMIN')

// 根据当前路由获取页面标题
const currentPageTitle = computed(() => {
  const path = route.path

  // 预约相关页面
  if (path.startsWith('/reservations')) {
    if (path.includes('/create'))
      return '快速预约'
    if (path.includes('/detailed'))
      return '详细预约'
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

// 处理登出
async function handleLogout() {
  showUserMenu.value = false
  showMobileMenu.value = false
  try {
    await logout()
  }
  catch (error) {
    console.error('Logout failed:', error)
    // 即使登出失败也重定向
    await router.push('/auth/login')
  }
}

// 点击外部关闭菜单 - 移除这个功能，因为和鼠标悬停逻辑冲突
// onClickOutside(() => {
//   showUserMenu.value = false
//   showReservationMenu.value = false
//   showRoomMenu.value = false
//   showSystemMenu.value = false
// }, {
//   ignore: []
// })

// 监听路由变化，关闭移动端菜单
watch(route, () => {
  showMobileMenu.value = false
})

// 处理ESC键关闭菜单
onKeyStroke('Escape', () => {
  showMobileMenu.value = false
  showUserMenu.value = false
})
</script>

<template>
  <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
          <!-- Dashboard 主菜单 -->
          <NuxtLink
            to="/dashboard"
            class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            :class="{ 'text-blue-600 dark:text-blue-400': isRouteActive('/dashboard') }"
          >
            <Icon name="i-heroicons-home" class="mr-2 h-4 w-4" />
            首页
          </NuxtLink>

          <!-- 预约菜单 -->
          <div class="relative" @mouseenter="showReservationMenu = true" @mouseleave="showReservationMenu = false">
            <button class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              预约
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
                v-if="showReservationMenu"
                class="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
              >
                <NuxtLink
                  to="/reservations/create"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/reservations/create') }"
                >
                  快速预约
                </NuxtLink>
                <NuxtLink
                  to="/reservations"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/reservations') }"
                >
                  预约列表
                </NuxtLink>
                <NuxtLink
                  to="/reservations/detailed"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/reservations/detailed') }"
                >
                  详细预约配置
                </NuxtLink>
                <NuxtLink
                  to="/reservations/my"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/reservations/my') }"
                >
                  我的预约
                </NuxtLink>
                </div>
            </Transition>
          </div>

          <!-- 会议室管理菜单 -->
          <div class="relative" @mouseenter="showRoomMenu = true" @mouseleave="showRoomMenu = false">
            <button
              v-if="canAccess('room', 'read')"
              class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              会议室管理
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
                v-if="showRoomMenu && canAccess('room', 'read')"
                class="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
              >
                <NuxtLink
                  to="/availability"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/availability') }"
                >
                  会议室可用时间
                </NuxtLink>
                <NuxtLink
                  to="/admin/rooms"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/admin/rooms') }"
                >
                  会议室管理
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <!-- 系统管理菜单 -->
          <div class="relative" @mouseenter="showSystemMenu = true" @mouseleave="showSystemMenu = false">
            <button
              v-if="isAdmin"
              class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              系统管理
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
                v-if="showSystemMenu && isAdmin"
                class="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
              >
                <NuxtLink
                  to="/admin/users"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/admin/users') }"
                >
                  用户管理
                </NuxtLink>
                <NuxtLink
                  to="/admin/permissions"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/admin/permissions') }"
                >
                  权限管理
                </NuxtLink>
                <NuxtLink
                  to="/admin/settings"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/admin/settings') }"
                >
                  系统配置
                </NuxtLink>
                <NuxtLink
                  to="/admin/audit"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/admin/audit') }"
                >
                  审计日志
                </NuxtLink>
                <NuxtLink
                  to="/admin/audit-test"
                  class="block px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isRouteActive('/admin/audit-test') }"
                >
                  审计测试
                </NuxtLink>
              </div>
            </Transition>
          </div>
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
                <NuxtLink
                  to="/profile"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Icon name="i-heroicons-user" class="mr-2 h-4 w-4" />
                  个人资料
                </NuxtLink>
                <NuxtLink
                  to="/settings"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Icon name="i-heroicons-cog-6-tooth" class="mr-2 h-4 w-4" />
                  设置
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
            <!-- Dashboard 模块 -->
            <div>
              <NuxtLink
                to="/dashboard"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/dashboard') }"
                @click="showMobileMenu = false"
              >
                <Icon name="i-heroicons-home" class="mr-2 h-5 w-5" />
                首页
              </NuxtLink>
            </div>

            <!-- 预约模块 -->
            <div v-if="canAccess('reservation')">
              <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                预约
              </div>
              <NuxtLink
                to="/reservations/create"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/reservations/create') }"
                @click="showMobileMenu = false"
              >
                快速预约
              </NuxtLink>
              <NuxtLink
                to="/reservations"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/reservations') }"
                @click="showMobileMenu = false"
              >
                预约列表
              </NuxtLink>
              <NuxtLink
                to="/reservations/detailed"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/reservations/detailed') }"
                @click="showMobileMenu = false"
              >
                详细预约配置
              </NuxtLink>
              <NuxtLink
                to="/reservations/my"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/reservations/my') }"
                @click="showMobileMenu = false"
              >
                我的预约
              </NuxtLink>
              </div>

            <!-- 会议室管理模块 -->
            <div v-if="canAccess('room', 'read')">
              <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                会议室管理
              </div>
              <NuxtLink
                to="/availability"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/availability') }"
                @click="showMobileMenu = false"
              >
                会议室可用时间
              </NuxtLink>
              <NuxtLink
                to="/admin/rooms"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/admin/rooms') }"
                @click="showMobileMenu = false"
              >
                会议室管理
              </NuxtLink>
            </div>

            <!-- 系统管理模块 -->
            <div v-if="isAdmin">
              <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                系统管理
              </div>
              <NuxtLink
                to="/admin/users"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/admin/users') }"
                @click="showMobileMenu = false"
              >
                用户管理
              </NuxtLink>
              <NuxtLink
                to="/admin/permissions"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/admin/permissions') }"
                @click="showMobileMenu = false"
              >
                权限管理
              </NuxtLink>
              <NuxtLink
                to="/admin/settings"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/admin/settings') }"
                @click="showMobileMenu = false"
              >
                系统配置
              </NuxtLink>
              <NuxtLink
                to="/admin/audit"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/admin/audit') }"
                @click="showMobileMenu = false"
              >
                审计日志
              </NuxtLink>
              <NuxtLink
                to="/admin/audit-test"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600': isRouteActive('/admin/audit-test') }"
                @click="showMobileMenu = false"
              >
                审计测试
              </NuxtLink>
            </div>
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
