/**
 * 统一API响应格式工具
 */

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T | T[]
  code: string
  message: string
  meta?: {
    timestamp: string
    traceId?: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages?: number
    }
  }
  status?: number
}


export interface ApiResponseOptions {
  message?: string
  data?: any
  error?: string | any
  status?: number
  success?: boolean
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    timestamp?: string
    requestId?: string
    version?: string
  }
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页数据接口
 */
export interface PaginatedData<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}


/**
 * 常用错误代码
 */
export const ErrorCodes = {
  // 通用错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT: 'RATE_LIMIT',

  // 业务错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  ROOM_NOT_AVAILABLE: 'ROOM_NOT_AVAILABLE',
  RESERVATION_CONFLICT: 'RESERVATION_CONFLICT',

  // 系统错误
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const

/**
 * 业务状态码定义
 */
export const API_CODES = {
  // 成功
  SUCCESS: '20000',

  // 业务错误 (40000-49999)
  BAD_REQUEST: '40000',
  UNAUTHORIZED: '40001',
  FORBIDDEN: '40002',
  NOT_FOUND: '40003',
  VALIDATION_ERROR: '40004',
  DUPLICATE_RESOURCE: '40005',
  RATE_LIMITED: '40006',

  // 业务逻辑错误 (41000-41999)
  INVALID_CREDENTIALS: '41001',
  ACCOUNT_DISABLED: '41002',
  ROOM_NOT_AVAILABLE: '41100',
  RESERVATION_CONFLICT: '41101',
  PAST_RESERVATION: '41102',
  INVALID_TIME_RANGE: '41103',
  ROOM_CAPACITY_EXCEEDED: '41104',
  EQUIPMENT_CONFLICT: '41105',
  UPLOAD_FAILED: '41106',
  INVALID_FILE_TYPE: '41107',
  FILE_TOO_LARGE: '41108',

  // 系统错误 (50000-59999)
  INTERNAL_ERROR: '50000',
  DATABASE_ERROR: '50001',
  REDIS_ERROR: '50002',
  EXTERNAL_SERVICE_ERROR: '50003',
  HEALTH_CHECK_FAILED: '50004',
} as const

/**
 * 默认错误消息
 */
export const ERROR_MESSAGES = {
  [API_CODES.SUCCESS]: '操作成功',

  [API_CODES.BAD_REQUEST]: '请求参数错误',
  [API_CODES.UNAUTHORIZED]: '未授权访问',
  [API_CODES.FORBIDDEN]: '权限不足',
  [API_CODES.NOT_FOUND]: '资源不存在',
  [API_CODES.VALIDATION_ERROR]: '数据验证失败',
  [API_CODES.DUPLICATE_RESOURCE]: '资源已存在',
  [API_CODES.RATE_LIMITED]: '请求过于频繁，请稍后再试',

  [API_CODES.INVALID_CREDENTIALS]: '用户名或密码错误',
  [API_CODES.ACCOUNT_DISABLED]: '账户已被禁用',
  [API_CODES.ROOM_NOT_AVAILABLE]: '会议室不可用',
  [API_CODES.RESERVATION_CONFLICT]: '预约时间冲突',
  [API_CODES.PAST_RESERVATION]: '不能预约过去的时间',
  [API_CODES.INVALID_TIME_RANGE]: '时间范围无效',
  [API_CODES.ROOM_CAPACITY_EXCEEDED]: '参会人数超过会议室容量',
  [API_CODES.EQUIPMENT_CONFLICT]: '设备冲突',
  [API_CODES.UPLOAD_FAILED]: '文件上传失败',
  [API_CODES.INVALID_FILE_TYPE]: '无效的文件类型',
  [API_CODES.FILE_TOO_LARGE]: '文件大小超出限制',

  [API_CODES.INTERNAL_ERROR]: '系统内部错误',
  [API_CODES.DATABASE_ERROR]: '数据库操作失败',
  [API_CODES.REDIS_ERROR]: '缓存服务异常',
  [API_CODES.EXTERNAL_SERVICE_ERROR]: '外部服务异常',
  [API_CODES.HEALTH_CHECK_FAILED]: '系统健康检查失败',
} as const


/**
 * 成功响应
 */
export function successResponse(
  data: any = null,
  message: string = 'Success',
  options: Partial<ApiResponseOptions> = {}
) {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options.meta?.requestId || generateRequestId(),
      version: '1.0.0',
      ...options.meta
    },
    ...options
  }
}

/**
 * 错误响应
 */
export function errorResponse(
  message: string = 'Internal Server Error',
  status: number = 500,
  error: any = null,
  options: Partial<ApiResponseOptions> = {}
) {
  return {
    success: false,
    message,
    error: error || message,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options.meta?.requestId || generateRequestId(),
      version: '1.0.0',
      ...options.meta
    },
    status,
    ...options
  }
}

/**
 * 分页响应
 */
