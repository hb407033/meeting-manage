/**
 * 认证错误处理器
 *
 * 解决以下问题：
 * 1. 过度清除认证状态
 * 2. 错误分类和处理
 * 3. 区分临时错误和永久错误
 * 4. 智能重试策略
 */

export interface ErrorContext {
  action: 'login' | 'register' | 'refresh' | 'logout' | 'api_request'
  url?: string
  statusCode?: number
  timestamp: number
  retryCount?: number
}

export enum AuthErrorType {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // 认证相关错误
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // 服务器相关错误
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',

  // 用户相关错误
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',

  // 系统相关错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',      // 用户友好提示，不影响核心功能
  MEDIUM = 'MEDIUM', // 需要用户注意，可能需要重试
  HIGH = 'HIGH',    // 严重问题，需要清除认证状态
  CRITICAL = 'CRITICAL' // 系统级错误，需要立即处理
}

export interface AuthError extends Error {
  type: AuthErrorType
  severity: ErrorSeverity
  isRetryable: boolean
  userMessage: string
  context: ErrorContext
  statusCode?: number
  shouldClearAuth: boolean
}

export interface ErrorHandlerConfig {
  maxRetries: {
    [key in AuthErrorType]: number
  }
  retryDelays: {
    [key in AuthErrorType]: number
  }
  userMessages: {
    [key in AuthErrorType]: string
  }
}

export class AuthErrorHandler {
  private static readonly DEFAULT_CONFIG: ErrorHandlerConfig = {
    maxRetries: {
      [AuthErrorType.NETWORK_ERROR]: 3,
      [AuthErrorType.TIMEOUT_ERROR]: 2,
      [AuthErrorType.CONNECTION_ERROR]: 3,
      [AuthErrorType.INVALID_CREDENTIALS]: 0,
      [AuthErrorType.TOKEN_EXPIRED]: 1,
      [AuthErrorType.INVALID_REFRESH_TOKEN]: 0,
      [AuthErrorType.ACCESS_DENIED]: 0,
      [AuthErrorType.SESSION_EXPIRED]: 1,
      [AuthErrorType.SERVER_ERROR]: 2,
      [AuthErrorType.SERVICE_UNAVAILABLE]: 3,
      [AuthErrorType.RATE_LIMITED]: 2,
      [AuthErrorType.USER_NOT_FOUND]: 0,
      [AuthErrorType.USER_INACTIVE]: 0,
      [AuthErrorType.ACCOUNT_LOCKED]: 0,
      [AuthErrorType.EMAIL_NOT_VERIFIED]: 0,
      [AuthErrorType.VALIDATION_ERROR]: 0,
      [AuthErrorType.PARSE_ERROR]: 1,
      [AuthErrorType.UNKNOWN_ERROR]: 1
    },
    retryDelays: {
      [AuthErrorType.NETWORK_ERROR]: 2000,
      [AuthErrorType.TIMEOUT_ERROR]: 1000,
      [AuthErrorType.CONNECTION_ERROR]: 3000,
      [AuthErrorType.INVALID_CREDENTIALS]: 0,
      [AuthErrorType.TOKEN_EXPIRED]: 500,
      [AuthErrorType.INVALID_REFRESH_TOKEN]: 0,
      [AuthErrorType.ACCESS_DENIED]: 0,
      [AuthErrorType.SESSION_EXPIRED]: 1000,
      [AuthErrorType.SERVER_ERROR]: 1500,
      [AuthErrorType.SERVICE_UNAVAILABLE]: 5000,
      [AuthErrorType.RATE_LIMITED]: 10000,
      [AuthErrorType.USER_NOT_FOUND]: 0,
      [AuthErrorType.USER_INACTIVE]: 0,
      [AuthErrorType.ACCOUNT_LOCKED]: 0,
      [AuthErrorType.EMAIL_NOT_VERIFIED]: 0,
      [AuthErrorType.VALIDATION_ERROR]: 0,
      [AuthErrorType.PARSE_ERROR]: 1000,
      [AuthErrorType.UNKNOWN_ERROR]: 2000
    },
    userMessages: {
      [AuthErrorType.NETWORK_ERROR]: '网络连接异常，请检查网络后重试',
      [AuthErrorType.TIMEOUT_ERROR]: '请求超时，请稍后重试',
      [AuthErrorType.CONNECTION_ERROR]: '无法连接到服务器，请检查网络连接',
      [AuthErrorType.INVALID_CREDENTIALS]: '用户名或密码错误',
      [AuthErrorType.TOKEN_EXPIRED]: '登录已过期，请重新登录',
      [AuthErrorType.INVALID_REFRESH_TOKEN]: '登录状态异常，请重新登录',
      [AuthErrorType.ACCESS_DENIED]: '权限不足，无法访问该资源',
      [AuthErrorType.SESSION_EXPIRED]: '会话已过期，请重新登录',
      [AuthErrorType.SERVER_ERROR]: '服务器内部错误，请稍后重试',
      [AuthErrorType.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
      [AuthErrorType.RATE_LIMITED]: '请求过于频繁，请稍后重试',
      [AuthErrorType.USER_NOT_FOUND]: '用户不存在',
      [AuthErrorType.USER_INACTIVE]: '账户已被禁用，请联系管理员',
      [AuthErrorType.ACCOUNT_LOCKED]: '账户已被锁定，请稍后重试或联系管理员',
      [AuthErrorType.EMAIL_NOT_VERIFIED]: '邮箱未验证，请先验证邮箱',
      [AuthErrorType.VALIDATION_ERROR]: '输入信息有误，请检查后重试',
      [AuthErrorType.PARSE_ERROR]: '数据解析错误，请重试',
      [AuthErrorType.UNKNOWN_ERROR]: '发生未知错误，请重试'
    }
  }

  private config: ErrorHandlerConfig
  private errorLog: AuthError[] = []
  private maxLogSize = 100

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = this.mergeConfig(AuthErrorHandler.DEFAULT_CONFIG, config)
  }

