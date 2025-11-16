import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService } from '#server/services/database'
import { PrismaClient } from '@prisma/client'

describe('DatabaseService', () => {
  let db: DatabaseService
  let mockPrisma: PrismaClient

  beforeEach(() => {
    mockPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'mysql://test:test@localhost:3307/meeting_manage_test'
        }
      }
    })
    db = new DatabaseService(mockPrisma)
  })

  afterEach(async () => {
    if (db) {
      await db.disconnect()
    }
    if (mockPrisma) {
      await mockPrisma.$disconnect()
    }
  })

  describe('constructor', () => {
    it('should create DatabaseService with default Prisma client', () => {
      const defaultDb = new DatabaseService()
      expect(defaultDb).toBeInstanceOf(DatabaseService)
      expect(defaultDb.getClient()).toBeInstanceOf(PrismaClient)
    })

    it('should create DatabaseService with custom Prisma client', () => {
      expect(db.getClient()).toBe(mockPrisma)
    })
  })

  describe('getClient', () => {
    it('should return the Prisma client instance', () => {
      const client = db.getClient()
      expect(client).toBe(mockPrisma)
      expect(client).toBeInstanceOf(PrismaClient)
    })
  })

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      // 模拟健康的数据库连接
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ 1: 1 }])

      const isHealthy = await db.healthCheck()
      expect(isHealthy).toBe(true)
    })

    it('should return false when database query fails', async () => {
      // 模拟数据库连接失败
      mockPrisma.$queryRaw = vi.fn().mockRejectedValue(new Error('Connection failed'))

      const isHealthy = await db.healthCheck()
      expect(isHealthy).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = vi.spyOn(mockPrisma, '$disconnect')
      await db.disconnect()
      expect(disconnectSpy).toHaveBeenCalled()
    })

    it('should handle disconnect errors gracefully', async () => {
      const disconnectSpy = vi.spyOn(mockPrisma, '$disconnect')
      disconnectSpy.mockRejectedValue(new Error('Disconnect error'))

      // 应该不抛出错误
      await expect(db.disconnect()).resolves.not.toThrow()
    })
  })

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })
      mockPrisma.$transaction = mockTransaction

      const result = await db.transaction(async (tx) => {
        return 'transaction result'
      })

      expect(result).toBe('transaction result')
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('should handle transaction rollback on error', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        throw new Error('Transaction failed')
      })
      mockPrisma.$transaction = mockTransaction

      await expect(db.transaction(async (tx) => {
        throw new Error('Test error')
      })).rejects.toThrow('Transaction failed')
    })
  })

  describe('cleanup', () => {
    it('should perform cleanup operations', async () => {
      const disconnectSpy = vi.spyOn(db, 'disconnect')

      await db.cleanup()
      expect(disconnectSpy).toHaveBeenCalled()
    })
  })
})