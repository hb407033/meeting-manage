import { defineStore } from 'pinia'
import { tokenRefreshManager, type TokenSet } from '~/utils/token-refresh-manager'
import { authStateManager } from '~/utils/auth-state-manager'
import { authErrorHandler, type AuthError } from '~/utils/auth-error-handler'

// 声明 Nuxt 应用扩展类型
declare module '#app' {
  interface NuxtApp {
    $apiFetch: typeof $fetch
    $auth: {
      user: User | null
      isAuthenticated: boolean
      isLoading: boolean
      lastError: string | null
      login: (credentials: LoginCredentials) => Promise<void>
      logout: () => Promise<void>
      register: (data: RegisterData) => Promise<void>
      refreshTokens: () => Promise<void>
      updateUser: (userData: Partial<User>) => void
      hasRole: (role: string) => boolean
      hasPermission: (permission: string) => boolean
      canAccess: (resource: string, action?: string) => boolean
      clearUserPermissionCache: (userId: string, organizationId?: string) => Promise<void>
      isAdmin: boolean
      isUser: boolean
      isLoggedIn: boolean
    }
  }
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  phone?: string
  role: string
  permissions?: string[]
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  loginAttempts: number
  lastError: string | null
  tokenExpiresAt: number | null
}

// TokenSet 接口已从 token-refresh-manager 导入

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