export function paginatedResponse(
  data: any[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Data retrieved successfully'
) {
  return successResponse(data, message, {
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  })
}

/**
 * 验证错误响应
 */
export function validationErrorResponse(errors: any) {
  return errorResponse(
    'Validation failed',
    422,
    errors
  )
}

/**
 * 未授权响应
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return errorResponse(message, 401)
}

/**
 * 禁止访问响应
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return errorResponse(message, 403)
}

/**
 * 资源未找到响应
 */
export function notFoundResponse(message: string = 'Resource not found') {
  return errorResponse(message, 404)
}

/**
 * 方法不允许响应
 */
export function methodNotAllowedResponse(message: string = 'Method not allowed') {
  return errorResponse(message, 405)
}

/**
 * 冲突响应
 */
export function conflictResponse(message: string = 'Resource conflict') {
  return errorResponse(message, 409)
}

/**
 * 限流响应
 */
export function rateLimitResponse(message: string = 'Rate limit exceeded') {
  return errorResponse(message, 429)
}

/**
 * 服务器错误响应
 */
export function serverErrorResponse(message: string = 'Internal server error', error?: any) {
  return errorResponse(message, 500, error)
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

/**
 * 创建标准化的错误对象
 */
export function createApiError(
  code: string,
  message: string,
  details?: any
) {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  }
}


/**
 * 创建成功响应
 */
export function createSuccessResponse<T = any>(
  data: T,
  message: string = ERROR_MESSAGES[API_CODES.SUCCESS],
  options?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages?: number
    }
    traceId?: string
  }
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    code: API_CODES.SUCCESS,
    message,
    meta: {
      timestamp: new Date().toISOString()
    }
  }

  if (options?.pagination) {
    response.meta!.pagination = options.pagination
  }

  if (options?.traceId) {
    response.meta!.traceId = options.traceId
  }

  return response
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  message: string = '数据获取成功'
): ApiResponse<PaginatedData<T>> {
  const totalPages = Math.ceil(total / limit)

  return createSuccessResponse<PaginatedData<T>>(
    {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    },
    message
  )
}

// 定义API代码字面量类型
type ApiCode = typeof API_CODES[keyof typeof API_CODES]

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: ApiCode,
  message?: string,
  data?: any,
  options?: {
    traceId?: string
    statusCode?: number
  }
): ApiResponse<null> {
  const response: ApiResponse<null> = {
    success: false,
    data: data || null,
    code,
    message: message || ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || message || 'Error',
    meta: {
      timestamp: new Date().toISOString()
    }
  }

  if (options?.traceId) {
    response.meta!.traceId = options.traceId
  }

  return response
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string }>
): ApiResponse<null> {
  return createErrorResponse(
    API_CODES.VALIDATION_ERROR,
    ERROR_MESSAGES[API_CODES.VALIDATION_ERROR],
    errors
  )
}

/**
 * 处理API错误
 */
export function handleApiError(
  error: any,
  defaultMessage: string = ERROR_MESSAGES[API_CODES.INTERNAL_ERROR]
): ApiResponse<null> {
  console.error('API Error:', error)

  // Prisma错误处理
  if (error?.code === 'P2002') {
    return createErrorResponse(
      API_CODES.DUPLICATE_RESOURCE,
      '数据已存在',
      error?.meta?.target
    )
  }

  if (error?.code?.startsWith('P2')) {
    return createErrorResponse(API_CODES.DATABASE_ERROR, '数据库约束错误')
  }

  // 验证错误
  if (error?.name === 'ValidationError') {
    return createValidationErrorResponse(error.errors)
  }

  // JWT错误
  if (error?.name === 'JsonWebTokenError') {
    return createErrorResponse(API_CODES.UNAUTHORIZED, '无效的访问令牌')
  }

  if (error?.name === 'TokenExpiredError') {
    return createErrorResponse(API_CODES.UNAUTHORIZED, '访问令牌已过期')
  }

  // 自定义错误
  if (error?.code && error.code in API_CODES) {
    return createErrorResponse(
      API_CODES[error.code as keyof typeof API_CODES],
      error.message || ERROR_MESSAGES[API_CODES[error.code as keyof typeof API_CODES] as keyof typeof ERROR_MESSAGES]
    )
  }

  // 默认错误
  return createErrorResponse(
    API_CODES.INTERNAL_ERROR,
    error?.message || defaultMessage
  )
}

/**
 * 获取客户端IP地址
 */
export function getClientIP(event: any): string {
  return event.node.req.headers['x-forwarded-for'] as string ||
    event.node.req.headers['x-real-ip'] as string ||
    event.node.req.connection?.remoteAddress ||
    event.node.req.socket?.remoteAddress ||
    '127.0.0.1'
}

/**
 * 生成追踪ID
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * API中间件：添加追踪ID和CORS头
 */
export function setApiHeaders(event: any, traceId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'X-Response-Time': Date.now().toString(),
  }

  if (traceId) {
    headers['X-Trace-Id'] = traceId
  }

  Object.entries(headers).forEach(([key, value]) => {
    setHeader(event, key, value)
  })
}

/**
 * 限流中间件辅助函数
 */
export async function rateLimitMiddleware(
  event: any,
  limit: number = 100,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  const clientIP = getClientIP(event)
  const { cacheService } = await import('~~/server/services/redis')

  const result = await cacheService.rateLimit(clientIP, limit, windowMs)

  if (!result.allowed) {
    setHeader(event, 'X-RateLimit-Limit', limit.toString())
    setHeader(event, 'X-RateLimit-Remaining', result.remaining.toString())
    setHeader(event, 'X-RateLimit-Reset', result.resetTime.toString())
  }

  return result
}
