/**
 * 认证中间件
 * 用于保护需要登录才能访问的页面
 */
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // 确保认证状态已初始化 - 在客户端立即初始化
  if (process.client) {
    if (!authStore.isAuthenticated && !authStore.accessToken) {
      authStore.initAuth()
    }

    // 等待下一个tick确保状态已更新
    nextTick(() => {
      // 再次检查认证状态
      if (!authStore.isAuthenticated) {
        // 保存目标路径，登录后可以重定向回来
        const redirect = to.fullPath
        return navigateTo({
          path: '/auth/login',
          query: { redirect }
        })
      }
    })
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