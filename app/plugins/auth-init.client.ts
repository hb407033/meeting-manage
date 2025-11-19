/**
 * 客户端认证初始化插件
 * 确保应用启动时认证状态正确恢复和验证
 */
export default defineNuxtPlugin(async () => {
  // 只在客户端执行
  if (!process.client) return

  // 等待DOM和Pinia准备就绪
  await nextTick()

  const authStore = useAuthStore()

  // 确保认证状态已初始化（如果其他插件还没初始化的话）
  if (!authStore.isAuthenticated && !authStore.accessToken) {
    authStore.initAuth()
  }

  // 如果用户已登录，异步验证令牌是否仍然有效
  if (authStore.isAuthenticated && authStore.accessToken) {
    // 异步验证，不阻塞应用启动
    $fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`
      }
    }).catch((error) => {
      console.warn('Token validation failed, clearing auth state:', error)
      authStore.clearAuth()
    })
  }
})