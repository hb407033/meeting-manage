/**
 * 客户端认证初始化插件
 * 确保应用启动时认证状态正确恢复
 */
export default defineNuxtPlugin(async () => {
  // 只在客户端执行
  if (!process.client) return

  // 等待DOM准备就绪
  await nextTick()

  const authStore = useAuthStore()

  // 初始化认证状态
  authStore.initAuth()

  // 如果用户已登录，验证令牌是否仍然有效
  if (authStore.isAuthenticated && authStore.accessToken) {
    try {
      // 尝试验证当前令牌
      await $fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`
        }
      })
    } catch (error) {
      console.warn('Token validation failed, clearing auth state:', error)
      authStore.clearAuth()
    }
  }
})