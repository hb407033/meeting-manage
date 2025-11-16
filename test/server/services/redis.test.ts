import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Redis from 'ioredis'
import { CacheService } from '#server/services/redis'

// Mock ioredis
vi.mock('ioredis')

describe('CacheService', () => {
  let cacheService: CacheService
  let mockRedis: any

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks()

    // 创建mock Redis实例
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      ttl: vi.fn(),
      expire: vi.fn(),
      keys: vi.fn(),
      flushall: vi.fn(),
      incr: vi.fn(),
      incrby: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue('PONG')
    }

    // Mock Redis构造函数
    vi.mocked(Redis).mockImplementation(() => mockRedis)

    // 创建缓存服务实例
    cacheService = new CacheService()
  })

  afterEach(async () => {
    await cacheService.disconnect()
  })

  describe('constructor', () => {
    it('应该正确初始化CacheService', () => {
      expect(cacheService).toBeInstanceOf(CacheService)
    })

    it('应该使用默认配置创建Redis实例', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        db: 0,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100
      })
    })
  })

  describe('connect', () => {
    it('应该成功连接到Redis', async () => {
      await expect(cacheService.connect()).resolves.toBeUndefined()
      expect(mockRedis.connect).toHaveBeenCalledTimes(1)
    })

    it('连接失败时应该抛出错误', async () => {
      const errorMessage = 'Redis连接失败'
      mockRedis.connect.mockRejectedValue(new Error(errorMessage))

      await expect(cacheService.connect()).rejects.toThrow(errorMessage)
    })
  })

  describe('disconnect', () => {
    it('应该成功断开Redis连接', async () => {
      await expect(cacheService.disconnect()).resolves.toBeUndefined()
      expect(mockRedis.quit).toHaveBeenCalledTimes(1)
    })
  })

  describe('healthCheck', () => {
    it('Redis健康时应该返回true', async () => {
      const result = await cacheService.healthCheck()
      expect(result).toBe(true)
      expect(mockRedis.ping).toHaveBeenCalledTimes(1)
    })

    it('Redis不健康时应该返回false', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis连接错误'))

      const result = await cacheService.healthCheck()
      expect(result).toBe(false)
    })
  })

  describe('缓存操作方法', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue('{"test": "value"}')
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.del.mockResolvedValue(1)
      mockRedis.exists.mockResolvedValue(1)
      mockRedis.ttl.mockResolvedValue(3600)
      mockRedis.expire.mockResolvedValue(1)
    })

    describe('get', () => {
      it('应该成功获取缓存值', async () => {
        const result = await cacheService.get('test_key')
        expect(result).toBe('{"test": "value"}')
        expect(mockRedis.get).toHaveBeenCalledWith('test_key')
      })

      it('当key不存在时应该返回null', async () => {
        mockRedis.get.mockResolvedValue(null)
        const result = await cacheService.get('nonexistent_key')
        expect(result).toBeNull()
      })
    })

    describe('getJSON', () => {
      it('应该成功获取并解析JSON值', async () => {
        const result = await cacheService.getJSON('test_key')
        expect(result).toEqual({ test: 'value' })
      })

      it('当key不存在时应该返回null', async () => {
        mockRedis.get.mockResolvedValue(null)
        const result = await cacheService.getJSON('nonexistent_key')
        expect(result).toBeNull()
      })

      it('当JSON格式错误时应该返回null', async () => {
        mockRedis.get.mockResolvedValue('invalid json')
        const result = await cacheService.getJSON('invalid_key')
        expect(result).toBeNull()
      })
    })

    describe('set', () => {
      it('应该成功设置缓存值', async () => {
        const result = await cacheService.set('test_key', 'test_value')
        expect(result).toBe(true)
        expect(mockRedis.set).toHaveBeenCalledWith('test_key', 'test_value')
      })

      it('设置失败时应该返回false', async () => {
        mockRedis.set.mockRejectedValue(new Error('设置失败'))
        const result = await cacheService.set('test_key', 'test_value')
        expect(result).toBe(false)
      })
    })

    describe('setJSON', () => {
      it('应该成功设置JSON值', async () => {
        const value = { test: 'value' }
        const result = await cacheService.setJSON('test_key', value)
        expect(result).toBe(true)
        expect(mockRedis.set).toHaveBeenCalledWith('test_key', JSON.stringify(value))
      })
    })

    describe('setWithTTL', () => {
      it('应该成功设置带TTL的缓存值', async () => {
        const result = await cacheService.setWithTTL('test_key', 'test_value', 3600)
        expect(result).toBe(true)
        expect(mockRedis.setex).toHaveBeenCalledWith('test_key', 3600, 'test_value')
      })
    })

    describe('del', () => {
      it('应该成功删除缓存键', async () => {
        const result = await cacheService.del('test_key')
        expect(result).toBe(true)
        expect(mockRedis.del).toHaveBeenCalledWith('test_key')
      })

      it('删除失败时应该返回false', async () => {
        mockRedis.del.mockResolvedValue(0)
        const result = await cacheService.del('nonexistent_key')
        expect(result).toBe(false)
      })
    })

    describe('exists', () => {
      it('键存在时应该返回true', async () => {
        const result = await cacheService.exists('test_key')
        expect(result).toBe(true)
        expect(mockRedis.exists).toHaveBeenCalledWith('test_key')
      })

      it('键不存在时应该返回false', async () => {
        mockRedis.exists.mockResolvedValue(0)
        const result = await cacheService.exists('nonexistent_key')
        expect(result).toBe(false)
      })
    })

    describe('getTTL', () => {
      it('应该返回键的TTL值', async () => {
        const result = await cacheService.getTTL('test_key')
        expect(result).toBe(3600)
        expect(mockRedis.ttl).toHaveBeenCalledWith('test_key')
      })
    })

    describe('expire', () => {
      it('应该成功设置键的过期时间', async () => {
        const result = await cacheService.expire('test_key', 3600)
        expect(result).toBe(true)
        expect(mockRedis.expire).toHaveBeenCalledWith('test_key', 3600)
      })
    })
  })

  describe('高级功能方法', () => {
    beforeEach(() => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3'])
      mockRedis.flushall.mockResolvedValue('OK')
      mockRedis.incr.mockResolvedValue(1)
      mockRedis.incrby.mockResolvedValue(5)
    })

    describe('getKeys', () => {
      it('应该返回匹配的所有键', async () => {
        const result = await cacheService.getKeys('key*')
        expect(result).toEqual(['key1', 'key2', 'key3'])
        expect(mockRedis.keys).toHaveBeenCalledWith('key*')
      })
    })

    describe('clearAll', () => {
      it('应该清空所有缓存', async () => {
        const result = await cacheService.clearAll()
        expect(result).toBe(true)
        expect(mockRedis.flushall).toHaveBeenCalledTimes(1)
      })
    })

    describe('increment', () => {
      it('应该成功递增计数器', async () => {
        const result = await cacheService.increment('counter')
        expect(result).toBe(1)
        expect(mockRedis.incr).toHaveBeenCalledWith('counter')
      })
    })

    describe('incrementBy', () => {
      it('应该成功递增指定值的计数器', async () => {
        const result = await cacheService.incrementBy('counter', 5)
        expect(result).toBe(5)
        expect(mockRedis.incrby).toHaveBeenCalledWith('counter', 5)
      })
    })
  })

  describe('限流功能', () => {
    beforeEach(() => {
      mockRedis.incr.mockResolvedValue(1)
      mockRedis.expire.mockResolvedValue(1)
      mockRedis.ttl.mockResolvedValue(-1)
    })

    describe('isRateLimited', () => {
      it('未达到限制时应该返回false', async () => {
        mockRedis.incr.mockResolvedValue(5) // 小于限制10
        const result = await cacheService.isRateLimited('user:123', 10, 60)
        expect(result).toBe(false)
      })

      it('达到限制时应该返回true', async () => {
        mockRedis.incr.mockResolvedValue(11) // 超过限制10
        const result = await cacheService.isRateLimited('user:123', 10, 60)
        expect(result).toBe(true)
      })

      it('首次请求应该设置过期时间', async () => {
        mockRedis.incr.mockResolvedValue(1)
        mockRedis.ttl.mockResolvedValue(-1) // key不存在

        await cacheService.isRateLimited('user:123', 10, 60)

        expect(mockRedis.expire).toHaveBeenCalledWith('rate_limit:user:123', 60)
      })
    })
  })

  describe('分布式锁功能', () => {
    beforeEach(() => {
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.del.mockResolvedValue(1)
    })

    describe('acquireLock', () => {
      it('应该成功获取锁', async () => {
        mockRedis.set.mockResolvedValue('OK')
        const result = await cacheService.acquireLock('test_lock', 'token123', 30)
        expect(result).toBe(true)
        expect(mockRedis.set).toHaveBeenCalledWith('lock:test_lock', 'token123', 'EX', 30, 'NX')
      })

      it('锁已被占用时应该返回false', async () => {
        mockRedis.set.mockResolvedValue(null)
        const result = await cacheService.acquireLock('test_lock', 'token123', 30)
        expect(result).toBe(false)
      })
    })

    describe('releaseLock', () => {
      it('应该成功释放锁', async () => {
        // 这里需要mock Lua脚本，简化处理
        mockRedis.del.mockResolvedValue(1)
        const result = await cacheService.releaseLock('test_lock', 'token123')
        expect(result).toBe(true)
      })
    })
  })
})