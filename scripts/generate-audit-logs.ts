import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateSampleAuditLogs() {
  try {
    // 检查是否已有审计日志数据
    const existingCount = await prisma.auditLog.count()
    if (existingCount > 0) {
      console.log(`已存在 ${existingCount} 条审计日志，跳过示例数据生成`)
      return
    }

    console.log('正在生成示例审计日志数据...')

    const sampleLogs = [
      {
        userId: 'admin-user-id',
        action: 'admin.login.success',
        resourceType: 'auth',
        details: { email: 'admin@example.com', method: 'password' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'SUCCESS' as const,
        riskLevel: 'LOW' as const,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2小时前
      },
      {
        userId: 'user-1-id',
        action: 'user.login.failure',
        resourceType: 'auth',
        details: { email: 'user1@example.com', reason: 'Invalid password' },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        result: 'FAILURE' as const,
        riskLevel: 'MEDIUM' as const,
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1小时前
      },
      {
        userId: 'admin-user-id',
        action: 'admin.create',
        resourceType: 'user',
        resourceId: 'new-user-id',
        details: { targetUser: 'newuser@example.com', role: 'USER' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'SUCCESS' as const,
        riskLevel: 'HIGH' as const,
        timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45分钟前
      },
      {
        userId: 'user-2-id',
        action: 'user.reservation.create',
        resourceType: 'reservation',
        resourceId: 'reservation-1',
        details: {
          roomId: 'room-1',
          startTime: '2025-11-20T10:00:00Z',
          endTime: '2025-11-20T12:00:00Z'
        },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        result: 'SUCCESS' as const,
        riskLevel: 'LOW' as const,
        timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30分钟前
      },
      {
        userId: 'admin-user-id',
        action: 'admin.delete',
        resourceType: 'room',
        resourceId: 'deleted-room-id',
        details: { targetRoom: '会议室A', reason: '装修拆除' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'SUCCESS' as const,
        riskLevel: 'CRITICAL' as const,
        timestamp: new Date(Date.now() - 15 * 60 * 1000) // 15分钟前
      },
      {
        userId: 'user-3-id',
        action: 'anomaly.suspicious_activity',
        resourceType: 'security',
        details: {
          pattern: 'Rapid API calls',
          apiCalls: 50,
          timeWindow: '1 minute'
        },
        ipAddress: '192.168.1.103',
        userAgent: 'curl/7.64.1',
        result: 'FAILURE' as const,
        riskLevel: 'HIGH' as const,
        timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10分钟前
      },
      {
        userId: 'user-1-id',
        action: 'user.reservation.cancel',
        resourceType: 'reservation',
        resourceId: 'reservation-2',
        details: {
          roomId: 'room-2',
          reason: '会议取消'
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        result: 'SUCCESS' as const,
        riskLevel: 'MEDIUM' as const,
        timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5分钟前
      },
      {
        userId: null, // 系统操作
        action: 'system.backup',
        resourceType: 'system',
        details: {
          backupType: 'automated',
          size: '1.2GB',
          duration: '5 minutes'
        },
        ipAddress: 'localhost',
        userAgent: 'System Scheduler',
        result: 'SUCCESS' as const,
        riskLevel: 'LOW' as const,
        timestamp: new Date(Date.now() - 2 * 60 * 1000) // 2分钟前
      }
    ]

    // 插入示例数据
    for (const log of sampleLogs) {
      await prisma.auditLog.create({
        data: {
          ...log,
          details: JSON.stringify(log.details)
        }
      })
    }

    console.log(`成功生成 ${sampleLogs.length} 条示例审计日志`)
  } catch (error) {
    console.error('生成示例数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateSampleAuditLogs()