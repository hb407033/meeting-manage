import { useAuthStore } from '../stores/auth'
import { useIntervalFn, useEventListener, onClickOutside } from '@vueuse/core'
import { getCurrentInstance } from 'vue'

export const useAuth = () => {
  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  // 认证状态
  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.isLoading)
  const lastError = computed(() => authStore.lastError)
  const userRole = computed(() => authStore.userRole)
  const userPermissions = computed(() => authStore.userPermissions)

  // 权限检查方法
  const hasRole = (role: string) => authStore.hasRole(role)
  const hasPermission = (permission: string) => authStore.hasPermission(permission)
  const canAccess = (resource: string, action?: string) => authStore.canAccess(resource, action)

  // 便捷属性
  const isAdmin = computed(() => authStore.isAdmin)
  const isUser = computed(() => authStore.isUser)
  const isLoggedIn = computed(() => authStore.isLoggedIn)

  // 认证操作
  const login = async (credentials: { email: string; password: string }) => {
    try {
      await authStore.login(credentials)

      // 登录成功后重定向到预约列表，提供快速操作
      const redirect = route.query.redirect as string
      await router.push(redirect || '/reservations')

      return true
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const register = async (data: { email: string; password: string; name: string }) => {
    try {
      await authStore.register(data)

      // 注册成功后重定向到预约列表，提供快速操作
      const redirect = route.query.redirect as string
      await router.push(redirect || '/reservations')

      return true
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authStore.logout()

      // 登出后重定向到登录页
      await router.push('/auth/login')

      return true
    } catch (error) {
      console.error('Logout failed:', error)
      // 即使登出失败也重定向
      await router.push('/auth/login')
      throw error
    }
  }

  // 令牌刷新
  const refreshTokens = async () => {
    try {
      await authStore.refreshTokens()
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      // 令牌刷新失败，重定向到登录页
      await router.push('/auth/login')
      throw error
    }
  }

  // 更新用户信息
  const updateUser = (userData: Partial<any>) => {
    authStore.updateUser(userData)
  }

  // 检查是否需要重定向到登录页
  const requireAuth = () => {
    if (!isAuthenticated.value) {
      const currentPath = route.fullPath
      router.push({
        path: '/auth/login',
        query: { redirect: currentPath }
      })
      return false
    }
    return true
  }

  // 检查角色权限并重定向
  const requireRole = (roles: string | string[]) => {
    if (!isAuthenticated.value) {
      requireAuth()
      return false
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    const hasRequiredRole = allowedRoles.includes(userRole.value)

    if (!hasRequiredRole) {
      // 权限不足，重定向到首页或403页面
      router.push('/')
      return false
    }

    return true
  }

  // 检查权限
  const requirePermission = (permissions: string | string[]) => {
    if (!isAuthenticated.value) {
      requireAuth()
      return false
    }

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      hasPermission(permission)
    )

    if (!hasRequiredPermissions) {
      // 权限不足，重定向到首页或403页面
      router.push('/')
      return false
    }

    return true
  }

  // 获取认证头
  const getAuthHeaders = () => {
    if (authStore.accessToken) {
      return {
        Authorization: `Bearer ${authStore.accessToken}`
      }
    }
    return {}
  }

  // 创建带认证的请求
  const authenticatedFetch = async (url: string, options: any = {}) => {
    const headers = {
      ...getAuthHeaders(),
      ...options.headers
    }

    try {
      return await $fetch(url, {
        ...options,
        headers
      })
    } catch (error: any) {
      // 处理认证错误
      if (error.response?.status === 401) {
        // 令牌过期，尝试刷新
        try {
          await refreshTokens()
          // 重新发送请求
          return await $fetch(url, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${authStore.accessToken}`
            }
          })
        } catch (refreshError) {
          // 刷新失败，重定向到登录页
          await router.push('/auth/login')
          throw refreshError
        }
      }
      throw error
    }
  }

  // 监听令牌过期
  const { pause: stopTokenCheck, resume: startTokenCheck } = useIntervalFn(() => {
    if (isAuthenticated.value && authStore.isTokenExpiringSoon) {
      refreshTokens().catch(() => {
        // 刷新失败会自动处理重定向
      })
    }
  }, 60000) // 每分钟检查一次

  // 在组件卸载时停止检查 - 只在组件实例存在时执行
  const instance = getCurrentInstance()
  if (instance) {
    onUnmounted(() => {
      stopTokenCheck()
    })
  }

  // 在页面可见性变化时检查
  useEventListener('visibilitychange', () => {
    if (!document.hidden && isAuthenticated.value) {
      refreshTokens().catch(() => {
        // 静默处理刷新失败
      })
    }
  })

  return {
    // 状态
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    lastError: readonly(lastError),
    userRole: readonly(userRole),
    userPermissions: readonly(userPermissions),

    // 便捷属性
    isAdmin: readonly(isAdmin),
    isUser: readonly(isUser),
    isLoggedIn: readonly(isLoggedIn),

    // 方法
    login,
    register,
    logout,
    refreshTokens,
    updateUser,

    // 权限检查
    hasRole,
    hasPermission,
    canAccess,

    // 路由保护
    requireAuth,
    requireRole,
    requirePermission,

    // 工具方法
    getAuthHeaders,
    authenticatedFetch,

    // 控制
    startTokenCheck,
    stopTokenCheck
  }
}

// 类型声明
declare module '#app' {
  interface NuxtApp {
    $auth: ReturnType<typeof useAuth>
  }
}