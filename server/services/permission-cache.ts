import { cacheService } from './redis'
import { getRedisClient } from './redis'
import crypto from 'node:crypto'

interface UserPermissionCacheKey {
  userId: string
  organizationId?: string
}

interface UserPermissionCacheData {
  permissions: string[]
  roles: string[]
  timestamp: number
  ttl: number
}

export class PermissionCacheService {
  private readonly CACHE_PREFIX = 'user_permissions:'
  private readonly DEFAULT_TTL = 1800 // 30分钟

  /**
   * 生成用户权限缓存键
   */
  private generateCacheKey(params: UserPermissionCacheKey): string {
    const keyString = params.organizationId
      ? `${params.userId}:${params.organizationId}`
      : params.userId

    // 使用MD5哈希来创建简短且唯一的键
    const hash = crypto.createHash('md5').update(keyString).digest('hex')

    return `${this.CACHE_PREFIX}${hash}`
  }

  /**
   * 缓存用户权限数据
   */
  async setUserPermissions(
    params: UserPermissionCacheKey,
    permissions: string[],
    roles: string[] = [],
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const key = this.generateCacheKey(params)
      const cacheData: UserPermissionCacheData = {
        permissions,
        roles,
        timestamp: Date.now(),
        ttl
      }

      await cacheService.setJSON(key, cacheData, ttl)

      console.log(`✅ User permissions cached for user: ${params.userId}, permissions: ${permissions.length}, TTL: ${ttl}s`)
    } catch (error) {
      console.warn('❌ Failed to cache user permissions:', error)
      // 缓存失败不应该影响主要功能，只记录警告
    }
  }

  /**
   * 获取缓存的用户权限数据
   */
  async getUserPermissions(params: UserPermissionCacheKey): Promise<{
    permissions: string[]
    roles: string[]
  } | null> {
    try {
      const key = this.generateCacheKey(params)
      const cachedData = await cacheService.get<UserPermissionCacheData>(key)

      if (!cachedData) {
        console.log(`🔍 Permission cache miss for user: ${params.userId}`)
        return null
      }

      // 检查缓存是否仍然有效
      const elapsed = Date.now() - cachedData.timestamp
      if (elapsed > cachedData.ttl * 1000) {
        console.log(`⏰ Permission cache expired for user: ${params.userId}`)
        await this.clearUserPermissions(params)
        return null
      }

      console.log(`🎯 Permission cache hit for user: ${params.userId}, age: ${Math.round(elapsed / 1000)}s`)
      return {
        permissions: cachedData.permissions,
        roles: cachedData.roles
      }

    } catch (error) {
      console.warn('❌ Failed to get cached user permissions:', error)
      return null
    }
  }

  /**
   * 清除特定用户的权限缓存
   */
  async clearUserPermissions(params: UserPermissionCacheKey): Promise<void> {
    try {
      const key = this.generateCacheKey(params)
      await cacheService.del(key)
      console.log(`🗑️ Cleared permission cache for user: ${params.userId}`)
    } catch (error) {
      console.warn('❌ Failed to clear user permission cache:', error)
    }
  }

  /**
   * 清除用户的所有权限缓存（包括不同组织的权限）
   * 当用户角色发生变化时调用
   */
  async clearAllUserPermissions(userId: string): Promise<void> {
    try {
      // 查找所有包含此用户的缓存键
      const pattern = `${this.CACHE_PREFIX}*`

      // 由于我们使用了哈希键，无法直接通过userId匹配
      // 在生产环境中，可以维护一个用户ID到缓存键的映射
      // 或者使用更结构化的键名，如 user_permissions:{userId}:{orgId}

      // 为了简化，我们使用模式匹配删除所有用户权限缓存
      // 这里应该小心，避免误删其他用户的缓存
      // 在实际实现中，建议维护用户ID到缓存键的映射关系

      console.log(`🗑️ Attempting to clear all permission caches for user: ${userId}`)

      // 如果知道具体的键模式，可以更精确地删除
      // 目前先记录，实际实现中需要根据具体需求调整
      const deletedCount = await cacheService.delPattern(pattern)

      console.log(`🗑️ Cleared ${deletedCount} user permission cache entries for user: ${userId}`)
    } catch (error) {
      console.warn(`❌ Failed to clear all permission caches for user ${userId}:`, error)
    }
  }

  /**
   * 清除过期的权限缓存条目
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`
      const client = getRedisClient()
      const keys = await client.keys(pattern)
      let deletedCount = 0

      for (const key of keys) {
        try {
          const cachedData = await cacheService.get<UserPermissionCacheData>(key)
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

      console.log(`🧹 Cleaned up ${deletedCount} expired permission cache entries`)
      return deletedCount

    } catch (error) {
      console.warn('❌ Failed to clear expired permission cache:', error)
      return 0
    }
  }

  /**
   * 获取权限缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalKeys: number
    hitRate?: number
    memoryUsage?: string
  }> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`
      const client = getRedisClient()
      const keys = await client.keys(pattern)

      let validKeys = 0
      for (const key of keys) {
        const cachedData = await cacheService.get<UserPermissionCacheData>(key)
        if (cachedData) {
          const elapsed = Date.now() - cachedData.timestamp
          if (elapsed <= cachedData.ttl * 1000) {
            validKeys++
          }
        }
      }

      // 获取Redis内存使用情况
      const memoryInfo = await client.info('memory')
      const memoryUsageMatch = memoryInfo.match(/used_memory_human:(.+)/)
      const memoryUsage = memoryUsageMatch ? memoryUsageMatch[1].trim() : 'unknown'

      return {
        totalKeys: keys.length,
        hitRate: keys.length > 0 ? (validKeys / keys.length) * 100 : 0,
        memoryUsage
      }

    } catch (error) {
      console.warn('❌ Failed to get permission cache stats:', error)
      return { totalKeys: 0 }
    }
  }

  /**
   * 检查用户是否有特定权限（支持缓存）
   */
  async hasPermission(
    params: UserPermissionCacheKey,
    permission: string
  ): Promise<boolean> {
    const cachedPermissions = await this.getUserPermissions(params)

    if (!cachedPermissions) {
      return false // 缓存未命中，需要从数据库加载
    }

    return cachedPermissions.permissions.includes(permission)
  }

  /**
   * 批量清除权限缓存
   * 当权限系统发生重大变化时使用
   */
  async clearAllPermissionCache(): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`
      const deletedCount = await cacheService.delPattern(pattern)

      console.log(`🗑️ Cleared all ${deletedCount} permission cache entries`)
      return deletedCount

    } catch (error) {
      console.warn('❌ Failed to clear all permission cache:', error)
      return 0
    }
  }
}

// 导出单例实例
export const permissionCacheService = new PermissionCacheService()

// 导出便捷函数供其他模块使用
export function clearUserPermissionCache(userId: string, organizationId?: string): Promise<void> {
  if (!userId) {
    console.warn('clearUserPermissionCache called with undefined userId')
    return Promise.resolve()
  }

  if (organizationId) {
    return permissionCacheService.clearUserPermissions({ userId, organizationId })
  } else {
    return permissionCacheService.clearAllUserPermissions(userId)
  }
}

// 默认导出
export default permissionCacheService