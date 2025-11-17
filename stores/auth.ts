import { defineStore } from 'pinia'

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

export interface Tokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
  TOKEN_EXPIRES_AT: 'auth_token_expires_at'
} as const

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
     * 初始化认证状态（从本地存储恢复）
     */
    initAuth() {
      try {
        // 只在客户端执行
        if (typeof window === 'undefined') return

        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
        const tokenExpiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT)

        if (accessToken && userData) {
          this.accessToken = accessToken
          this.refreshToken = refreshToken
          this.user = JSON.parse(userData)
          this.isAuthenticated = true
          this.tokenExpiresAt = tokenExpiresAt ? parseInt(tokenExpiresAt) : null

          // 检查令牌是否过期
          if (this.isTokenExpiringSoon) {
            this.refreshTokens().catch(() => {
              this.clearAuth()
            })
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        this.clearAuth()
      }
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
            tokens: Tokens
          }
          message: string
        }>('/api/auth/login', {
          method: 'POST',
          body: credentials
        })

        if (response.success && response.data) {
          this.setAuthState(response.data.user, response.data.tokens)
          this.loginAttempts = 0
        } else {
          throw new Error(response.message || '登录失败')
        }
      } catch (error: any) {
        this.loginAttempts++
        this.lastError = error.message || '登录失败，请稍后重试'

        // 清除可能存在的认证状态
        if (this.loginAttempts >= 3) {
          this.clearAuth()
        }

        throw error
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
            tokens: Tokens
          }
          message: string
        }>('/api/auth/register', {
          method: 'POST',
          body: data
        })

        if (response.success && response.data) {
          this.setAuthState(response.data.user, response.data.tokens)
        } else {
          throw new Error(response.message || '注册失败')
        }
      } catch (error: any) {
        this.lastError = error.message || '注册失败，请稍后重试'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 登出
     */
    async logout(): Promise<void> {
      try {
        // 调用服务器登出接口
        if (this.accessToken && this.refreshToken) {
          await $fetch('/api/auth/logout', {
            method: 'POST',
            body: {
              accessToken: this.accessToken,
              refreshToken: this.refreshToken
            }
          }).catch(() => {
            // 即使服务器登出失败也继续清除本地状态
          })
        }
      } catch (error) {
        console.error('Logout server error:', error)
      } finally {
        this.clearAuth()
      }
    },

    /**
     * 刷新令牌
     */
    async refreshTokens(): Promise<void> {
      if (!this.refreshToken) {
        throw new Error('No refresh token available')
      }

      try {
        const response = await $fetch<{
          success: boolean
          data: {
            tokens: Tokens
          }
          message: string
        }>('/api/auth/refresh', {
          method: 'POST',
          body: {
            refreshToken: this.refreshToken
          }
        })

        if (response.success && response.data) {
          this.updateTokens(response.data.tokens)
        } else {
          throw new Error(response.message || '令牌刷新失败')
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.clearAuth()
        throw error
      }
    },

    /**
     * 设置认证状态
     */
    setAuthState(user: User, tokens: Tokens) {
      this.user = user
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
      this.isAuthenticated = true
      this.tokenExpiresAt = Date.now() + (tokens.expiresIn * 1000)
      this.lastError = null

      // 持久化到本地存储
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, this.tokenExpiresAt.toString())
      }
    },

    /**
     * 更新令牌
     */
    updateTokens(tokens: Tokens) {
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
      this.tokenExpiresAt = Date.now() + (tokens.expiresIn * 1000)

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, this.tokenExpiresAt.toString())
      }
    },

    /**
     * 清除认证状态
     */
    clearAuth() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.isAuthenticated = false
      this.tokenExpiresAt = null
      this.lastError = null

      // 清除本地存储
      if (typeof window !== 'undefined') {
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key)
        })
      }
    },

    /**
     * 更新用户信息
     */
    updateUser(userData: Partial<User>) {
      if (this.user) {
        this.user = { ...this.user, ...userData }

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(this.user))
        }
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
    }
  }
})