/**
 * 认证中间件
 * 用于保护需要登录才能访问的页面
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // 在客户端，确保认证状态已初始化
  if (import.meta.client) {
    // 总是尝试初始化认证状态，让内部逻辑判断是否需要恢复
    // 移除条件判断，因为页面刷新后 store 状态都是初始值
    await authStore.initAuth()

    // 检查认证状态
    if (!authStore.isAuthenticated) {
      // 保存目标路径，登录后可以重定向回来
      const redirect = to.fullPath
      return navigateTo({
        path: '/auth/login',
        query: { redirect }
      })
    }
  } else {
    // 服务端渲染时，直接重定向到登录页
    if (!authStore.isAuthenticated) {
      const redirect = to.fullPath
      return navigateTo({
        path: '/auth/login',
        query: { redirect }
      })
    }
  }
})