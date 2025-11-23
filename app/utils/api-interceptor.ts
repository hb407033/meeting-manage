/**
 * API拦截器 - 增强并发请求处理和令牌管理
 */

import { useAuthStore } from '~/stores/auth'
import { tokenRefreshManager } from './token-refresh-manager'
import { authErrorHandler } from './auth-error-handler'

export interface ApiRequestConfig {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: any
  requireAuth?: boolean
  retryOnAuthError?: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  statusCode?: number
}

export class ApiInterceptor {
  private static instance: ApiInterceptor
  private authStore: ReturnType<typeof useAuthStore>
  private pendingRequests = new Map<string, Promise<any>>()
  private maxRetries = 3
  private retryDelay = 1000

  private constructor() {
    this.authStore = useAuthStore()
  }

  static getInstance(): ApiInterceptor {
    if (!ApiInterceptor.instance) {
      ApiInterceptor.instance = new ApiInterceptor()
    }
    return ApiInterceptor.instance
  }

  /**
   * 拦截并执行API请求
   */
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId(config)

    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(requestId)) {
      console.log(`[ApiInterceptor] 发现重复请求，复用现有请求: ${config.url}`)
      return this.pendingRequests.get(requestId)!
    }

    // 创建请求Promise
    const requestPromise = this.executeRequest<T>(config)

    // 记录待处理的请求
    this.pendingRequests.set(requestId, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      // 清理待处理的请求
      this.pendingRequests.delete(requestId)
    }
  }

  /**
   * 执行实际的API请求
   */
  private async executeRequest<T = any>(config: ApiRequestConfig, retryCount = 0): Promise<ApiResponse<T>> {
    const { $apiFetch } = useNuxtApp()

    try {
      console.log(`[ApiInterceptor] 执行API请求: ${config.method || 'GET'} ${config.url}`)

      // 准备请求头
      const headers = {
        ...config.headers
      }

      // 添加认证头
      if (config.requireAuth !== false && this.authStore.accessToken) {
        headers.Authorization = `Bearer ${this.authStore.accessToken}`
      }

      // 检查令牌是否即将过期
      if (this.authStore.isTokenExpiringSoon && config.requireAuth !== false) {
        console.log('[ApiInterceptor] 检测到令牌即将过期，尝试提前刷新')
        try {
          await this.authStore.refreshTokens()
        } catch (error) {
          console.warn('[ApiInterceptor] 提前刷新令牌失败，继续使用当前令牌')
        }

        // 更新认证头
        if (this.authStore.accessToken) {
          headers.Authorization = `Bearer ${this.authStore.accessToken}`
        }
      }

      // 执行请求
      const response = await $apiFetch<ApiResponse<T>>(config.url, {
        method: config.method || 'GET',
        headers,
        body: config.body
      })

      console.log(`[ApiInterceptor] API请求成功: ${config.url}`)
      return response

    } catch (error: any) {
      console.error(`[ApiInterceptor] API请求失败: ${config.url}`, error)

      const authError = authErrorHandler.handleError(error, {
        action: 'api_request',
        url: config.url,
        statusCode: error.statusCode,
        retryCount
      })

      // 处理认证错误
      if (authError.type === 'TOKEN_EXPIRED' && config.requireAuth !== false && retryCount < this.maxRetries) {
        console.log(`[ApiInterceptor] 检测到令牌过期，尝试刷新并重试 (${retryCount + 1}/${this.maxRetries})`)

        try {
          // 刷新令牌
          await this.authStore.refreshTokens()

          // 重试请求
          await this.delay(this.retryDelay * Math.pow(2, retryCount)) // 指数退避
          return this.executeRequest<T>(config, retryCount + 1)

        } catch (refreshError) {
          console.error('[ApiInterceptor] 刷新令牌失败:', refreshError)
          throw authError
        }
      }

      // 处理其他可重试错误
      if (authError.isRetryable && retryCount < this.maxRetries && config.retryOnAuthError !== false) {
        console.log(`[ApiInterceptor] 重试请求 (${retryCount + 1}/${this.maxRetries}): ${config.url}`)

        await this.delay(this.retryDelay * Math.pow(2, retryCount))
        return this.executeRequest<T>(config, retryCount + 1)
      }

      // 清除认证状态（如果需要）
      if (authErrorHandler.shouldClearAuthState(authError)) {
        console.warn('[ApiInterceptor] 错误需要清除认证状态:', authError.type)
        this.authStore.clearAuth()
      }

      throw authError
    }
  }

  /**
   * 批量执行API请求
   */
  async batchRequest<T = any>(configs: ApiRequestConfig[]): Promise<ApiResponse<T>[]> {
    console.log(`[ApiInterceptor] 执行批量请求，数量: ${configs.length}`)

    // 控制并发数量，避免过多同时请求
    const concurrencyLimit = 5
    const results: ApiResponse<T>[] = []

    for (let i = 0; i < configs.length; i += concurrencyLimit) {
      const batch = configs.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map(config => this.request<T>(config))

      const batchResults = await Promise.allSettled(batchPromises)

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error(`[ApiInterceptor] 批量请求失败 [${i + index}]:`, result.reason)
          results.push({
            success: false,
            message: result.reason.message || '请求失败'
          })
        }
      })
    }

    return results
  }

  /**
   * 取消所有待处理的请求
   */
  cancelAllRequests(): void {
    const count = this.pendingRequests.size
    this.pendingRequests.clear()
    console.log(`[ApiInterceptor] 取消了 ${count} 个待处理请求`)
  }

  /**
   * 获取待处理请求数量
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size
  }

  /**
   * 检查请求是否正在进行
   */
  isRequestPending(config: ApiRequestConfig): boolean {
    const requestId = this.generateRequestId(config)
    return this.pendingRequests.has(requestId)
  }

  /**
   * 生成请求ID（用于去重）
   */
  private generateRequestId(config: ApiRequestConfig): string {
    const method = config.method || 'GET'
    const body = config.body ? JSON.stringify(config.body) : ''
    return `${method}:${config.url}:${body}`
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 设置拦截器配置
   */
  setConfig(config: {
    maxRetries?: number
    retryDelay?: number
  }): void {
    if (config.maxRetries !== undefined) {
      this.maxRetries = config.maxRetries
    }
    if (config.retryDelay !== undefined) {
      this.retryDelay = config.retryDelay
    }
  }

  /**
   * 获取拦截器状态
   */
  getStatus() {
    return {
      pendingRequests: this.pendingRequests.size,
      config: {
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay
      }
    }
  }
}

// 创建单例实例
export const apiInterceptor = ApiInterceptor.getInstance()

// 创建便捷方法
export const apiRequest = <T = any>(config: ApiRequestConfig) =>
  apiInterceptor.request<T>(config)

export const batchApiRequest = <T = any>(configs: ApiRequestConfig[]) =>
  apiInterceptor.batchRequest<T>(configs)