// STORAGE_KEYS 已弃用，所有存储操作现在通过 AuthStateManager 统一管理

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    loginAttempts: 0,
    lastError: null,
    tokenExpiresAt: null
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated && !!state.user && !!state.accessToken,
    userRole: (state) => state.user?.role || 'GUEST',
    userPermissions: (state) => state.user?.permissions || [],
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isUser: (state) => state.user?.role === 'USER',
    userName: (state) => state.user?.name || '',
    userEmail: (state) => state.user?.email || '',
    userAvatar: (state) => state.user?.avatar || '',
    isTokenExpiringSoon: (state) => {
      if (!state.tokenExpiresAt) return false
      const now = Date.now()
      const threshold = 15 * 60 * 1000 // 15分钟
      return state.tokenExpiresAt - now <= threshold
    }
  },

  actions: {
    /**
     * 初始化认证状态（使用状态管理器）
     */
    async initAuth() {
      try {
        // 只在客户端执行
        if (typeof window === 'undefined') return

        // 移除重复初始化检查，总是尝试从状态管理器恢复状态
        // 因为页面刷新后 store 状态都是初始值，不能反映真实情况

        console.log('[AuthStore] 开始初始化认证状态')

        // 等待状态管理器完全初始化（避免竞态条件）
        await this.waitForStateManagerInit()

        // 从状态管理器获取状态
        const state = authStateManager.getState()

        if (state.isAuthenticated && state.user && state.accessToken) {
          // 同步状态到 store
          this.syncFromStateManager(state)

          console.log('[AuthStore] 从状态管理器恢复认证状态')

          // 检查令牌是否已过期或即将过期
          if (authStateManager.isTokenExpired()) {
            console.warn('[AuthStore] 检测到令牌已过期，尝试刷新')
            try {
              await this.refreshTokens()
            } catch (error) {
              console.warn('[AuthStore] 令牌已过期且刷新失败，清除认证状态')
              this.clearAuth()
              return
            }
          } else if (authStateManager.isTokenExpiringSoon()) {
            console.log('[AuthStore] 令牌即将过期，尝试刷新')
            try {
              await this.refreshTokens()
            } catch (error) {
              console.warn('[AuthStore] 初始化时令牌刷新失败，但保持当前状态')
              // 不立即清除状态，让用户可以继续使用，在后续操作中处理令牌过期
            }
          } else {
            console.log('[AuthStore] 认证状态恢复成功，令牌有效')
          }
        } else {
          console.log('[AuthStore] 无有效的认证状态，用户需要登录')
          this.clearAuth()
        }
      } catch (error) {
        console.error('[AuthStore] 初始化认证状态失败:', error)
        const authError = authErrorHandler.handleError(error, { action: 'login' })

        if (authErrorHandler.shouldClearAuthState(authError)) {
          this.clearAuth()
        }
      }
    },

    /**
     * 等待状态管理器初始化完成
     */
    async waitForStateManagerInit(maxRetries = 10, delay = 100): Promise<void> {
      for (let i = 0; i < maxRetries; i++) {
        // 简单检查状态管理器是否已经从存储中加载了数据
        const state = authStateManager.getState()
        if (state.lastSync > 0) {
          console.log('[AuthStore] 状态管理器已初始化')
          return
        }

        console.log(`[AuthStore] 等待状态管理器初始化... (${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      console.warn('[AuthStore] 状态管理器初始化超时，继续执行')
    },

    /**
     * 从状态管理器同步状态
     */
    syncFromStateManager(state: any) {
      this.user = state.user
      this.accessToken = state.accessToken
      this.refreshToken = state.refreshToken
      this.isAuthenticated = state.isAuthenticated
      this.tokenExpiresAt = state.tokenExpiresAt
      this.lastError = null
    },

    /**
     * 登录
     */
    async login(credentials: LoginCredentials): Promise<void> {
      this.isLoading = true
      this.lastError = null

      try {
        const response = await $fetch<{
          success: boolean
          data: {
            user: User
            tokens: TokenSet
          }
          message: string
        }>('/api/auth/login', {
          method: 'POST',
          body: credentials
        })

        if (response.success && response.data) {
          // 使用状态管理器更新状态
          authStateManager.updateAuthState(response.data.user, response.data.tokens)
          this.syncFromStateManager(authStateManager.getState())
          this.loginAttempts = 0

          console.log('[AuthStore] 登录成功')
        } else {
          throw new Error(response.message || '登录失败')
        }
      } catch (error: any) {
        this.loginAttempts++
        const authError = authErrorHandler.handleError(error, {
          action: 'login',
          url: '/api/auth/login',
          retryCount: this.loginAttempts
        })

        this.lastError = authErrorHandler.getUserMessage(authError)

        // 根据错误处理器的建议清除状态
        if (authErrorHandler.shouldClearAuthState(authError)) {
          this.clearAuth()
        }

        console.error('[AuthStore] 登录失败:', authError)
        throw authError
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 注册
     */
    async register(data: RegisterData): Promise<void> {
      this.isLoading = true
      this.lastError = null

      try {
        const response = await $fetch<{
          success: boolean
          data: {
            user: User
            tokens: TokenSet
          }
          message: string
        }>('/api/auth/register', {
          method: 'POST',
          body: data
        })

        if (response.success && response.data) {
          // 使用状态管理器更新状态
          authStateManager.updateAuthState(response.data.user, response.data.tokens)
          this.syncFromStateManager(authStateManager.getState())

          console.log('[AuthStore] 注册成功')
        } else {
          throw new Error(response.message || '注册失败')
        }
      } catch (error: any) {
        const authError = authErrorHandler.handleError(error, {
          action: 'register',
          url: '/api/auth/register'
        })

        this.lastError = authErrorHandler.getUserMessage(authError)

        // 根据错误处理器的建议清除状态
        if (authErrorHandler.shouldClearAuthState(authError)) {
          this.clearAuth()
        }

        console.error('[AuthStore] 注册失败:', authError)
        throw authError
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 登出
     */
    async logout(): Promise<void> {
      try {
        console.log('[AuthStore] 开始登出流程')

        // 调用服务器登出接口
        if (this.accessToken && this.refreshToken) {
          try {
            const { $apiFetch } = useNuxtApp()
            await $apiFetch('/api/auth/logout', {
              method: 'POST',
              body: {
                accessToken: this.accessToken,
                refreshToken: this.refreshToken
              }
            })
            console.log('[AuthStore] 服务器登出成功')
          } catch (error) {
            console.warn('[AuthStore] 服务器登出失败，但继续清除本地状态:', error)
            const authError = authErrorHandler.handleError(error, {
              action: 'logout',
              url: '/api/auth/logout'
            })
            // 即使服务器登出失败也继续清除本地状态
          }
        }
      } catch (error) {
        console.error('[AuthStore] 登出过程中发生意外错误:', error)
      } finally {
        // 使用状态管理器处理登出
        authStateManager.logout()
        this.clearAuth()
        console.log('[AuthStore] 登出完成')
      }
    },

    /**
     * 刷新令牌（使用令牌刷新管理器）
     */
    async refreshTokens(): Promise<void> {
      if (!this.refreshToken) {
        const error = new Error('没有可用的刷新令牌')
        throw authErrorHandler.handleError(error, { action: 'refresh' })
      }

      try {
        console.log('[AuthStore] 开始刷新令牌')

        // 使用令牌刷新管理器处理并发和重试
        const tokens = await tokenRefreshManager.refreshTokens(this.refreshToken)

        // 更新状态管理器
        const currentState = authStateManager.getState()
        if (currentState.user) {
          authStateManager.updateAuthState(currentState.user, tokens)
          this.syncFromStateManager(authStateManager.getState())
        }

        console.log('[AuthStore] 令牌刷新成功')
      } catch (error) {
        console.error('[AuthStore] 令牌刷新失败:', error)

        const authError = authErrorHandler.handleError(error, {
          action: 'refresh',
          retryCount: tokenRefreshManager.getRefreshStatus().retryCount
        })

        this.lastError = authErrorHandler.getUserMessage(authError)

        // 根据错误处理器的建议决定是否清除状态
        if (authErrorHandler.shouldClearAuthState(authError)) {
          console.warn('[AuthStore] 令牌刷新失败，清除认证状态')
          this.clearAuth()
        } else {
          console.warn('[AuthStore] 令牌刷新失败，但保持当前状态')
        }

        throw authError
      }
    },

    /**
     * 设置认证状态（已弃用，使用状态管理器）
     * @deprecated 使用 authStateManager.updateAuthState
     */
    setAuthState(user: User, tokens: TokenSet) {
      console.warn('[AuthStore] setAuthState 已弃用，使用状态管理器')
      authStateManager.updateAuthState(user, tokens)
      this.syncFromStateManager(authStateManager.getState())
    },

    /**
     * 更新令牌（已弃用，使用状态管理器）
     * @deprecated 使用状态管理器
     */
    updateTokens(tokens: TokenSet) {
      console.warn('[AuthStore] updateTokens 已弃用，使用状态管理器')
      const currentState = authStateManager.getState()
      if (currentState.user) {
        authStateManager.updateAuthState(currentState.user, tokens)
        this.syncFromStateManager(authStateManager.getState())
      }
    },

    /**
     * 清除认证状态（使用状态管理器）
     */
    clearAuth() {
      console.log('[AuthStore] 清除认证状态')

      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.isAuthenticated = false
      this.tokenExpiresAt = null
      this.lastError = null

      // 重置令牌刷新管理器
      tokenRefreshManager.reset()

      // 通过AuthStateManager清除状态，不再直接操作localStorage
      if (typeof window !== 'undefined') {
        authStateManager.clearAuthState()
      }
    },

    /**
     * 更新用户信息
     */
    updateUser(userData: Partial<User>) {
      if (this.user) {
        this.user = { ...this.user, ...userData }

        // 更新状态管理器中的用户信息
        const currentState = authStateManager.getState()
        if (currentState.user) {
          const updatedUser = { ...currentState.user, ...userData }
          // 手动更新状态管理器的用户数据（不触发同步事件）
          const state = authStateManager.getState()
          state.user = updatedUser
        }

        // 通过AuthStateManager更新用户信息，不再直接操作localStorage
        if (typeof window !== 'undefined') {
          const currentState = authStateManager.getState()
          if (currentState.isAuthenticated && currentState.accessToken && currentState.refreshToken) {
            const tokens = {
              accessToken: currentState.accessToken,
              refreshToken: currentState.refreshToken,
              expiresIn: currentState.tokenExpiresAt ?
                Math.floor((currentState.tokenExpiresAt - Date.now()) / 1000) : 3600
            }
            authStateManager.updateAuthState(this.user, tokens)
          }
        }

        console.log('[AuthStore] 用户信息已更新')
      }
    },

    /**
     * 获取认证系统状态
     */
    getAuthSystemStatus() {
      return {
        // Store 状态
        store: {
          isAuthenticated: this.isAuthenticated,
          hasUser: !!this.user,
          hasAccessToken: !!this.accessToken,
          hasRefreshToken: !!this.refreshToken,
          tokenExpiresAt: this.tokenExpiresAt,
          lastError: this.lastError
        },
        // 状态管理器状态
        stateManager: authStateManager.getState(),
        // 令牌刷新管理器状态
        tokenRefresh: tokenRefreshManager.getRefreshStatus(),
        // 错误处理器统计
        errorStats: authErrorHandler.getErrorStats()
      }
    },

    /**
     * 强制同步所有状态
     */
    async forceSyncStates() {
      console.log('[AuthStore] 强制同步所有认证状态')

      try {
        // 从状态管理器同步
        const state = authStateManager.getState()
        this.syncFromStateManager(state)

        // 检查令牌状态
        if (this.isAuthenticated && authStateManager.isTokenExpired()) {
          console.warn('[AuthStore] 检测到令牌已过期，尝试刷新')
          await this.refreshTokens().catch(() => {
            console.warn('[AuthStore] 强制同步时令牌刷新失败')
          })
        }

        console.log('[AuthStore] 状态同步完成')
      } catch (error) {
        console.error('[AuthStore] 强制同步状态失败:', error)
      }
    },

    /**
     * 检查权限
     */
    hasRole(role: string): boolean {
      return this.user?.role === role
    },

    /**
     * 检查权限
     */
    hasPermission(permission: string): boolean {
      return this.user?.permissions?.includes(permission) || false
    },

    /**
     * 检查是否可以访问资源
     */
    canAccess(resource: string, action: string = 'read'): boolean {
      // 管理员可以访问所有资源
      if (this.isAdmin) return true

      // 基于角色检查权限
      switch (resource) {
        case 'user':
          return this.hasPermission(`user:${action}`)
        case 'room':
          return this.hasPermission(`room:${action}`) || ['read', 'create'].includes(action)
        case 'reservation':
          return this.hasPermission(`reservation:${action}`)
        default:
          return false
      }
    },

    /**
     * 清除用户权限缓存
     */
    async clearUserPermissionCache(userId: string, organizationId?: string): Promise<void> {
      try {
        // 在 store 中必须通过 useNuxtApp() 访问注入的依赖
        const { $apiFetch } = useNuxtApp()
        await $apiFetch('/api/v1/admin/permissions/clear-cache', {
          method: 'POST',
          body: {
            userId,
            organizationId
          }
        })

        console.log(`权限缓存已清除: 用户 ${userId}`)
      } catch (error) {
        console.error('清除权限缓存失败:', error)
        throw error
      }
    }
  }
})