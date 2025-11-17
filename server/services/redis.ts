import Redis from 'ioredis'

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
  password: process.env.REDIS_PASSWORD || '407033',
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // 连接池配置
  family: 4,
  // 重连配置
  retryDelayOnClusterDown: 300,
  // 缓存配置
  enableOfflineQueue: false,
  // 自动重连
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
}

// Redis客户端实例
let redisClient: Redis | null = null

/**
 * 获取Redis客户端实例
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig)

    // 连接事件监听
    redisClient.on('connect', () => {
      console.log('✅ Redis连接成功')
    })

    redisClient.on('ready', () => {
      console.log('✅ Redis客户端就绪')
    })

    redisClient.on('error', (err) => {
      console.error('❌ Redis连接错误:', err)
    })

    redisClient.on('close', () => {
      console.log('🔌 Redis连接关闭')
    })

    redisClient.on('reconnecting', (ms) => {
      console.log(`🔄 Redis重连中... (延迟: ${ms}ms)`)
    })
  }

  return redisClient
}

/**
 * 缓存服务类
 */
export class CacheService {
  private client: Redis

  constructor() {
    this.client = getRedisClient()
  }

  /**
   * 连接到Redis
   */
  async connect(): Promise<void> {
    try {
      if (this.client.status === 'ready') {
        return // 已经连接
      }

      if (this.client.status === 'end' || this.client.status === 'close') {
        await this.client.connect()
      }
    } catch (error) {
      throw new Error(`Redis connection failed: ${error}`)
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    const serializedValue = JSON.stringify(value)

    if (options?.ttl) {
      await this.client.setex(key, options.ttl, serializedValue)
    } else {
      await this.client.set(key, serializedValue)
    }
  }

  /**
   * 设置JSON缓存（别名方法）
   */
  async setJSON(key: string, value: any, ttl: number): Promise<void> {
    await this.set(key, value, { ttl })
  }

  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key)

    if (value === null) {
      return null
    }

    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.warn(`缓存数据解析失败 [${key}]:`, error)
      return value as T
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<number> {
    return await this.client.del(key)
  }

  /**
   * 批量删除缓存
   */
  async delPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern)
    if (keys.length === 0) {
      return 0
    }

    return await this.client.del(...keys)
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  /**
   * 设置缓存过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.expire(key, ttl)
    return result === 1
  }

  /**
   * 获取缓存剩余时间
   */
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key)
  }

  /**
   * 递增计数器
   */
  async incr(key: string): Promise<number> {
    return await this.client.incr(key)
  }

  /**
   * 带过期时间的递增
   */
  async incrWithExpire(key: string, ttl: number): Promise<number> {
    const value = await this.client.incr(key)
    await this.client.expire(key, ttl)
    return value
  }

  /**
   * 递增并设置过期时间
   */
  async increment(key: string, value: number = 1, ttl?: number): Promise<number> {
    const result = await this.client.incrby(key, value)
    if (ttl && result === value) { // 第一次设置时添加过期时间
      await this.client.expire(key, ttl)
    }
    return result
  }

  /**
   * 检查是否被限流
   */
  async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const current = await this.client.incr(key)
    if (current === 1) {
      await this.client.expire(key, windowSeconds)
    }
    return current > limit
  }

  /**
   * 获取键的TTL
   */
  async getTTL(key: string): Promise<number> {
    return await this.client.ttl(key)
  }

  /**
   * 限流功能
   */
  async rateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`
    const window = Math.floor(Date.now() / windowMs)
    const windowKey = `${key}:${window}`

    const current = await this.client.incr(windowKey)

    // 设置过期时间
    if (current === 1) {
      await this.client.expire(windowKey, Math.ceil(windowMs / 1000))
    }

    const remaining = Math.max(0, limit - current)
    const allowed = current <= limit
    const resetTime = Date.now() + windowMs

    return {
      allowed,
      remaining,
      resetTime
    }
  }

  /**
   * 获取分布式锁
   */
  async acquireLock(
    key: string,
    ttl: number = 30000
  ): Promise<string | null> {
    const lockKey = `lock:${key}`
    const lockValue = `${Date.now()}-${Math.random()}`

    const result = await this.client.set(
      lockKey,
      lockValue,
      'PX',
      ttl,
      'NX'
    )

    return result === 'OK' ? lockValue : null
  }

  /**
   * 释放分布式锁
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${key}`

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `

    const result = await this.client.eval(script, 1, lockKey, lockValue)
    return result === 1
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    try {
      const startTime = Date.now()
      await this.client.ping()
      const latency = Date.now() - startTime

      return { status: 'healthy', latency }
    } catch (error) {
      console.error('Redis健康检查失败:', error)
      return { status: 'unhealthy' }
    }
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (redisClient) {
      await redisClient.quit()
      redisClient = null
    }
  }
}

// 导出单例实例
export const cacheService = new CacheService()

// 默认导出
export default cacheService