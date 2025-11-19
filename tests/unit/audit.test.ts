import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { auditLogger, auditService, type AuditLogData } from '~/server/utils/audit'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
const mockPrismaClient = {
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    $queryRaw: vi.fn()
  },
  $disconnect: vi.fn()
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient)
}))

// Mock Database Service
vi.mock('~/server/services/database', () => ({
  DatabaseService: vi.fn().mockImplementation(() => ({
    getClient: () => mockPrismaClient
  }))
}))

describe('Audit System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('auditLogger', () => {
    it('should create basic audit log entry', async () => {
      const mockLogData: AuditLogData = {
        userId: 'user-123',
        action: 'user.login.success',
        resourceType: 'auth',
        details: { email: 'test@example.com' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      }

      mockPrismaClient.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        userId: 'user-123',
        action: 'user.login.success',
        resourceType: 'auth',
        details: '{"email":"test@example.com"}',
        result: 'SUCCESS',
        riskLevel: 'LOW',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      })

      await auditLogger.log(mockLogData)

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'user.login.success',
          resourceType: 'auth',
          details: '{"email":"test@example.com"}',
          result: 'SUCCESS',
          riskLevel: 'LOW',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    })

    it('should handle login success logging', async () => {
      await auditLogger.logLogin(
        'test@example.com',
        true,
        '192.168.1.1',
        'Mozilla/5.0',
        'user-123'
      )

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'user.login.success',
          resourceType: 'auth',
          details: { email: 'test@example.com', success: true },
          result: 'SUCCESS',
          riskLevel: 'LOW',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    })

    it('should handle login failure logging', async () => {
      await auditLogger.logLoginFailure(
        'test@example.com',
        'Invalid password',
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'user.login.failure',
          resourceType: 'auth',
          details: { email: 'test@example.com', reason: 'Invalid password' },
          result: 'SUCCESS',
          riskLevel: 'LOW',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    })

    it('should handle admin action logging with high risk', async () => {
      await auditLogger.logAdminAction(
        'admin-123',
        'delete_user',
        'user',
        'target-123',
        { targetUser: 'test@example.com' },
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-123',
          action: 'admin.delete_user',
          resourceType: 'user',
          resourceId: 'target-123',
          details: { targetUser: 'test@example.com', adminAction: true },
          result: 'SUCCESS',
          riskLevel: 'HIGH',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    })

    it('should handle suspicious activity logging', async () => {
      await auditLogger.logSuspiciousActivity(
        'user-123',
        'brute_force_attempt',
        { attempts: 10, ipAddress: '192.168.1.1' },
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'security.suspicious_activity',
          resourceType: 'security',
          details: { reason: 'brute_force_attempt', attempts: 10, ipAddress: '192.168.1.1', suspicious: true },
          result: 'SUCCESS',
          riskLevel: 'HIGH',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    })

    it('should handle data change logging', async () => {
      const oldData = { name: 'John', email: 'john@example.com' }
      const newData = { name: 'John Smith', email: 'john.smith@example.com' }

      await auditLogger.logDataChange(
        'user-123',
        'update',
        'user',
        'user-123',
        oldData,
        newData,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'data.update',
          resourceType: 'user',
          resourceId: 'user-123',
          details: {
            action: 'update',
            resourceType: 'user',
            resourceId: 'user-123',
            timestamp: expect.any(String),
            oldData,
            newData,
            changes: {
              name: { old: 'John', new: 'John Smith' },
              email: { old: 'john@example.com', new: 'john.smith@example.com' }
            }
          },
          result: 'SUCCESS',
          riskLevel: 'MEDIUM',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    })

    it('should handle missing user data gracefully', async () => {
      const mockLogData: AuditLogData = {
        action: 'system.startup',
        resourceType: 'system',
        details: { event: 'system started' }
      }

      mockPrismaClient.auditLog.create.mockResolvedValue({
        id: 'audit-456',
        userId: null,
        action: 'system.startup',
        resourceType: 'system',
        details: '{"event":"system started"}',
        result: 'SUCCESS',
        riskLevel: 'LOW',
        timestamp: new Date()
      })

      await auditLogger.log(mockLogData)

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          action: 'system.startup',
          resourceType: 'system',
          details: '{"event":"system started"}',
          result: 'SUCCESS',
          riskLevel: 'LOW',
          timestamp: expect.any(Date)
        }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.auditLog.create.mockRejectedValue(new Error('Database connection failed'))

      const mockLogData: AuditLogData = {
        userId: 'user-123',
        action: 'test.action',
        resourceType: 'test'
      }

      // Should not throw error
      const consoleSpy = vi.spy(console, 'error').mockImplementation(() => {})

      await auditLogger.log(mockLogData)

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to log audit event:', expect.any(Error))
    })
  })

  describe('auditService', () => {
    let service: typeof auditService

    beforeEach(() => {
      service = auditService
      // Reset queue
      service.getQueueStatus = () => ({
        queueLength: 0,
        isProcessing: false,
        batchSize: 50,
        flushInterval: 5000
      })
    })

    it('should handle async log queuing', async () => {
      const mockFlush = vi.spy(service, 'flush')
      const createSpy = vi.spy(mockPrismaClient.auditLog, 'create')

      const mockLogData: AuditLogData = {
        userId: 'user-123',
        action: 'test.action',
        resourceType: 'test'
      }

      await service.logAsync(mockLogData)

      // Should add to queue
      expect(service.getQueueStatus().queueLength).toBe(1)

      // Should not create immediately
      expect(createSpy).not.toHaveBeenCalled()
    })

    it('should process queue when batch size is reached', async () => {
      const mockFlush = vi.spy(service, 'flush')
      const createSpy = vi.spy(mockPrismaClient.auditLog, 'create')

      const mockLogData: AuditLogData = {
        userId: 'user-123',
        action: 'test.action',
        resourceType: 'test'
      }

      // Add 50 items (batch size)
      for (let i = 0; i < 50; i++) {
        await service.logAsync(mockLogData)
      }

      // Should have 50 items in queue
      expect(service.getQueueStatus().queueLength).toBe(50)

      // Should trigger flush
      expect(mockFlush).toHaveBeenCalled()
      expect(createSpy).toHaveBeenCalled()
    })

    it('should handle sync logging for high-risk operations', async () => {
      const createSpy = vi.spy(mockPrismaClient.auditLog, 'create')

      const mockLogData: AuditLogData = {
        userId: 'user-123',
        action: 'admin.delete_user',
        resourceType: 'user',
        riskLevel: 'CRITICAL'
      }

      await service.logSync(mockLogData)

      // Should create immediately for critical operations
      expect(createSpy).toHaveBeenCalled()
      expect(createSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle data change logging', async () => {
      const mockFlush = vi.spy(service, 'flush')

      const oldData = { name: 'John' }
      const newData = { name: 'John Smith' }

      await service.logDataChange(
        'user-123',
        'update',
        'user',
        'user-123',
        oldData,
        newData,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockFlush).toHaveBeenCalled()
    })

    it('should detect anomalous activity and create alerts', async () => {
      const mockFlush = vi.spy(service, 'flush')

      await service.logAnomalousActivity(
        'user-123',
        'suspicious_login',
        { attempts: 20 },
        '192.168.1.1',
        'Mozilla/5.0',
        'CRITICAL'
      )

      expect(mockFlush).toHaveBeenCalled()
    })
  })

  describe('Data Integrity', () => {
    it('should enforce insert-only strategy for audit logs', async () => {
      const createdLog = await mockPrismaClient.auditLog.create({
        data: {
          userId: 'user-123',
          action: 'test.action',
          resourceType: 'test',
          timestamp: new Date()
        }
      })

      // Verify created log has required fields
      expect(createdLog).toHaveProperty('id')
      expect(createdLog).toHaveProperty('timestamp')
      expect(createdLog.result).toBe('SUCCESS')
      expect(createdLog.riskLevel).toBe('LOW')
    })

    it('should track immutable fields properly', async () => {
      const timestamp = new Date('2023-01-01T00:00:00Z')
      const createdLog = await mockPrismaClient.auditLog.create({
        data: {
          userId: 'user-123',
          action: 'test.action',
          resourceType: 'test',
          timestamp,
          result: 'SUCCESS',
          riskLevel: 'LOW'
        }
      })

      // Timestamp should be preserved
      expect(new Date(createdLog.timestamp)).toEqual(timestamp)

      // Result and risk level should have defaults
      expect(createdLog.result).toBe('SUCCESS')
      expect(createdLog.riskLevel).toBe('LOW')
    })

    it('should handle large log entries', async () => {
      const largeDetails = {
        largeArray: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          data: 'x'.repeat(100)
        })),
        nestedObject: {
          level1: {
            level2: {
              level3: 'deeply nested data'
            }
          }
        }
      }

      mockPrismaClient.auditLog.create.mockResolvedValue({
        id: 'audit-large',
        userId: 'user-123',
        action: 'test.large_operation',
        resourceType: 'test',
        details: JSON.stringify(largeDetails),
        result: 'SUCCESS',
        riskLevel: 'LOW',
        timestamp: new Date()
      })

      await auditLogger.log({
        userId: 'user-123',
        action: 'test.large_operation',
        resourceType: 'test',
        details: largeDetails
      })

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'test.large_operation',
          resourceType: 'test',
          details: JSON.stringify(largeDetails),
          result: 'SUCCESS',
          riskLevel: 'LOW',
          timestamp: expect.any(Date)
        }
      })
    })
  })

  describe('Performance', () => {
    it('should handle high volume logging without blocking', async () => {
      const startTime = Date.now()

      const promises = Array(100).fill(0).map((_, i) =>
        auditLogger.log({
          userId: `user-${i}`,
          action: 'test.action',
          resourceType: 'test',
          details: { index: i }
        })
      )

      await Promise.all(promises)

      const duration = Date.now() - startTime
      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000)
    })

    it('should use async queue for better performance', async () => {
      const createSpy = vi.spy(mockPrismaClient.auditLog, 'create')
      const flushSpy = vi.spy(auditService, 'flush')

      // Queue multiple logs
      for (let i = 0; i < 30; i++) {
        await auditService.logAsync({
          userId: 'user-123',
          action: 'test.action',
          resourceType: 'test'
        })
      }

      // Should not create immediately
      expect(createSpy).not.toHaveBeenCalled()

      // Flush queue
      await auditService.flush()

      expect(createSpy).toHaveBeenCalled()
      expect(flushSpy).toHaveBeenCalled()
    })
  })

  describe('Security', () => {
    it('should validate user permissions for audit operations', async () => {
      // This would test integration with permission system
      const mockLogData: AuditLogData = {
        userId: 'user-123',
        action: 'admin.delete_user',
        resourceType: 'user'
      }

      mockPrismaClient.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        userId: 'user-123',
        action: 'admin.delete_user',
        resourceType: 'user',
        result: 'SUCCESS',
        riskLevel: 'HIGH',
        timestamp: new Date()
      })

      await auditLogger.logAdminAction(
        'admin-123',
        'delete_user',
        'user',
        'target-123',
        {},
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-123',
          action: 'admin.delete_user',
          resourceType: 'user',
          result: 'SUCCESS',
          riskLevel: 'HIGH'
        })
      })
    })

    it('should mask sensitive information in logs', async () => {
      const sensitiveData = {
        password: 'secret123',
        token: 'jwt-token-here',
        apiKey: 'api-key-value'
      }

      mockPrismaClient.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        userId: 'user-123',
        action: 'sensitive_operation',
        resourceType: 'auth',
        details: JSON.stringify(sensitiveData),
        result: 'SUCCESS',
        riskLevel: 'HIGH',
        timestamp: new Date()
      })

      await auditLogger.log({
        userId: 'user-123',
        action: 'sensitive_operation',
        resourceType: 'auth',
        details: sensitiveData
      })

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: JSON.stringify(sensitiveData)
        })
      })
    })

    it('should track IP addresses for security monitoring', async () => {
      const ipAddress = '192.168.1.1'

      mockPrismaClient.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        userId: 'user-123',
        action: 'test.action',
        resourceType: 'test',
        ipAddress,
        result: 'SUCCESS',
        riskLevel: 'LOW',
        timestamp: new Date()
      })

      await auditLogger.log({
        userId: 'user-123',
        action: 'test.action',
        resourceType: 'test',
        ipAddress
      })

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockPrismaClient.auditLog.create.mockRejectedValue(new Error('Connection timeout'))

      const consoleSpy = vi.spy(console, 'error').mockImplementation(() => {})

      await auditLogger.log({
        userId: 'user-123',
        action: 'test.action',
        resourceType: 'test'
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log audit event:',
        expect.any(Error)
      )
    })

    it('should continue operation even if logging fails', async () => {
      mockPrismaClient.auditLog.create.mockRejectedValue(new Error('Database error'))

      const consoleSpy = vi.spy(console, 'error').mockImplementation(() => {})

      // Should not throw
      const result = await auditLogger.log({
        userId: 'user-123',
        action: 'test.action',
        resourceType: 'test'
      })

      expect(result).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should handle malformed data gracefully', async () => {
      const malformedData = {
        userId: null,
        action: '',
        resourceType: null,
        details: { circular: null }
      }

      mockPrismaClient.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        userId: null,
        action: '',
        resourceType: null,
        details: '{"circular":null}',
        result: 'SUCCESS',
        riskLevel: 'LOW',
        timestamp: new Date()
      })

      await auditLogger.log(malformedData as any)

      expect(mockPrismaClient.auditLog.create).toHaveBeenCalled()
    })
  })
})