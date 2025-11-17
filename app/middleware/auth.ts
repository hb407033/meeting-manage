/**
 * 认证中间件
 * 用于保护需要登录才能访问的页面
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // 获取认证状态
  const { isAuthenticated } = useAuth()

  // 如果用户未认证，重定向到登录页面
  if (!isAuthenticated.value) {
    // 保存目标路径，登录后可以重定向回来
    const redirect = to.fullPath
    return navigateTo({
      path: '/auth/login',
      query: { redirect }
    })
  }
})