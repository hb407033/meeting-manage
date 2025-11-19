<template>
  <div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">登录状态持久化测试页面</h1>

    <!-- 显示当前认证状态 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">当前认证状态</h2>
      <div class="space-y-2">
        <p><strong>已认证:</strong> {{ authStore.isAuthenticated }}</p>
        <p><strong>用户:</strong> {{ authStore.user?.name || '无' }}</p>
        <p><strong>邮箱:</strong> {{ authStore.user?.email || '无' }}</p>
        <p><strong>角色:</strong> {{ authStore.user?.role || '无' }}</p>
        <p><strong>访问令牌:</strong> {{ authStore.accessToken ? '存在' : '不存在' }}</p>
        <p><strong>刷新令牌:</strong> {{ authStore.refreshToken ? '存在' : '不存在' }}</p>
        <p><strong>令牌过期时间:</strong> {{ formatTime(authStore.tokenExpiresAt) }}</p>
      </div>
    </div>

    <!-- 本地存储状态 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">本地存储状态</h2>
      <div class="space-y-2">
        <p><strong>访问令牌:</strong> {{ localStorageData.accessToken ? '存在' : '不存在' }}</p>
        <p><strong>刷新令牌:</strong> {{ localStorageData.refreshToken ? '存在' : '不存在' }}</p>
        <p><strong>用户数据:</strong> {{ localStorageData.userData ? '存在' : '不存在' }}</p>
        <p><strong>令牌过期时间:</strong> {{ localStorageData.tokenExpiresAt || '不存在' }}</p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">操作</h2>
      <div class="space-x-4">
        <button
          @click="refreshAuthStatus"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          刷新认证状态
        </button>
        <button
          @click="testTokenRefresh"
          class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          测试令牌刷新
        </button>
        <button
          @click="clearAuth"
          class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          清除认证状态
        </button>
      </div>
    </div>

    <!-- 测试说明 -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4 text-yellow-800">测试说明</h2>
      <div class="text-yellow-700 space-y-2">
        <p>1. 在本页面登录后，刷新页面或重新访问应该保持登录状态</p>
        <p>2. 在地址栏重新输入地址并访问应该保持登录状态</p>
        <p>3. 关闭浏览器标签页后重新打开应该保持登录状态</p>
        <p>4. 如果显示"已认证: true"且用户信息正确，说明持久化功能正常</p>
      </div>
    </div>

    <!-- 快速导航 -->
    <div class="mt-6 space-x-4">
      <NuxtLink to="/auth/login" class="text-blue-500 hover:underline">登录页面</NuxtLink>
      <NuxtLink to="/reservations" class="text-blue-500 hover:underline">预约页面</NuxtLink>
      <NuxtLink to="/admin/rooms" class="text-blue-500 hover:underline">管理页面</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// 本地存储数据
const localStorageData = ref({
  accessToken: '',
  refreshToken: '',
  userData: '',
  tokenExpiresAt: ''
})

// 格式化时间
const formatTime = (timestamp: number | null) => {
  if (!timestamp) return '无'
  return new Date(timestamp).toLocaleString()
}

// 刷新本地存储数据
const refreshLocalStorageData = () => {
  if (typeof window !== 'undefined') {
    localStorageData.value = {
      accessToken: localStorage.getItem('auth_access_token') || '',
      refreshToken: localStorage.getItem('auth_refresh_token') || '',
      userData: localStorage.getItem('auth_user_data') || '',
      tokenExpiresAt: localStorage.getItem('auth_token_expires_at') || ''
    }
  }
}

// 刷新认证状态
const refreshAuthStatus = () => {
  authStore.initAuth()
  refreshLocalStorageData()
}

// 测试令牌刷新
const testTokenRefresh = async () => {
  try {
    await authStore.refreshTokens()
    refreshLocalStorageData()
    alert('令牌刷新成功')
  } catch (error) {
    alert('令牌刷新失败: ' + error.message)
  }
}

// 清除认证状态
const clearAuth = () => {
  authStore.clearAuth()
  refreshLocalStorageData()
}

// 页面加载时刷新数据
onMounted(() => {
  refreshLocalStorageData()

  // 每秒更新一次时间显示
  const interval = setInterval(() => {
    // 时间显示会自动更新
  }, 1000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>