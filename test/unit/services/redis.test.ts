import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Redis from 'ioredis'
import { CacheService } from '#server/services/redis'

describe('CacheService', () => {
  let cache: CacheService
  let mockRedis: Redis

  beforeEach(() => {
    // 创建模拟的Redis实例
    mockRedis = {
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(true),
      ping: vi.fn().mockResolvedValue('PONG'),
      get: vi.fn(),
      set: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      expire: vi.fn(),
      ttl: vi.fn(),
      keys: vi.fn(),
      flushdb: vi.fn(),
      incr: vi.fn(),
      incrby: vi.fn(),
      pipeline: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([])
      })
    } as any

    cache = new CacheService(mockRedis)
  })

  afterEach(async () => {
    if (cache) {
      await cache.disconnect()
    }
  })

  describe('constructor', () => {
    it('should create CacheService with default Redis instance', () => {
      const defaultCache = new CacheService()
      expect(defaultCache).toBeInstanceOf(CacheService)
    })

    it('should create CacheService with custom Redis instance', () => {
      expect(cache.getRedis()).toBe(mockRedis)
    })
  })

  describe('getRedis', () => {
    it('should return the Redis instance', () => {
      const redis = cache.getRedis()
      expect(redis).toBe(mockRedis)
    })
  })

  describe('connect', () => {
    it('should connect to Redis', async () => {
      await cache.connect()
      expect(mockRedis.connect).toHaveBeenCalled()
    })

    it('should not connect if already connected', async () => {
      // 模拟已连接状态
      ;(mockRedis as any).status = 'ready'

      await cache.connect()
      expect(mockRedis.connect).not.toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      await cache.disconnect()
      expect(mockRedis.disconnect).toHaveBeenCalled()
    })
  })

  describe('healthCheck', () => {
    it('should return true when Redis is healthy', async () => {
      mockRedis.ping = vi.fn().mockResolvedValue('PONG')

      const isHealthy = await cache.healthCheck()
      expect(isHealthy).toBe(true)
      expect(mockRedis.ping).toHaveBeenCalled()
    })

    it('should return false when Redis ping fails', async () => {
      mockRedis.ping = vi.fn().mockRejectedValue(new Error('Redis down'))

      const isHealthy = await cache.healthCheck()
      expect(isHealthy).toBe(false)
    })
  })

  describe('get and set operations', () => {
    it('should set and get string value', async () => {
      mockRedis.set = vi.fn().mockResolvedValue('OK')
      mockRedis.get = vi.fn().mockResolvedValue('test-value')

      await cache.set('test-key', 'test-value')
      const value = await cache.get('test-key')

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value')
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
      expect(value).toBe('test-value')
    })

    it('should set with TTL and get value', async () => {
      mockRedis.setex = vi.fn().mockResolvedValue('OK')
      mockRedis.get = vi.fn().mockResolvedValue('test-value')

      await cache.set('test-key', 'test-value', 3600)
      const value = await cache.get('test-key')

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value')
      expect(value).toBe('test-value')
    })

    it('should return null for non-existent key', async () => {
      mockRedis.get = vi.fn().mockResolvedValue(null)

      const value = await cache.get('non-existent-key')
      expect(value).toBeNull()
    })
  })

  describe('getJSON and setJSON', () => {
    it('should set and get JSON value', async () => {
      const testObject = { name: 'test', value: 123 }
      mockRedis.set = vi.fn().mockResolvedValue('OK')
      mockRedis.get = vi.fn().mockResolvedValue(JSON.stringify(testObject))

      await cache.setJSON('test-key', testObject)
      const value = await cache.getJSON('test-key')

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(testObject))
      expect(value).toEqual(testObject)
    })

    it('should set JSON with TTL', async () => {
      const testObject = { name: 'test', value: 123 }
      mockRedis.setex = vi.fn().mockResolvedValue('OK')

      await cache.setJSON('test-key', testObject, 1800)
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 1800, JSON.stringify(testObject))
    })

    it('should return null for invalid JSON', async () => {
      mockRedis.get = vi.fn().mockResolvedValue('invalid-json')

      const value = await cache.getJSON('test-key')
      expect(value).toBeNull()
    })
  })

  describe('del', () => {
    it('should delete key', async () => {
      mockRedis.del = vi.fn().mockResolvedValue(1)

      const result = await cache.del('test-key')
      expect(result).toBe(1)
      expect(mockRedis.del).toHaveBeenCalledWith('test-key')
    })
  })

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedis.exists = vi.fn().mockResolvedValue(1)

      const exists = await cache.exists('test-key')
      expect(exists).toBe(true)
    })

    it('should return false if key does not exist', async () => {
      mockRedis.exists = vi.fn().mockResolvedValue(0)

      const exists = await cache.exists('test-key')
      expect(exists).toBe(false)
    })
  })

  describe('expire', () => {
    it('should set expiration for key', async () => {
      mockRedis.expire = vi.fn().mockResolvedValue(1)

      const result = await cache.expire('test-key', 3600)
      expect(result).toBe(true)
      expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 3600)
    })
  })

  describe('getTTL', () => {
    it('should return TTL for key', async () => {
      mockRedis.ttl = vi.fn().mockResolvedValue(3600)

      const ttl = await cache.getTTL('test-key')
      expect(ttl).toBe(3600)
      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key')
    })

    it('should return -1 for key without expiration', async () => {
      mockRedis.ttl = vi.fn().mockResolvedValue(-1)

      const ttl = await cache.getTTL('test-key')
      expect(ttl).toBe(-1)
    })

    it('should return -2 for non-existent key', async () => {
      mockRedis.ttl = vi.fn().mockResolvedValue(-2)

      const ttl = await cache.getTTL('test-key')
      expect(ttl).toBe(-2)
    })
  })

  describe('increment', () => {
    it('should increment counter by 1', async () => {
      mockRedis.incr = vi.fn().mockResolvedValue(5)

      const result = await cache.increment('counter-key')
      expect(result).toBe(5)
      expect(mockRedis.incr).toHaveBeenCalledWith('counter-key')
    })

    it('should increment counter by specified amount', async () => {
      mockRedis.incrby = vi.fn().mockResolvedValue(10)

      const result = await cache.increment('counter-key', 5)
      expect(result).toBe(10)
      expect(mockRedis.incrby).toHaveBeenCalledWith('counter-key', 5)
    })
  })

  describe('isRateLimited', () => {
    it('should return true when rate limit exceeded', async () => {
      mockRedis.get = vi.fn().mockResolvedValue('10') // 超过限制
      mockRedis.pipeline = vi.fn().mockReturnValue({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, 11]])
      })

      const isLimited = await cache.isRateLimited('rate-limit-key', 5, 60)
      expect(isLimited).toBe(true)
    })

    it('should return false when rate limit not exceeded', async () => {
      mockRedis.get = vi.fn().mockResolvedValue('3') // 未超过限制

      const isLimited = await cache.isRateLimited('rate-limit-key', 5, 60)
      expect(isLimited).toBe(false)
    })

    it('should handle new rate limit key', async () => {
      mockRedis.get = vi.fn().mockResolvedValue(null)
      mockRedis.pipeline = vi.fn().mockReturnValue({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, 1]])
      })

      const isLimited = await cache.isRateLimited('new-rate-limit-key', 5, 60)
      expect(isLimited).toBe(false)
    })
  })

  describe('flushDb', () => {
    it('should flush all data from current database', async () => {
      mockRedis.flushdb = vi.fn().mockResolvedValue('OK')

      await cache.flushDb()
      expect(mockRedis.flushdb).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should perform cleanup operations', async () => {
      const disconnectSpy = vi.spyOn(cache, 'disconnect')

      await cache.cleanup()
      expect(disconnectSpy).toHaveBeenCalled()
    })
  })
})