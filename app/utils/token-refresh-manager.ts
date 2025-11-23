/**
 * 令牌刷新管理器
 *
 * 解决以下问题：
 * 1. 并发请求同时触发令牌刷新
 * 2. 令牌刷新失败时过度清除认证状态
 * 3. 缺少重试机制
 * 4. 网络错误处理不当
 */

export interface TokenRefreshConfig {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
  maxRetryDelay: number
  refreshTimeout: number
}

export interface RefreshRequest {
  resolve: (tokens: TokenSet) => void
  reject: (error: Error) => void
  timestamp: number
}

export interface TokenSet {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export enum RefreshErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface RefreshError extends Error {
  type: RefreshErrorType
  isRetryable: boolean
  statusCode?: number
}

export class TokenRefreshManager {
  private isRefreshing = false
  private refreshQueue: RefreshRequest[] = []
  private config: TokenRefreshConfig
  private retryCount = 0
  private lastRefreshAttempt = 0
  private refreshPromise: Promise<TokenSet> | null = null

  constructor(config: Partial<TokenRefreshConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000,
      refreshTimeout: 10000,
      ...config
    }
  }

  /**
   * 获取新的令牌，支持并发请求排队
   */
  async refreshTokens(refreshToken: string): Promise<TokenSet> {
    return new Promise((resolve, reject) => {
      const request: RefreshRequest = {
        resolve,
        reject,
        timestamp: Date.now()
      }

      // 如果正在刷新，加入队列
      if (this.isRefreshing) {
        this.refreshQueue.push(request)
        console.log(`[TokenRefreshManager] 令牌刷新进行中，请求加入队列，队列长度: ${this.refreshQueue.length}`)
        return
      }

      // 检查是否刚刚执行过刷新（防抖）
      const now = Date.now()
      if (now - this.lastRefreshAttempt < 1000) {
        console.log('[TokenRefreshManager] 令牌刷新请求过于频繁，延迟执行')
        setTimeout(() => {
          this.refreshQueue.push(request)
          this.processQueue(refreshToken)
        }, 1000)
        return
      }

      this.refreshQueue.push(request)
      this.processQueue(refreshToken)
    })
  }

  /**
   * 处理刷新队列
   */
  private async processQueue(refreshToken: string): Promise<void> {
    if (this.isRefreshing || this.refreshQueue.length === 0) {
      return
    }

    console.log(`[TokenRefreshManager] 开始处理令牌刷新队列，待处理请求数: ${this.refreshQueue.length}`)
    this.isRefreshing = true
    this.lastRefreshAttempt = Date.now()

    try {
      // 复用刷新 Promise，避免重复请求
      if (!this.refreshPromise) {
        this.refreshPromise = this.executeRefresh(refreshToken)
      }

      const tokens = await this.refreshPromise
      this.retryCount = 0 // 成功后重置重试次数

      // 成功时，解决所有排队的请求
      const requests = this.refreshQueue.splice(0)
      requests.forEach(request => {
        request.resolve(tokens)
      })

      console.log(`[TokenRefreshManager] 令牌刷新成功，处理了 ${requests.length} 个请求`)
    } catch (error) {
      console.error('[TokenRefreshManager] 令牌刷新失败:', error)

      const refreshError = this.categorizeError(error as Error)

      // 根据错误类型决定是否重试
      if (refreshError.isRetryable && this.retryCount < this.config.maxRetries) {
        console.log(`[TokenRefreshManager] 准备重试令牌刷新 (${this.retryCount + 1}/${this.config.maxRetries})`)
        await this.scheduleRetry(refreshToken)
      } else {
        // 失败时，拒绝所有排队的请求
        const requests = this.refreshQueue.splice(0)
        requests.forEach(request => {
          request.reject(refreshError)
        })

        console.error(`[TokenRefreshManager] 令牌刷新最终失败，拒绝 ${requests.length} 个请求`)
      }
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * 执行实际的令牌刷新
   */
  private async executeRefresh(refreshToken: string): Promise<TokenSet> {
    const { $apiFetch } = useNuxtApp()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('令牌刷新请求超时'))
      }, this.config.refreshTimeout)

      $apiFetch<{
        success: boolean
        data: { tokens: TokenSet }
        message: string
      }>('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken }
      })
      .then(response => {
        clearTimeout(timeout)
        if (response.success && response.data) {
          resolve(response.data.tokens)
        } else {
          reject(new Error(response.message || '令牌刷新失败'))
        }
      })
      .catch(error => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  /**
   * 错误分类
   */
  private categorizeError(error: Error): RefreshError {
    const refreshError = error as RefreshError

    // 网络错误
    if (error.name === 'FetchError' || error.message.includes('fetch')) {
      refreshError.type = RefreshErrorType.NETWORK_ERROR
      refreshError.isRetryable = true
    }
    // HTTP 状态码错误
    else if ('statusCode' in error) {
      const statusCode = (error as any).statusCode
      refreshError.statusCode = statusCode

      switch (statusCode) {
        case 401:
          refreshError.type = RefreshErrorType.INVALID_REFRESH_TOKEN
          refreshError.isRetryable = false
          break
        case 500:
        case 502:
        case 503:
        case 504:
          refreshError.type = RefreshErrorType.SERVER_ERROR
          refreshError.isRetryable = true
          break
        default:
          refreshError.type = RefreshErrorType.UNKNOWN_ERROR
          refreshError.isRetryable = statusCode >= 500
      }
    }
    // 超时错误
    else if (error.message.includes('超时') || error.message.includes('timeout')) {
      refreshError.type = RefreshErrorType.TIMEOUT
      refreshError.isRetryable = true
    }
    // 其他错误
    else {
      refreshError.type = RefreshErrorType.UNKNOWN_ERROR
      refreshError.isRetryable = false
    }

    return refreshError
  }

  /**
   * 安排重试
   */
  private async scheduleRetry(refreshToken: string): Promise<void> {
    this.retryCount++

    const delay = Math.min(
      this.config.retryDelay * Math.pow(this.config.backoffMultiplier, this.retryCount - 1),
      this.config.maxRetryDelay
    )

    console.log(`[TokenRefreshManager] ${delay}ms 后重试令牌刷新`)

    await new Promise(resolve => setTimeout(resolve, delay))

    // 重新处理队列
    await this.processQueue(refreshToken)
  }

  /**
   * 获取刷新状态
   */
  getRefreshStatus(): {
    isRefreshing: boolean
    queueLength: number
    retryCount: number
    lastRefreshAttempt: number
  } {
    return {
      isRefreshing: this.isRefreshing,
      queueLength: this.refreshQueue.length,
      retryCount: this.retryCount,
      lastRefreshAttempt: this.lastRefreshAttempt
    }
  }

  /**
   * 重置管理器状态
   */
  reset(): void {
    console.log('[TokenRefreshManager] 重置管理器状态')
    this.isRefreshing = false
    this.refreshQueue = []
    this.retryCount = 0
    this.refreshPromise = null
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    const requests = this.refreshQueue.splice(0)
    requests.forEach(request => {
      request.reject(new Error('令牌刷新队列已清空'))
    })
    console.log(`[TokenRefreshManager] 清空队列，拒绝 ${requests.length} 个请求`)
  }
}

// 创建单例实例
export const tokenRefreshManager = new TokenRefreshManager()