  /**
   * 处理错误
   */
  handleError(error: Error | any, context: Partial<ErrorContext> = {}): AuthError {
    const fullContext: ErrorContext = {
      action: context.action || 'api_request',
      url: context.url,
      statusCode: context.statusCode,
      timestamp: context.timestamp || Date.now(),
      retryCount: context.retryCount || 0,
      ...context
    }

    const authError = this.categorizeError(error, fullContext)

    // 记录错误
    this.logError(authError)

    // 根据错误严重程度决定处理方式
    if (authError.shouldClearAuth) {
      console.warn('[AuthErrorHandler] 错误需要清除认证状态:', authError.type)
    }

    return authError
  }

  /**
   * 错误分类
   */
  private categorizeError(error: Error | any, context: ErrorContext): AuthError {
    let type: AuthErrorType
    let severity: ErrorSeverity
    let isRetryable: boolean
    let shouldClearAuth = false

    // 网络相关错误
    if (error.name === 'FetchError' || error.message.includes('fetch')) {
      if (error.message.includes('timeout')) {
        type = AuthErrorType.TIMEOUT_ERROR
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Network error')) {
        type = AuthErrorType.CONNECTION_ERROR
      } else {
        type = AuthErrorType.NETWORK_ERROR
      }
      severity = ErrorSeverity.MEDIUM
      isRetryable = true
    }
    // HTTP 状态码错误
    else if ('statusCode' in error || 'status' in error) {
      const statusCode = error.statusCode || error.status

      switch (statusCode) {
        case 400:
          type = AuthErrorType.VALIDATION_ERROR
          severity = ErrorSeverity.MEDIUM
          isRetryable = false
          break
        case 401:
          type = context.action === 'refresh' ? AuthErrorType.INVALID_REFRESH_TOKEN : AuthErrorType.TOKEN_EXPIRED
          severity = ErrorSeverity.HIGH
          isRetryable = context.action === 'refresh'
          shouldClearAuth = true
          break
        case 403:
          type = AuthErrorType.ACCESS_DENIED
          severity = ErrorSeverity.HIGH
          isRetryable = false
          break
        case 404:
          if (context.action === 'login' || context.action === 'register') {
            type = AuthErrorType.USER_NOT_FOUND
          } else {
            type = AuthErrorType.ACCESS_DENIED
          }
          severity = ErrorSeverity.HIGH
          isRetryable = false
          break
        case 429:
          type = AuthErrorType.RATE_LIMITED
          severity = ErrorSeverity.MEDIUM
          isRetryable = true
          break
        case 500:
        case 502:
        case 503:
          type = AuthErrorType.SERVER_ERROR
          severity = ErrorSeverity.MEDIUM
          isRetryable = true
          break
        case 504:
          type = AuthErrorType.TIMEOUT_ERROR
          severity = ErrorSeverity.MEDIUM
          isRetryable = true
          break
        default:
          type = AuthErrorType.UNKNOWN_ERROR
          severity = ErrorSeverity.MEDIUM
          isRetryable = statusCode >= 500
      }
    }
    // 业务逻辑错误
    else if (error.message) {
      const message = error.message.toLowerCase()

      if (message.includes('invalid') && (message.includes('credential') || message.includes('password'))) {
        type = AuthErrorType.INVALID_CREDENTIALS
        severity = ErrorSeverity.MEDIUM
        isRetryable = false
      } else if (message.includes('expired')) {
        type = AuthErrorType.TOKEN_EXPIRED
        severity = ErrorSeverity.HIGH
        isRetryable = context.action === 'refresh'
        shouldClearAuth = true
      } else if (message.includes('locked')) {
        type = AuthErrorType.ACCOUNT_LOCKED
        severity = ErrorSeverity.HIGH
        isRetryable = false
      } else if (message.includes('inactive') || message.includes('disabled')) {
        type = AuthErrorType.USER_INACTIVE
        severity = ErrorSeverity.HIGH
        isRetryable = false
      } else if (message.includes('verification')) {
        type = AuthErrorType.EMAIL_NOT_VERIFIED
        severity = ErrorSeverity.MEDIUM
        isRetryable = false
      } else {
        type = AuthErrorType.UNKNOWN_ERROR
        severity = ErrorSeverity.MEDIUM
        isRetryable = true
      }
    }
    // 其他未知错误
    else {
      type = AuthErrorType.UNKNOWN_ERROR
      severity = ErrorSeverity.MEDIUM
      isRetryable = true
    }

    return {
      name: 'AuthError',
      message: error.message || '未知错误',
      type,
      severity,
      isRetryable,
      shouldClearAuth,
      userMessage: this.config.userMessages[type],
      context,
      statusCode: context.statusCode,
      stack: error.stack
    }
  }

