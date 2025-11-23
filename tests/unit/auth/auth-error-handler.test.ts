/**
 * AuthErrorHandler 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthErrorHandler, AuthErrorType, ErrorSeverity } from '~/utils/auth-error-handler'

describe('AuthErrorHandler', () => {
  let handler: AuthErrorHandler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new AuthErrorHandler()
  })

  describe('错误分类', () => {
    it('应该正确分类网络错误', () => {
      const fetchError = new Error('fetch failed')
      fetchError.name = 'FetchError'

      const authError = handler.handleError(fetchError, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.NETWORK_ERROR)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(true)
      expect(authError.shouldClearAuth).toBe(false)
    })

    it('应该正确分类超时错误', () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'

      const authError = handler.handleError(timeoutError, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.TIMEOUT_ERROR)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(true)
    })

    it('应该正确分类连接错误', () => {
      const connectionError = new Error('ECONNREFUSED')
      connectionError.name = 'FetchError'

      const authError = handler.handleError(connectionError, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.CONNECTION_ERROR)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(true)
    })
  })

  describe('HTTP状态码错误分类', () => {
    it('应该正确分类400错误', () => {
      const error = {
        statusCode: 400,
        message: 'Bad Request'
      }

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.VALIDATION_ERROR)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(false)
    })

    it('应该正确分类401错误', () => {
      const error = {
        statusCode: 401,
        message: 'Unauthorized'
      }

      // 登录场景
      const loginError = handler.handleError(error, { action: 'login' })
      expect(loginError.type).toBe(AuthErrorType.TOKEN_EXPIRED)
      expect(loginError.shouldClearAuth).toBe(true)

      // 刷新令牌场景
      const refreshError = handler.handleError(error, { action: 'refresh' })
      expect(refreshError.type).toBe(AuthErrorType.INVALID_REFRESH_TOKEN)
      expect(refreshError.shouldClearAuth).toBe(true)
    })

    it('应该正确分类403错误', () => {
      const error = {
        statusCode: 403,
        message: 'Forbidden'
      }

      const authError = handler.handleError(error, { action: 'api_request' })

      expect(authError.type).toBe(AuthErrorType.ACCESS_DENIED)
      expect(authError.severity).toBe(ErrorSeverity.HIGH)
      expect(authError.isRetryable).toBe(false)
      expect(authError.shouldClearAuth).toBe(true)
    })

    it('应该正确分类404错误', () => {
      const error = {
        statusCode: 404,
        message: 'Not Found'
      }

      // 登录场景
      const loginError = handler.handleError(error, { action: 'login' })
      expect(loginError.type).toBe(AuthErrorType.USER_NOT_FOUND)

      // API请求场景
      const apiError = handler.handleError(error, { action: 'api_request' })
      expect(apiError.type).toBe(AuthErrorType.ACCESS_DENIED)
    })

    it('应该正确分类429错误', () => {
      const error = {
        statusCode: 429,
        message: 'Too Many Requests'
      }

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.RATE_LIMITED)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(true)
    })

    it('应该正确分类500错误', () => {
      const error = {
        statusCode: 500,
        message: 'Internal Server Error'
      }

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.SERVER_ERROR)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(true)
    })

    it('应该正确分类504错误', () => {
      const error = {
        statusCode: 504,
        message: 'Gateway Timeout'
      }

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.TIMEOUT_ERROR)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(true)
    })
  })

  describe('业务逻辑错误分类', () => {
    it('应该正确分类无效凭据错误', () => {
      const error = new Error('Invalid credentials')

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.INVALID_CREDENTIALS)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(false)
    })

    it('应该正确分类账户锁定错误', () => {
      const error = new Error('Account locked')

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.ACCOUNT_LOCKED)
      expect(authError.severity).toBe(ErrorSeverity.HIGH)
      expect(authError.isRetryable).toBe(false)
    })

    it('应该正确分类账户禁用错误', () => {
      const error = new Error('Account disabled')

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.USER_INACTIVE)
      expect(authError.severity).toBe(ErrorSeverity.HIGH)
      expect(authError.isRetryable).toBe(false)
    })

    it('应该正确分类邮箱验证错误', () => {
      const error = new Error('Email not verified')

      const authError = handler.handleError(error, { action: 'login' })

      expect(authError.type).toBe(AuthErrorType.EMAIL_NOT_VERIFIED)
      expect(authError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(authError.isRetryable).toBe(false)
    })
  })

  describe('重试逻辑', () => {
    it('应该正确判断是否应该重试', () => {
      // 可重试的错误
      const retryableError = handler.handleError(
        new Error('Network error'),
        { action: 'login', retryCount: 1 }
      )
      expect(handler.shouldRetry(retryableError)).toBe(true)

      // 不可重试的错误
      const nonRetryableError = handler.handleError(
        { statusCode: 401, message: 'Unauthorized' },
        { action: 'login', retryCount: 0 }
      )
      expect(handler.shouldRetry(nonRetryableError)).toBe(false)

      // 达到最大重试次数
      const maxRetriesError = handler.handleError(
        new Error('Network error'),
        { action: 'login', retryCount: 3 }
      )
      expect(handler.shouldRetry(maxRetriesError)).toBe(false)
    })

    it('应该正确计算重试延迟', () => {
      const error = handler.handleError(
        new Error('Network error'),
        { action: 'login', retryCount: 1 }
      )

      const delay1 = handler.getRetryDelay(error)
      const delay2 = handler.getRetryDelay({
        ...error,
        context: { ...error.context, retryCount: 2 }
      })

      expect(delay2).toBe(delay1 * 2) // 指数退避
    })
  })

  describe('用户消息', () => {
    it('应该提供用户友好的错误消息', () => {
      const error = handler.handleError(
        new Error('Network error'),
        { action: 'login' }
      )

      expect(handler.getUserMessage(error)).toBe('网络连接异常，请检查网络后重试')
    })

    it('应该为不同错误类型提供合适的用户消息', () => {
      const cases = [
        {
          error: { statusCode: 401, message: 'Unauthorized' },
          action: 'login' as const,
          expectedMessage: '登录已过期，请重新登录'
        },
        {
          error: { statusCode: 403, message: 'Forbidden' },
          action: 'api_request' as const,
          expectedMessage: '权限不足，无法访问该资源'
        },
        {
          error: { statusCode: 429, message: 'Too Many Requests' },
          action: 'login' as const,
          expectedMessage: '请求过于频繁，请稍后重试'
        },
        {
          error: new Error('Invalid credentials'),
          action: 'login' as const,
          expectedMessage: '用户名或密码错误'
        }
      ]

      cases.forEach(({ error, action, expectedMessage }) => {
        const authError = handler.handleError(error, { action })
        expect(handler.getUserMessage(authError)).toBe(expectedMessage)
      })
    })
  })

  describe('认证状态清除', () => {
    it('应该正确判断是否应该清除认证状态', () => {
      // 应该清除认证状态的错误
      const clearAuthErrors = [
        { statusCode: 401, message: 'Unauthorized' },
        { statusCode: 403, message: 'Forbidden' },
        new Error('Account locked'),
        new Error('Account disabled')
      ]

      clearAuthErrors.forEach(error => {
        const authError = handler.handleError(error, { action: 'login' })
        expect(handler.shouldClearAuthState(authError)).toBe(true)
      })

      // 不应该清除认证状态的错误
      const keepAuthErrors = [
        new Error('Network error'),
        { statusCode: 500, message: 'Internal Server Error' },
        { statusCode: 429, message: 'Too Many Requests' }
      ]

      keepAuthErrors.forEach(error => {
        const authError = handler.handleError(error, { action: 'login' })
        expect(handler.shouldClearAuthState(authError)).toBe(false)
      })
    })
  })

  describe('错误统计', () => {
    it('应该正确统计错误', () => {
      // 生成不同类型的错误
      const errors = [
        { error: new Error('Network error'), action: 'login' as const },
        { error: { statusCode: 401, message: 'Unauthorized' }, action: 'refresh' as const },
        { error: { statusCode: 500, message: 'Internal Server Error' }, action: 'api_request' as const }
      ]

      errors.forEach(({ error, action }) => {
        handler.handleError(error, { action })
      })

      const stats = handler.getErrorStats()

      expect(stats.total).toBe(3)
      expect(stats.byType[AuthErrorType.NETWORK_ERROR]).toBe(1)
      expect(stats.byType[AuthErrorType.TOKEN_EXPIRED]).toBe(1)
      expect(stats.byType[AuthErrorType.SERVER_ERROR]).toBe(1)
      expect(stats.recent).toHaveLength(3)
    })

    it('应该限制错误日志大小', () => {
      const maxSize = 100

      // 生成大量错误
      for (let i = 0; i < maxSize + 50; i++) {
        handler.handleError(new Error(`Error ${i}`), { action: 'login' })
      }

      const stats = handler.getErrorStats()
      expect(stats.total).toBe(maxSize)
    })

    it('应该清除错误日志', () => {
      // 生成一些错误
      for (let i = 0; i < 5; i++) {
        handler.handleError(new Error(`Error ${i}`), { action: 'login' })
      }

      expect(handler.getErrorStats().total).toBe(5)

      // 清除日志
      handler.clearErrorLog()

      expect(handler.getErrorStats().total).toBe(0)
    })
  })

  describe('配置定制', () => {
    it('应该支持自定义配置', () => {
      const customHandler = new AuthErrorHandler({
        maxRetries: {
          [AuthErrorType.NETWORK_ERROR]: 5
        },
        retryDelays: {
          [AuthErrorType.NETWORK_ERROR]: 5000
        },
        userMessages: {
          [AuthErrorType.NETWORK_ERROR]: '自定义网络错误消息'
        }
      })

      const error = customHandler.handleError(
        new Error('Network error'),
        { action: 'login', retryCount: 3 }
      )

      // 验证自定义配置生效
      expect(customHandler.shouldRetry(error)).toBe(true) // 自定义最大重试次数
      expect(customHandler.getRetryDelay(error)).toBe(5000) // 自定义延迟
      expect(customHandler.getUserMessage(error)).toBe('自定义网络错误消息') // 自定义消息
    })
  })

  describe('错误日志导出', () => {
    it('应该导出错误日志', () => {
      // 生成一些错误
      handler.handleError(new Error('Test error 1'), { action: 'login' })
      handler.handleError({ statusCode: 401, message: 'Unauthorized' }, { action: 'refresh' })

      const exportedLog = handler.exportErrorLog()

      // 验证导出的日志是有效的JSON
      expect(() => {
        const parsed = JSON.parse(exportedLog)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed).toHaveLength(2)
      }).not.toThrow()
    })
  })

  describe('控制台输出', () => {
    it('应该根据严重程度使用不同的控制台方法', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // 低严重度错误
      handler.handleError(new Error('Network error'), { action: 'login' })
      expect(consoleLogSpy).toHaveBeenCalled()

      // 高严重度错误
      handler.handleError({ statusCode: 401, message: 'Unauthorized' }, { action: 'login' })
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleLogSpy.mockRestore()
      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })
})