import { useAuthStore } from '../stores/auth'

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()

  // 初始化认证状态
  authStore.initAuth()

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
    }
  }

  // 添加到 Vue 全局属性
  if (import.meta.client) {
    nuxtApp.vueApp.config.globalProperties.$auth = $auth
  }

  // 注意：$apiFetch 现在由 api.client.ts 插件提供
})