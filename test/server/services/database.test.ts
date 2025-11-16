import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Prisma Client 在顶部
vi.mock('@prisma/client', () => {
  const mockPrismaMethods = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn(),
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    meetingRoom: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    reservation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    $transaction: vi.fn()
  }

  return {
    PrismaClient: vi.fn(() => mockPrismaMethods)
  }
})

import { DatabaseService } from '#server/services/database'
import { PrismaClient } from '@prisma/client'

describe('DatabaseService', () => {
  let databaseService: DatabaseService
  let mockPrisma: any

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks()

    // 获取mock实例
    mockPrisma = vi.mocked(PrismaClient).mock.results[0]?.value

    // 重置mock方法
    if (mockPrisma) {
      Object.values(mockPrisma).forEach((method: any) => {
        if (typeof method === 'function') {
          method.mockReset()
        } else if (typeof method === 'object') {
          Object.values(method).forEach((subMethod: any) => {
            if (typeof subMethod === 'function') {
              subMethod.mockReset()
            }
          })
        }
      })

      // 重新设置默认返回值
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.$disconnect.mockResolvedValue(undefined)
    }

    // 创建数据库服务实例
    databaseService = new DatabaseService()
  })

  describe('constructor', () => {
    it('应该正确初始化DatabaseService', () => {
      expect(databaseService).toBeInstanceOf(DatabaseService)
    })

    it('应该创建Prisma客户端实例', () => {
      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log: expect.any(Array),
        errorFormat: 'pretty',
      })
    })
  })

  describe('connect', () => {
    it('应该成功连接到数据库', async () => {
      await expect(databaseService.connect()).resolves.toBeUndefined()
      expect(mockPrisma.$connect).toHaveBeenCalledTimes(1)
    })

    it('连接失败时应该抛出错误', async () => {
      const errorMessage = '连接失败'
      mockPrisma.$connect.mockRejectedValue(new Error(errorMessage))

      await expect(databaseService.connect()).rejects.toThrow(errorMessage)
    })
  })

  describe('disconnect', () => {
    it('应该成功断开数据库连接', async () => {
      await expect(databaseService.disconnect()).resolves.toBeUndefined()
      expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1)
    })

    it('断开连接失败时应该抛出错误', async () => {
      const errorMessage = '断开连接失败'
      mockPrisma.$disconnect.mockRejectedValue(new Error(errorMessage))

      await expect(databaseService.disconnect()).rejects.toThrow(errorMessage)
    })
  })

  describe('healthCheck', () => {
    it('数据库健康时应该返回true', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }])

      const result = await databaseService.healthCheck()
      expect(result).toBe(true)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith('SELECT 1')
    })

    it('数据库不健康时应该返回false', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('数据库错误'))

      const result = await databaseService.healthCheck()
      expect(result).toBe(false)
    })
  })

  describe('getClient', () => {
    it('应该返回Prisma客户端实例', () => {
      const client = databaseService.getClient()
      expect(client).toBe(mockPrisma)
    })
  })

  describe('executeTransaction', () => {
    it('应该成功执行事务', async () => {
      const mockTransactionFn = vi.fn().mockResolvedValue('success')
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma))

      const result = await databaseService.executeTransaction(mockTransactionFn)

      expect(result).toBe('success')
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      expect(mockTransactionFn).toHaveBeenCalledWith(mockPrisma)
    })

    it('事务执行失败时应该抛出错误', async () => {
      const errorMessage = '事务失败'
      const mockTransactionFn = vi.fn().mockRejectedValue(new Error(errorMessage))
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma))

      await expect(databaseService.executeTransaction(mockTransactionFn)).rejects.toThrow(errorMessage)
    })
  })

  describe('统计查询方法', () => {
    beforeEach(() => {
      mockPrisma.user.count.mockResolvedValue(10)
      mockPrisma.meetingRoom.count.mockResolvedValue(5)
      mockPrisma.reservation.count.mockResolvedValue(20)
    })

    it('getUserCount应该返回用户数量', async () => {
      const count = await databaseService.getUserCount()
      expect(count).toBe(10)
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1)
    })

    it('getRoomCount应该返回会议室数量', async () => {
      const count = await databaseService.getRoomCount()
      expect(count).toBe(5)
      expect(mockPrisma.meetingRoom.count).toHaveBeenCalledTimes(1)
    })

    it('getReservationCount应该返回预约数量', async () => {
      const count = await databaseService.getReservationCount()
      expect(count).toBe(20)
      expect(mockPrisma.reservation.count).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup', () => {
    it('应该正确清理资源', async () => {
      await expect(databaseService.cleanup()).resolves.toBeUndefined()
      expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1)
    })
  })
})