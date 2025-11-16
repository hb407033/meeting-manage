import { errorResponse, serverErrorResponse, createError, ErrorCodes } from '../../utils/response'

export interface ErrorContext {
  userId?: number
  requestId?: string
  path?: string
  method?: string
  userAgent?: string
  ip?: string
  timestamp?: string
}

export interface ExtendedError extends Error {
  statusCode?: number
  code?: string
  details?: any
  context?: ErrorContext
}

/**
 * 错误处理中间件
 */
export function errorHandler(error: ExtendedError, event: any): any {
  // 添加错误上下文
  const context: ErrorContext = {
    userId: event.context.user?.id,
    requestId: event.context.requestId || generateRequestId(),
    path: event.node.req.url,
    method: event.node.req.method,
    userAgent: event.node.req.headers['user-agent'],
    ip: getClientIP(event),
    timestamp: new Date().toISOString()
  }

  // 记录错误
  logError(error, context)

  // 根据错误类型返回适当的响应
  if (isKnownError(error)) {
    return handleKnownError(error, context)
  } else {
    return handleUnknownError(error, context)
  }
}

/**
 * 已知错误的处理
 */
function handleKnownError(error: ExtendedError, context: ErrorContext): any {
  const statusCode = error.statusCode || 500
  const errorCode = error.code || ErrorCodes.INTERNAL_ERROR

  return errorResponse(
    error.message,
    statusCode,
    {
      code: errorCode,
      details: error.details,
      context: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }
  )
}

/**
 * 未知错误的处理
 */
function handleUnknownError(error: ExtendedError, context: ErrorContext): any {
  console.error('Unknown error:', error)

  // 在生产环境中隐藏错误详情
  const isProduction = process.env.NODE_ENV === 'production'
  const message = isProduction
    ? 'Internal server error'
    : error.message

  return serverErrorResponse(
    message,
    createError(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      isProduction ? null : error.stack
    )
  )
}

/**
 * 检查是否为已知错误类型
 */
function isKnownError(error: ExtendedError): boolean {
  return error.statusCode !== undefined || error.code !== undefined
}

/**
 * 创建应用程序错误
 */
export function createAppError(
  message: string,
  statusCode: number = 500,
  code: string = ErrorCodes.INTERNAL_ERROR,
  details?: any
): ExtendedError {
  const error = new Error(message) as ExtendedError
  error.statusCode = statusCode
  error.code = code
  error.details = details
  return error
}

/**
 * 常用错误创建函数
 */
export const AppErrors = {
  // 验证错误 (422)
  validationError: (message: string, details?: any) =>
    createAppError(message, 422, ErrorCodes.VALIDATION_ERROR, details),

  // 未找到错误 (404)
  notFoundError: (message: string = 'Resource not found') =>
    createAppError(message, 404, ErrorCodes.NOT_FOUND),

  // 未授权错误 (401)
  unauthorizedError: (message: string = 'Unauthorized') =>
    createAppError(message, 401, ErrorCodes.UNAUTHORIZED),

  // 禁止访问错误 (403)
  forbiddenError: (message: string = 'Forbidden') =>
    createAppError(message, 403, ErrorCodes.FORBIDDEN),

  // 限流错误 (429)
  rateLimitError: (message: string = 'Rate limit exceeded') =>
    createAppError(message, 429, ErrorCodes.RATE_LIMIT),

  // 用户未找到
  userNotFoundError: () =>
    createAppError('User not found', 404, ErrorCodes.USER_NOT_FOUND),

  // 无效凭据
  invalidCredentialsError: () =>
    createAppError('Invalid credentials', 401, ErrorCodes.INVALID_CREDENTIALS),

  // 邮箱已存在
  emailExistsError: () =>
    createAppError('Email already exists', 409, ErrorCodes.EMAIL_ALREADY_EXISTS),

  // 会议室不可用
  roomNotAvailableError: (details?: any) =>
    createAppError('Room not available', 409, ErrorCodes.ROOM_NOT_AVAILABLE, details),

  // 预约冲突
  reservationConflictError: (details?: any) =>
    createAppError('Reservation conflict', 409, ErrorCodes.RESERVATION_CONFLICT, details),

  // 数据库错误
  databaseError: (message: string = 'Database operation failed') =>
    createAppError(message, 500, ErrorCodes.DATABASE_ERROR),

  // 缓存错误
  cacheError: (message: string = 'Cache operation failed') =>
    createAppError(message, 500, ErrorCodes.CACHE_ERROR),

  // 外部服务错误
  externalServiceError: (message: string = 'External service error') =>
    createAppError(message, 502, ErrorCodes.EXTERNAL_SERVICE_ERROR)
}

/**
 * 异步错误包装器
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<any> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      // 如果是我们的应用错误，直接抛出
      if (error instanceof Error && (error as ExtendedError).statusCode) {
        throw error
      }

      // 包装为应用错误
      throw createAppError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        ErrorCodes.INTERNAL_ERROR,
        process.env.NODE_ENV === 'development' ? error : undefined
      )
    }
  }
}

/**
 * 错误日志记录
 */
function logError(error: ExtendedError, context: ErrorContext): void {
  const logData = {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details
    },
    context,
    timestamp: new Date().toISOString()
  }

  // 根据环境选择日志级别
  if (error.statusCode && error.statusCode < 500) {
    console.warn('Client error:', JSON.stringify(logData, null, 2))
  } else {
    console.error('Server error:', JSON.stringify(logData, null, 2))
  }

  // 这里可以添加外部日志服务（如Sentry、LogRocket等）
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context })
  // }
}

/**
 * 获取客户端IP
 */
function getClientIP(event: any): string {
  const headers = event.node.req.headers

  const forwardedFor = headers['x-forwarded-for']
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim()
  }

  const realIP = headers['x-real-ip']
  if (realIP) {
    return realIP as string
  }

  return event.node.req.socket?.remoteAddress || 'unknown'
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

/**
 * 全局错误处理（Nuxt插件）
 */
export function setupGlobalErrorHandler(app: any): void {
  // 处理未捕获的Promise拒绝
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    // 在生产环境中，你可能想要优雅地关闭应用
    if (process.env.NODE_ENV === 'production') {
      // 关闭数据库连接等清理工作
      process.exit(1)
    }
  })

  // 处理未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error)
    // 在生产环境中，优雅地关闭应用
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  })
}