  /**
   * 记录错误
   */
  private logError(error: AuthError): void {
    this.errorLog.push(error)

    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize)
    }

    // 控制台输出
    const logMethod = error.severity === ErrorSeverity.CRITICAL ? 'error' :
                      error.severity === ErrorSeverity.HIGH ? 'warn' :
                      'log'

    console[logMethod](`[AuthErrorHandler] ${error.type}:`, {
      message: error.message,
      userMessage: error.userMessage,
      context: error.context,
      isRetryable: error.isRetryable,
      shouldClearAuth: error.shouldClearAuth
    })
  }

  /**
   * 检查是否应该重试
   */
  shouldRetry(error: AuthError): boolean {
    if (!error.isRetryable) return false

    const maxRetries = this.config.maxRetries[error.type]
    const currentRetries = error.context.retryCount || 0

    return currentRetries < maxRetries
  }

  /**
   * 获取重试延迟
   */
  getRetryDelay(error: AuthError): number {
    const baseDelay = this.config.retryDelays[error.type]
    const retryCount = error.context.retryCount || 0

    // 指数退避
    return baseDelay * Math.pow(2, retryCount)
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(error: AuthError): string {
    return error.userMessage
  }

  /**
   * 检查是否应该清除认证状态
   */
  shouldClearAuthState(error: AuthError): boolean {
    return error.shouldClearAuth
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number
    byType: { [key in AuthErrorType]: number }
    bySeverity: { [key in ErrorSeverity]: number }
    recent: AuthError[]
  } {
    const byType = {} as { [key in AuthErrorType]: number }
    const bySeverity = {} as { [key in ErrorSeverity]: number }

    // 初始化计数器
    Object.values(AuthErrorType).forEach(type => {
      byType[type] = 0
    })
    Object.values(ErrorSeverity).forEach(severity => {
      bySeverity[severity] = 0
    })

    // 统计
    this.errorLog.forEach(error => {
      byType[error.type]++
      bySeverity[error.severity]++
    })

    return {
      total: this.errorLog.length,
      byType,
      bySeverity,
      recent: this.errorLog.slice(-10) // 最近10个错误
    }
  }

  /**
   * 清除错误日志
   */
  clearErrorLog(): void {
    this.errorLog = []
    console.log('[AuthErrorHandler] 错误日志已清除')
  }

  /**
   * 导出错误日志（用于调试）
   */
  exportErrorLog(): string {
    return JSON.stringify(this.errorLog, null, 2)
  }

  /**
   * 合并配置
   */
  private mergeConfig(defaultConfig: ErrorHandlerConfig, userConfig: Partial<ErrorHandlerConfig>): ErrorHandlerConfig {
    const merged = { ...defaultConfig }

    if (userConfig.maxRetries) {
      merged.maxRetries = { ...defaultConfig.maxRetries, ...userConfig.maxRetries }
    }

    if (userConfig.retryDelays) {
      merged.retryDelays = { ...defaultConfig.retryDelays, ...userConfig.retryDelays }
    }

    if (userConfig.userMessages) {
      merged.userMessages = { ...defaultConfig.userMessages, ...userConfig.userMessages }
    }

    return merged
  }
}

// 创建单例实例
export const authErrorHandler = new AuthErrorHandler()