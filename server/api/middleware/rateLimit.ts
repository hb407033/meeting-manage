import { CacheService } from '~~/server/services/redis'
import { rateLimitResponse } from '~~/server/utils/response'

export interface RateLimitOptions {
  windowMs: number // 时间窗口（毫秒）
  max: number // 最大请求数
  message?: string // 自定义错误消息
  keyGenerator?: (event: any) => string // 自定义键生成器
  skipSuccessfulRequests?: boolean // 是否跳过成功的请求
  skipFailedRequests?: boolean // 是否跳过失败的请求
  trustProxy?: boolean // 是否信任代理
}

/**
 * 默认限流配置
 */
const defaultOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 100个请求
  message: 'Too many requests, please try again later',
  trustProxy: false
}

/**
 * 限流中间件
 */
export async function rateLimitMiddleware(
  event: any,
  options: Partial<RateLimitOptions> = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options }
  const cache = new CacheService()

  // 生成限流键
  const key = opts.keyGenerator ? opts.keyGenerator(event) : generateDefaultKey(event)

  try {
    await cache.connect()

    // 检查是否超过限制
    const isLimited = await cache.isRateLimited(key, opts.max, opts.windowMs / 1000)

    if (isLimited) {
      throw rateLimitResponse(opts.message || 'Too many requests')
    }

    // 记录请求（如果需要）
    if (!opts.skipSuccessfulRequests) {
      await cache.increment(`counter:${key}`, 1, opts.windowMs / 1000)
    }

  } finally {
    await cache.disconnect()
  }
}

/**
 * 生成默认限流键
 */
function generateDefaultKey(event: any): string {
  // 优先使用用户ID
  const user = event.context.user
  if (user?.id) {
    return `rate_limit:user:${user.id}`
  }

  // 使用IP地址
  const ip = getClientIP(event)
  return `rate_limit:ip:${ip}`
}

/**
 * 获取客户端IP地址
 */
function getClientIP(event: any): string {
  const headers = event.node.req.headers

  // 检查代理头
  const forwardedFor = headers['x-forwarded-for']
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim()
  }

  const realIP = headers['x-real-ip']
  if (realIP) {
    return realIP as string
  }

  const clientIP = headers['cf-connecting-ip'] // Cloudflare
  if (clientIP) {
    return clientIP as string
  }

  return event.node.req.socket?.remoteAddress || 'unknown'
}

/**
 * 创建特定端点的限流中间件
 */
export function createRateLimit(
  options: Partial<RateLimitOptions>
): (event: any) => Promise<void> {
  return (event: any) => rateLimitMiddleware(event, options)
}

/**
 * 预定义的限流中间件
 */

// API通用限流：每15分钟100个请求
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'API rate limit exceeded, please try again later'
})

// 登录限流：每15分钟5次尝试
export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
})

// 注册限流：每小时3次尝试
export const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts, please try again later'
})

// 密码重置限流：每小时3次请求
export const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests, please try again later'
})

// 预约创建限流：每小时10个预约
export const reservationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many reservation attempts, please try again later'
})

// 文件上传限流：每10分钟5个文件
export const uploadRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many upload attempts, please try again later'
})

// 搜索限流：每分钟30次搜索
export const searchRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many search requests, please slow down'
})

// 管理员API限流：每5分钟200个请求
export const adminRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  message: 'Admin API rate limit exceeded'
})

/**
 * 基于用户角色的动态限流
 */
export async function dynamicRateLimit(
  event: any,
  userRole: string
): Promise<void> {
  const limits: Record<string, RateLimitOptions> = {
    ADMIN: {
      windowMs: 5 * 60 * 1000,
      max: 200
    },
    USER: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  }

  const options = limits[userRole] || limits.USER
  await rateLimitMiddleware(event, options)
}

/**
 * 限流状态查询
 */
export async function getRateLimitStatus(event: any): Promise<{
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}> {
  const cache = new CacheService()
  const key = generateDefaultKey(event)

  try {
    await cache.connect()

    // 获取当前计数和TTL
    const current = await cache.get(`counter:${key}`)
    const ttl = await cache.getTTL(`rate_limit:${key}`)

    const limit = 100 // 默认限制
    const remaining = Math.max(0, limit - (parseInt(current) || 0))
    const resetTime = ttl > 0 ? Date.now() + (ttl * 1000) : 0

    return {
      limit,
      remaining,
      resetTime,
      retryAfter: ttl > 0 ? ttl : undefined
    }

  } finally {
    await cache.disconnect()
  }
}