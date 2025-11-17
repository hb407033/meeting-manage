<template>
  <div class="p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        欢迎回来，{{ user?.name }}！
      </h1>
      <p class="mt-1 text-gray-600 dark:text-gray-400">
        这是您的会议室管理仪表盘
      </p>
    </div>

    <!-- 用户信息卡片 -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">账户信息</h2>
      <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <div>
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">用户名</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ user?.name }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">邮箱</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ user?.email }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">角色</dt>
          <dd class="mt-1">
            <span
              class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
              :class="roleBadgeClass"
            >
              {{ userRole }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">最后登录</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-white">
            {{ lastLoginTime }}
          </dd>
        </div>
      </dl>
    </div>

    <!-- 权限测试卡片 -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">权限测试</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="border dark:border-gray-700 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">会议室权限</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>查看</span>
              <Icon
                :name="canAccess('room', 'read') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('room', 'read') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>创建</span>
              <Icon
                :name="canAccess('room', 'create') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('room', 'create') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>编辑</span>
              <Icon
                :name="canAccess('room', 'update') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('room', 'update') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
          </div>
        </div>

        <div class="border dark:border-gray-700 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">预约权限</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>查看</span>
              <Icon
                :name="canAccess('reservation', 'read') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('reservation', 'read') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>创建</span>
              <Icon
                :name="canAccess('reservation', 'create') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('reservation', 'create') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>管理</span>
              <Icon
                :name="canAccess('reservation', 'manage') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('reservation', 'manage') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
          </div>
        </div>

        <div class="border dark:border-gray-700 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">用户权限</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>查看</span>
              <Icon
                :name="canAccess('user', 'read') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('user', 'read') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>编辑</span>
              <Icon
                :name="canAccess('user', 'update') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('user', 'update') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>删除</span>
              <Icon
                :name="canAccess('user', 'delete') ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="canAccess('user', 'delete') ? 'text-green-500' : 'text-red-500'"
                class="h-5 w-5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">快捷操作</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-if="canAccess('room', 'read')"
          to="/rooms"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Icon name="i-heroicons-building-office-2" class="h-5 w-5 mr-2" />
          查看会议室
        </NuxtLink>
        <NuxtLink
          v-if="canAccess('room', 'create')"
          to="/admin/rooms"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Icon name="i-heroicons-plus" class="h-5 w-5 mr-2" />
          添加会议室
        </NuxtLink>
        <button
          v-if="canAccess('reservation', 'create')"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          @click="handleNewReservation"
        >
          <Icon name="i-heroicons-calendar-plus" class="h-5 w-5 mr-2" />
          新建预约
        </button>
        <NuxtLink
          to="/rooms"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Icon name="i-heroicons-calendar-days" class="h-5 w-5 mr-2" />
          查看预约
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  middleware: 'auth' // 使用认证中间件
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
  // TODO: 实现新建预约功能
  console.log('新建预约功能待实现')
  // 暂时跳转到会议室列表页面
  navigateTo('/rooms')
}
</script>