import { cacheService } from './redis'
import crypto from 'node:crypto'

interface AvailabilityCacheKey {
  roomIds: string[]
  startTime: string
  endTime: string
}

interface AvailabilityCacheData {
  data: any
  timestamp: number
  ttl: number
}

export class AvailabilityCacheService {
  private readonly CACHE_PREFIX = 'availability:'
  private readonly DEFAULT_TTL = 300 // 5分钟

  /**
   * 生成缓存键
   */
  private generateCacheKey(params: AvailabilityCacheKey): string {
    // 对参数进行排序以确保一致性
    const sortedRoomIds = [...params.roomIds].sort()
    const keyString = `${sortedRoomIds.join(',')}:${params.startTime}:${params.endTime}`

    // 使用MD5哈希来创建简短且唯一的键
    const hash = crypto.createHash('md5').update(keyString).digest('hex')

    return `${this.CACHE_PREFIX}${hash}`
  }

  /**
   * 缓存可用性数据
   */
  async setAvailability(
    params: AvailabilityCacheKey,
    data: any,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const key = this.generateCacheKey(params)
      const cacheData: AvailabilityCacheData = {
        data,
        timestamp: Date.now(),
        ttl
      }

      await cacheService.setJSON(key, cacheData, ttl)

      console.log(`✅ Availability data cached with key: ${key}, TTL: ${ttl}s`)
    } catch (error) {
      console.warn('❌ Failed to cache availability data:', error)
      // 缓存失败不应该影响主要功能，只记录警告
    }
  }

  /**
   * 获取缓存的可用性数据
   */
  async getAvailability(params: AvailabilityCacheKey): Promise<any | null> {
    try {
      const key = this.generateCacheKey(params)
      const cachedData = await cacheService.get<AvailabilityCacheData>(key)

      if (!cachedData) {
        console.log(`🔍 Cache miss for key: ${key}`)
        return null
      }

      // 检查缓存是否仍然有效
      const elapsed = Date.now() - cachedData.timestamp
      if (elapsed > cachedData.ttl * 1000) {
        console.log(`⏰ Cache expired for key: ${key}`)
        await this.invalidateAvailability(params)
        return null
      }

      console.log(`🎯 Cache hit for key: ${key}, age: ${Math.round(elapsed / 1000)}s`)
      return cachedData.data

    } catch (error) {
      console.warn('❌ Failed to get cached availability data:', error)
      return null
    }
  }

  /**
   * 使特定参数的缓存失效
   */
  async invalidateAvailability(params: AvailabilityCacheKey): Promise<void> {
    try {
      const key = this.generateCacheKey(params)
      await cacheService.del(key)
      console.log(`🗑️ Cache invalidated for key: ${key}`)
    } catch (error) {
      console.warn('❌ Failed to invalidate cache:', error)
    }
  }

  /**
   * 使会议室相关的所有缓存失效
   * 当会议室预约发生变化时调用
   */
  async invalidateRoomAvailability(roomId: string): Promise<void> {
    try {
      // 查找所有包含此会议室的缓存键
      const pattern = `${this.CACHE_PREFIX}*`

      // 由于我们使用了哈希键，无法直接通过roomId匹配
      // 在生产环境中，可以使用Redis的SCAN命令或维护一个反向索引
      // 这里我们采用简单的策略：清除所有可用性缓存
      const deletedCount = await cacheService.delPattern(pattern)

      console.log(`🗑️ Invalidated ${deletedCount} availability cache entries due to room ${roomId} changes`)
    } catch (error) {
      console.warn(`❌ Failed to invalidate room ${roomId} cache:`, error)
    }
  }

  /**
   * 清除过期的缓存条目
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`
      const keys = await cacheService.getClient().keys(pattern)
      let deletedCount = 0

      for (const key of keys) {
        try {
          const cachedData = await cacheService.get<AvailabilityCacheData>(key)
          if (cachedData) {
            const elapsed = Date.now() - cachedData.timestamp
            if (elapsed > cachedData.ttl * 1000) {
              await cacheService.del(key)
              deletedCount++
            }
          }
        } catch (error) {
          // 如果某个键有问题，直接删除
          await cacheService.del(key)
          deletedCount++
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`)
      return deletedCount

    } catch (error) {
      console.warn('❌ Failed to clear expired cache:', error)
      return 0
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalKeys: number
    hitRate?: number
    memoryUsage?: string
  }> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`
      const keys = await cacheService.getClient().keys(pattern)

      let validKeys = 0
      for (const key of keys) {
        const cachedData = await cacheService.get<AvailabilityCacheData>(key)
        if (cachedData) {
          const elapsed = Date.now() - cachedData.timestamp
          if (elapsed <= cachedData.ttl * 1000) {
            validKeys++
          }
        }
      }

      // 获取Redis内存使用情况
      const memoryInfo = await cacheService.getClient().info('memory')
      const memoryUsageMatch = memoryInfo.match(/used_memory_human:(.+)/)
      const memoryUsage = memoryUsageMatch ? memoryUsageMatch[1].trim() : 'unknown'

      return {
        totalKeys: keys.length,
        hitRate: keys.length > 0 ? (validKeys / keys.length) * 100 : 0,
        memoryUsage
      }

    } catch (error) {
      console.warn('❌ Failed to get cache stats:', error)
      return { totalKeys: 0 }
    }
  }

  /**
   * 批量预热缓存
   */
  async warmupCache(queries: AvailabilityCacheKey[]): Promise<void> {
    console.log(`🔥 Warming up cache for ${queries.length} queries...`)

    for (const query of queries) {
      try {
        // 检查是否已有缓存
        const cached = await this.getAvailability(query)
        if (cached) {
          continue
        }

        // 这里应该调用实际的可用性查询逻辑
        // 为了避免循环依赖，我们将在API层中处理
        console.log(`📋 Cache warmup needed for: ${JSON.stringify(query)}`)
      } catch (error) {
        console.warn(`❌ Failed to warmup cache for query:`, error)
      }
    }
  }

  /**
   * 设置分布式锁用于防止缓存击穿
   */
  async getCacheLock(
    params: AvailabilityCacheKey,
    ttl: number = 30000
  ): Promise<string | null> {
    const key = this.generateCacheKey(params)
    return await cacheService.acquireLock(`lock:${key}`, ttl)
  }

  /**
   * 释放分布式锁
   */
  async releaseCacheLock(
    params: AvailabilityCacheKey,
    lockValue: string
  ): Promise<boolean> {
    const key = this.generateCacheKey(params)
    return await cacheService.releaseLock(`lock:${key}`, lockValue)
  }

  /**
   * 预热常用查询
   */
  async warmupCommonQueries(): Promise<void> {
    const now = new Date()
    const commonQueries: AvailabilityCacheKey[] = []

    // 生成今天的常用时间范围查询
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // 常用的时间范围
    const commonRanges = [
      { start: todayStart, end: new Date(todayStart.getTime() + 4 * 60 * 60 * 1000) }, // 上午
      { start: new Date(todayStart.getTime() + 8 * 60 * 60 * 1000), end: todayEnd }, // 下午
      { start: todayStart, end: todayEnd }, // 全天
    ]

    // 这里应该获取所有会议室ID，为了简化我们使用一些示例ID
    const roomIds = ['1', '2', '3'] // 实际中应该从数据库获取

    commonRanges.forEach(range => {
      commonQueries.push({
        roomIds,
        startTime: range.start.toISOString(),
        endTime: range.end.toISOString()
      })
    })

    await this.warmupCache(commonQueries)
  }
}

// 导出单例实例
export const availabilityCacheService = new AvailabilityCacheService()

// 默认导出
export default availabilityCacheService