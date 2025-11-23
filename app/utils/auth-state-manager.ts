/**
 * 认证状态管理器
 *
 * 解决以下问题：
 * 1. 跨标签页状态同步
 * 2. 本地存储状态一致性
 * 3. 优雅的状态恢复机制
 * 4. 存储事件监听
 */

import type { User, Tokens } from '~/stores/auth'

export interface AuthStateData {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: number | null
  isAuthenticated: boolean
  lastSync: number
}

export interface StateSyncEvent {
  type: 'auth_update' | 'auth_clear' | 'auth_logout'
  data?: Partial<AuthStateData>
  timestamp: number
  source?: string
}

export class AuthStateManager {
  private static readonly STORAGE_KEY = 'auth_state_manager'
  private static readonly SYNC_EVENT_KEY = 'auth_state_sync'
  private static readonly STATE_VERSION = '1.0.0'

  private memoryState: AuthStateData
  private isInitializing = false
  private eventListeners: ((event: StateSyncEvent) => void)[] = []
  private syncDebounceTimer: NodeJS.Timeout | null = null

  constructor() {
    this.memoryState = this.getInitialState()
    this.initialize()
  }

  private getInitialState(): AuthStateData {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      lastSync: 0
    }
  }

  /**
   * 初始化状态管理器
   */
  private async initialize(): Promise<void> {
    if (this.isInitializing) return

    this.isInitializing = true

    try {
      // 只在客户端执行
      if (typeof window === 'undefined') return

      // 从本地存储恢复状态
      await this.loadFromStorage()

      // 设置存储事件监听器
      this.setupStorageListener()

      // 设置页面可见性监听器
      this.setupVisibilityListener()

      console.log('[AuthStateManager] 初始化完成')
    } catch (error) {
      console.error('[AuthStateManager] 初始化失败:', error)
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * 从本地存储加载状态
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(AuthStateManager.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)

        // 检查版本兼容性
        if (parsed.version === AuthStateManager.STATE_VERSION) {
          this.memoryState = { ...this.getInitialState(), ...parsed.state }

          // 验证状态完整性
          if (this.validateState(this.memoryState)) {
            console.log('[AuthStateManager] 从本地存储恢复状态成功:', {
              isAuthenticated: this.memoryState.isAuthenticated,
              hasUser: !!this.memoryState.user,
              hasAccessToken: !!this.memoryState.accessToken,
              tokenExpiresAt: this.memoryState.tokenExpiresAt ? new Date(this.memoryState.tokenExpiresAt).toISOString() : null
            })
          } else {
            console.warn('[AuthStateManager] 本地存储状态无效，重置为初始状态')
            this.clearState()
          }
        } else {
          console.warn('[AuthStateManager] 存储状态版本不匹配，重置状态')
          this.clearState()
        }
      } else {
        console.log('[AuthStateManager] 本地存储中没有认证状态数据')
      }
    } catch (error) {
      console.error('[AuthStateManager] 加载本地存储失败:', error)
      this.clearState()
    }
  }

  /**
   * 验证状态完整性
   */
  private validateState(state: AuthStateData): boolean {
    // 基本验证
    if (state.isAuthenticated && (!state.user || !state.accessToken)) {
      return false
    }

    // 检查令牌过期时间
    if (state.tokenExpiresAt && state.tokenExpiresAt < Date.now() - 60000) { // 1分钟容错
      console.warn('[AuthStateManager] 令牌已过期，状态无效')
      return false
    }

    return true
  }

  /**
   * 设置存储事件监听器
   */
  private setupStorageListener(): void {
    if (typeof window === 'undefined') return

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === AuthStateManager.SYNC_EVENT_KEY && event.newValue) {
        try {
          const syncEvent: StateSyncEvent = JSON.parse(event.newValue)

          // 忽略自己触发的事件
          if (syncEvent.source === this.getSourceId()) {
            return
          }

          this.handleSyncEvent(syncEvent)
        } catch (error) {
          console.error('[AuthStateManager] 处理同步事件失败:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    console.log('[AuthStateManager] 存储事件监听器已设置')
  }

  /**
   * 设置页面可见性监听器
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面重新可见时，检查状态同步
        this.syncFromStorage()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    console.log('[AuthStateManager] 页面可见性监听器已设置')
  }

  /**
   * 处理同步事件
   */
  private handleSyncEvent(event: StateSyncEvent): void {
    console.log('[AuthStateManager] 收到同步事件:', event.type)

    switch (event.type) {
      case 'auth_update':
        if (event.data) {
          this.updateState(event.data, false)
        }
        break
      case 'auth_clear':
      case 'auth_logout':
        this.clearState(false)
        break
    }

    // 通知监听器
    this.notifyListeners(event)
  }

  /**
   * 更新认证状态
   */
  updateAuthState(user: User, tokens: Tokens, syncToStorage = true): void {
    const newState: Partial<AuthStateData> = {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: Date.now() + (tokens.expiresIn * 1000),
      isAuthenticated: true,
      lastSync: Date.now()
    }

    this.updateState(newState, syncToStorage)

    if (syncToStorage) {
      this.broadcastEvent({
        type: 'auth_update',
        data: newState,
        timestamp: Date.now(),
        source: this.getSourceId()
      })
    }

    console.log('[AuthStateManager] 认证状态已更新')
  }

  /**
   * 清除认证状态
   */
  clearAuthState(syncToStorage = true): void {
    this.clearState(syncToStorage)

    if (syncToStorage) {
      this.broadcastEvent({
        type: 'auth_clear',
        timestamp: Date.now(),
        source: this.getSourceId()
      })
    }

    console.log('[AuthStateManager] 认证状态已清除')
  }

  /**
   * 登出
   */
  logout(syncToStorage = true): void {
    this.clearState(syncToStorage)

    if (syncToStorage) {
      this.broadcastEvent({
        type: 'auth_logout',
        timestamp: Date.now(),
        source: this.getSourceId()
      })
    }

    console.log('[AuthStateManager] 已登出')
  }

  /**
   * 更新状态
   */
  private updateState(partialState: Partial<AuthStateData>, syncToStorage: boolean): void {
    this.memoryState = { ...this.memoryState, ...partialState }

    if (syncToStorage) {
      this.saveToStorage()
    }
  }

  /**
   * 清除状态
   */
  private clearState(syncToStorage: boolean): void {
    this.memoryState = this.getInitialState()
    this.memoryState.lastSync = Date.now()

    if (syncToStorage) {
      this.saveToStorage()
    }
  }

  /**
   * 保存到本地存储（防抖）
   */
  private saveToStorage(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer)
    }

    this.syncDebounceTimer = setTimeout(() => {
      try {
        const data = {
          version: AuthStateManager.STATE_VERSION,
          state: this.memoryState,
          timestamp: Date.now()
        }

        localStorage.setItem(AuthStateManager.STORAGE_KEY, JSON.stringify(data))
        console.log('[AuthStateManager] 状态已保存到本地存储')
      } catch (error) {
        console.error('[AuthStateManager] 保存本地存储失败:', error)
      }
    }, 100)
  }

  /**
   * 从存储同步状态
   */
  private syncFromStorage(): void {
    try {
      const stored = localStorage.getItem(AuthStateManager.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)

        if (parsed.version === AuthStateManager.STATE_VERSION) {
          const lastSync = this.memoryState.lastSync

          // 只同步其他标签页更新的状态
          if (parsed.state.lastSync > lastSync) {
            this.memoryState = { ...this.getInitialState(), ...parsed.state }
            console.log('[AuthStateManager] 从本地存储同步状态')
          }
        }
      }
    } catch (error) {
      console.error('[AuthStateManager] 同步存储状态失败:', error)
    }
  }

  /**
   * 广播同步事件
   */
  private broadcastEvent(event: StateSyncEvent): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(AuthStateManager.SYNC_EVENT_KEY, JSON.stringify(event))

      // 立即清除事件，避免在同一个标签页触发 storage 事件
      setTimeout(() => {
        localStorage.removeItem(AuthStateManager.SYNC_EVENT_KEY)
      }, 0)
    } catch (error) {
      console.error('[AuthStateManager] 广播事件失败:', error)
    }
  }

  /**
   * 获取源ID
   */
  private getSourceId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 添加状态变化监听器
   */
  addEventListener(listener: (event: StateSyncEvent) => void): void {
    this.eventListeners.push(listener)
  }

  /**
   * 移除状态变化监听器
   */
  removeEventListener(listener: (event: StateSyncEvent) => void): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(event: StateSyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[AuthStateManager] 监听器执行失败:', error)
      }
    })
  }

  /**
   * 获取当前状态
   */
  getState(): AuthStateData {
    return { ...this.memoryState }
  }

  /**
   * 检查令牌是否即将过期
   */
  isTokenExpiringSoon(thresholdMinutes = 15): boolean {
    if (!this.memoryState.tokenExpiresAt) return false

    const now = Date.now()
    const threshold = thresholdMinutes * 60 * 1000
    return this.memoryState.tokenExpiresAt - now <= threshold
  }

  /**
   * 检查令牌是否已过期
   */
  isTokenExpired(): boolean {
    if (!this.memoryState.tokenExpiresAt) return true
    return this.memoryState.tokenExpiresAt <= Date.now()
  }

  /**
   * 检查是否需要重新认证
   */
  needsReauthentication(): boolean {
    return !this.memoryState.isAuthenticated ||
           !this.memoryState.user ||
           !this.memoryState.accessToken ||
           this.isTokenExpired()
  }

  /**
   * 重置管理器
   */
  reset(): void {
    console.log('[AuthStateManager] 重置状态管理器')
    this.memoryState = this.getInitialState()
    this.eventListeners = []

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer)
      this.syncDebounceTimer = null
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AuthStateManager.STORAGE_KEY)
        localStorage.removeItem(AuthStateManager.SYNC_EVENT_KEY)
      } catch (error) {
        console.error('[AuthStateManager] 清除存储失败:', error)
      }
    }
  }
}

// 创建单例实例
export const authStateManager = new AuthStateManager()