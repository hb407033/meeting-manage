import { useAuthStore } from '../stores/auth'

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()

  // 只在客户端初始化认证状态，确保只初始化一次
  if (import.meta.client) {
    console.log('[AuthPlugin] 客户端认证插件初始化')

    // 设置页面可见性变化的监听器
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[AuthPlugin] 页面重新可见，检查认证状态')
        authStore.forceSyncStates()
      }
    }

    // 设置窗口焦点监听器
    const handleWindowFocus = () => {
      console.log('[AuthPlugin] 窗口获得焦点，检查认证状态')
      authStore.forceSyncStates()
    }

    // 延迟初始化，确保所有插件都已加载
    nuxtApp.hook('app:mounted', async () => {
      console.log('[AuthPlugin] 应用已挂载，开始初始化认证状态')

      try {
        // 总是尝试初始化认证状态，让 authStore.initAuth() 内部判断是否需要恢复
        // 移除这里的条件判断，因为页面刷新后 store 状态都是初始值
        await authStore.initAuth()

        // 添加事件监听器
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleWindowFocus)

        console.log('[AuthPlugin] 认证插件初始化完成')
      } catch (error) {
        console.error('[AuthPlugin] 认证插件初始化失败:', error)
      }
    })

    // 清理函数 - 在页面卸载时清理事件监听器
    const cleanup = () => {
      console.log('[AuthPlugin] 清理事件监听器')
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }

    // 添加页面卸载监听器
    window.addEventListener('beforeunload', cleanup)
  }

  // 创建一个组合式函数来使用
  const $auth = {
    // 状态
    get user() {
      return authStore.user
    },
    get isAuthenticated() {
      return authStore.isAuthenticated
    },
    get isLoading() {
      return authStore.isLoading
    },
    get lastError() {
      return authStore.lastError
    },

    // 方法
    login: authStore.login.bind(authStore),
    logout: authStore.logout.bind(authStore),
    register: authStore.register.bind(authStore),
    refreshTokens: authStore.refreshTokens.bind(authStore),
    updateUser: authStore.updateUser.bind(authStore),

    // 权限检查
    hasRole: authStore.hasRole.bind(authStore),
    hasPermission: authStore.hasPermission.bind(authStore),
    canAccess: authStore.canAccess.bind(authStore),

    // 便捷属性
    get isAdmin() {
      return authStore.isAdmin
    },
    get isUser() {
      return authStore.isUser
    },
    get isLoggedIn() {
      return authStore.isLoggedIn
    },

    // 新增的调试和管理方法
    getAuthSystemStatus: authStore.getAuthSystemStatus.bind(authStore),
    forceSyncStates: authStore.forceSyncStates.bind(authStore)
  }

  // 添加到 Vue 全局属性
  if (import.meta.client) {
    nuxtApp.vueApp.config.globalProperties.$auth = $auth
  }

  // 注意：$apiFetch 现在由 api.client.ts 插件提供
})