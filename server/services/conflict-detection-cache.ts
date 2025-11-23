/**
 * 冲突检测缓存服务
 * 提供Redis缓存优化，减少重复数据库查询和计算开销
 */

import Redis from 'ioredis'

interface CacheConfig {
  enabled: boolean
  ttl: number // 缓存生存时间(秒)
  keyPrefix: string
}

interface ConflictCheckCache {
  hasConflict: boolean
  conflicts: any[]
  suggestions: any[]
  cachedAt: number
}

interface RoomAvailabilityCache {
  roomId: string
  date: string
  availableSlots: any[]
  cachedAt: number
}

interface SuggestionCache {
  roomId: string
  date: string
  userPreferences: any
  suggestions: any[]
  cachedAt: number
}

export class ConflictDetectionCacheService {
  private redis: Redis | null = null
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      ttl: 120, // 2分钟默认TTL
      keyPrefix: 'conflict_detection:',
      ...config
    }

    this.initializeRedis()
  }

  /**
   * 初始化Redis连接
   */
  private initializeRedis(): void {
    if (!this.config.enabled || !process.env.REDIS_URL) {
      console.warn('Redis缓存未启用或未配置REDIS_URL')
      return
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      })

      this.redis.on('connect', () => {
        console.log('Redis缓存连接已建立')
      })

      this.redis.on('error', (error) => {
        console.error('Redis缓存连接错误:', error)
      })

      this.redis.on('close', () => {
        console.log('Redis缓存连接已关闭')
      })
    } catch (error) {
      console.error('Redis初始化失败:', error)
      this.redis = null
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(...parts: string[]): string {
    return `${this.config.keyPrefix}${parts.join(':')}`
  }

  /**
   * 缓存冲突检测结果
   */
  async cacheConflictResult(
    roomId: string,
    startTime: Date,
    endTime: Date,
    result: ConflictCheckCache
  ): Promise<void> {
    if (!this.redis) return

    try {
      const key = this.generateKey(
        'conflict',
        roomId,
        startTime.toISOString(),
        endTime.toISOString()
      )

      const cacheData = {
        ...result,
        cachedAt: Date.now()
      }

      await this.redis.setex(
        key,
        this.config.ttl,
        JSON.stringify(cacheData)
      )

      console.log(`缓存冲突检测结果: ${key}`)
    } catch (error) {
      console.error('缓存冲突检测结果失败:', error)
    }
  }

  /**
   * 获取缓存的冲突检测结果
   */
  async getCachedConflictResult(
    roomId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ConflictCheckCache | null> {
    if (!this.redis) return null

    try {
      const key = this.generateKey(
        'conflict',
        roomId,
        startTime.toISOString(),
        endTime.toISOString()
      )

      const cached = await this.redis.get(key)
      if (!cached) return null

      const result: ConflictCheckCache = JSON.parse(cached)

      // 检查缓存是否过期
      const age = Date.now() - result.cachedAt
      if (age > this.config.ttl * 1000) {
        await this.redis.del(key)
        return null
      }

      console.log(`命中冲突检测缓存: ${key}`)
      return result
    } catch (error) {
      console.error('获取缓存冲突检测结果失败:', error)
      return null
    }
  }

  /**
   * 缓存会议室可用性
   */
  async cacheRoomAvailability(
    roomId: string,
    date: string,
    availableSlots: any[]
  ): Promise<void> {
    if (!this.redis) return

    try {
      const key = this.generateKey('availability', roomId, date)

      const cacheData: RoomAvailabilityCache = {
        roomId,
        date,
        availableSlots,
        cachedAt: Date.now()
      }

      await this.redis.setex(
        key,
        this.config.ttl * 6, // 可用性缓存更长，12分钟
        JSON.stringify(cacheData)
      )

      console.log(`缓存会议室可用性: ${key}`)
    } catch (error) {
      console.error('缓存会议室可用性失败:', error)
    }
  }

  /**
   * 获取缓存的会议室可用性
   */
  async getCachedRoomAvailability(
    roomId: string,
    date: string
  ): Promise<RoomAvailabilityCache | null> {
    if (!this.redis) return null

    try {
      const key = this.generateKey('availability', roomId, date)
      const cached = await this.redis.get(key)

      if (!cached) return null

      const result: RoomAvailabilityCache = JSON.parse(cached)

      // 检查缓存是否过期
      const age = Date.now() - result.cachedAt
      if (age > this.config.ttl * 6 * 1000) {
        await this.redis.del(key)
        return null
      }

      console.log(`命中会议室可用性缓存: ${key}`)
      return result
    } catch (error) {
      console.error('获取缓存会议室可用性失败:', error)
      return null
    }
  }

  /**
   * 缓存智能推荐结果
   */
  async cacheSuggestions(
    roomId: string,
    date: string,
    userPreferences: any,
    suggestions: any[]
  ): Promise<void> {
    if (!this.redis) return

    try {
      const key = this.generateKey(
        'suggestions',
        roomId,
        date,
        JSON.stringify(userPreferences)
      )

      const cacheData: SuggestionCache = {
        roomId,
        date,
        userPreferences,
        suggestions,
        cachedAt: Date.now()
      }

      await this.redis.setex(
        key,
        this.config.ttl * 3, // 推荐缓存中等时长，6分钟
        JSON.stringify(cacheData)
      )

      console.log(`缓存推荐结果: ${key}`)
    } catch (error) {
      console.error('缓存推荐结果失败:', error)
    }
  }

  /**
   * 获取缓存的智能推荐结果
   */
  async getCachedSuggestions(
    roomId: string,
    date: string,
    userPreferences: any
  ): Promise<SuggestionCache | null> {
    if (!this.redis) return null

    try {
      const key = this.generateKey(
        'suggestions',
        roomId,
        date,
        JSON.stringify(userPreferences)
      )

      const cached = await this.redis.get(key)
      if (!cached) return null

      const result: SuggestionCache = JSON.parse(cached)

      // 检查缓存是否过期
      const age = Date.now() - result.cachedAt
      if (age > this.config.ttl * 3 * 1000) {
        await this.redis.del(key)
        return null
      }

      console.log(`命中推荐结果缓存: ${key}`)
      return result
    } catch (error) {
      console.error('获取缓存推荐结果失败:', error)
      return null
    }
  }

  /**
   * 清除特定会议室的缓存
   */
  async clearRoomCache(roomId: string): Promise<void> {
    if (!this.redis) return

    try {
      const pattern = this.generateKey('*', roomId, '*')
      const keys = await this.redis.keys(pattern)

      if (keys.length > 0) {
        await this.redis.del(...keys)
        console.log(`清除会议室缓存: ${roomId}, 删除了${keys.length}个键`)
      }
    } catch (error) {
      console.error('清除会议室缓存失败:', error)
    }
  }

  /**
   * 清除特定日期的缓存
   */
  async clearDateCache(date: string): Promise<void> {
    if (!this.redis) return

    try {
      const pattern = this.generateKey('*', '*', date)
      const keys = await this.redis.keys(pattern)

      if (keys.length > 0) {
        await this.redis.del(...keys)
        console.log(`清除日期缓存: ${date}, 删除了${keys.length}个键`)
      }
    } catch (error) {
      console.error('清除日期缓存失败:', error)
    }
  }

  /**
   * 清除所有冲突检测缓存
   */
  async clearAllCache(): Promise<void> {
    if (!this.redis) return

    try {
      const pattern = this.generateKey('*')
      const keys = await this.redis.keys(pattern)

      if (keys.length > 0) {
        await this.redis.del(...keys)
        console.log(`清除所有冲突检测缓存, 删除了${keys.length}个键`)
      }
    } catch (error) {
      console.error('清除所有缓存失败:', error)
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalKeys: number
    conflictKeys: number
    availabilityKeys: number
    suggestionKeys: number
  }> {
    if (!this.redis) {
      return {
        totalKeys: 0,
        conflictKeys: 0,
        availabilityKeys: 0,
        suggestionKeys: 0
      }
    }

    try {
      const pattern = this.generateKey('*')
      const keys = await this.redis.keys(pattern)

      const stats = {
        totalKeys: keys.length,
        conflictKeys: 0,
        availabilityKeys: 0,
        suggestionKeys: 0
      }

      keys.forEach(key => {
        if (key.includes(':conflict:')) stats.conflictKeys++
        else if (key.includes(':availability:')) stats.availabilityKeys++
        else if (key.includes(':suggestions:')) stats.suggestionKeys++
      })

      return stats
    } catch (error) {
      console.error('获取缓存统计失败:', error)
      return {
        totalKeys: 0,
        conflictKeys: 0,
        availabilityKeys: 0,
        suggestionKeys: 0
      }
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(roomIds: string[], dates: string[]): Promise<void> {
    console.log('开始预热冲突检测缓存...')

    // 这里可以预加载一些常用数据
    // 例如：热门会议室的可用性、常见时间段的冲突检查等

    console.log('缓存预热完成')
  }

  /**
   * 关闭Redis连接
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (!this.redis) return false

    try {
      await this.redis.ping()
      return true
    } catch (error) {
      console.error('Redis健康检查失败:', error)
      return false
    }
  }
}

// 创建默认实例
export const conflictDetectionCache = new ConflictDetectionCacheService({
  enabled: process.env.NODE_ENV !== 'test',
  ttl: 120, // 2分钟
  keyPrefix: 'conflict_detection:'
})

export default conflictDetectionCache