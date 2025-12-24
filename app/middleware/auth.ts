/**
 * 认证中间件
 * 用于保护需要登录才能访问的页面
 * 注意：此中间件仅在客户端运行，服务端渲染时跳过认证检查
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // 仅在客户端进行认证检查
  if (import.meta.server) {
    console.log('[Auth Middleware] 服务端渲染，跳过认证检查')
    return
  }

  const authStore = useAuthStore()

  console.log('[Auth Middleware] 客户端执行认证检查', {
    path: to.fullPath,
    isAuthenticatedBefore: authStore.isAuthenticated
  })

  // 确保认证状态已初始化
  await authStore.initAuth()

  console.log('[Auth Middleware] initAuth后状态', {
    isAuthenticated: authStore.isAuthenticated,
    hasUser: !!authStore.user,
    hasAccessToken: !!authStore.accessToken
  })

  // 检查认证状态
  if (!authStore.isAuthenticated) {
    // 保存目标路径，登录后可以重定向回来
    const redirect = to.fullPath
    console.log('[Auth Middleware] 未认证，重定向到登录页')
    return navigateTo({
      path: '/auth/login',
      query: { redirect }
    })
  }

  console.log('[Auth Middleware] 认证通过')
})