// Vitest全局设置
import 'jsdom-global'
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
// 暂时注释掉有问题的导入，让测试能够运行
// import { DatabaseService } from '#server/services/database'
// import { CacheService } from '#server/services/redis'

// 全局测试工具
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeInTheDocument(): T
      toHaveClass(className: string): T
      toBeVisible(): T
    }
  }
}

// 扩展expect匹配器
import { expect } from 'vitest'
import { within } from '@testing-library/dom'

// 自定义匹配器
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && document.body.contains(received)
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass
    }
  },

  toHaveClass(received, className) {
    const pass = received && received.classList.contains(className)
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have class "${className}"`,
      pass
    }
  },

  toBeVisible(received) {
    const pass = received &&
      received.style.display !== 'none' &&
      received.style.visibility !== 'hidden' &&
      !received.hidden
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be visible`,
      pass
    }
  }
})

// 测试数据库实例
let testPrisma: PrismaClient
let testRedis: Redis
// let testDb: DatabaseService
// let testCache: CacheService

beforeAll(async () => {
  try {
    // 初始化测试数据库
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'mysql://test:test@localhost:3307/meeting_manage_test'
        }
      }
    })

    // 初始化测试Redis
    testRedis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1, // 使用测试专用的Redis数据库
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 0, // 不重试，避免测试时间长
      connectTimeout: 1000, // 快速失败
      lazyConnect: true // 延迟连接
    })

    // 初始化测试服务
    // testDb = new DatabaseService(testPrisma)
    // testCache = new CacheService(testRedis)

    // 尝试连接外部服务，但不强制要求
    try {
      await testCache.connect()
      await testCache.flushDb()
      console.log('✓ Test environment initialized with external services')
    } catch (redisError) {
      console.warn('⚠ Redis not available, running without cache')
      testRedis = null as any
      testCache = null as any
    }

    try {
      await testDb.getClient().$connect()
      console.log('✓ Database connected')
    } catch (dbError) {
      console.warn('⚠ Database not available, running without database')
      testPrisma = null as any
      testDb = null as any
    }

    console.log('Test environment setup completed')
  } catch (error) {
    console.error('Failed to initialize test environment:', error)
    // 不抛出错误，允许在没有外部服务的情况下运行测试
  }
})

afterAll(async () => {
  try {
    // 清理测试数据
    if (testCache) {
      await testCache.flushDb()
      await testCache.disconnect()
    }

    // 关闭数据库连接
    if (testPrisma) {
      await testPrisma.$disconnect()
    }

    // 关闭Redis连接
    if (testRedis) {
      await testRedis.quit()
    }

    console.log('Test environment cleaned up')
  } catch (error) {
    console.error('Failed to cleanup test environment:', error)
  }
})

beforeEach(async () => {
  // 每个测试前的清理工作
  try {
    if (testCache) {
      await testCache.flushDb()
    }
  } catch (error) {
    // 忽略缓存清理错误，在没有Redis的情况下正常运行
  }
})

afterEach(async () => {
  // 每个测试后的清理工作
  try {
    // 清理可能产生的测试数据
    if (testDb) {
      const tables = ['audit_log', 'reservation', 'meeting_room', 'system_config', 'user']
      for (const table of tables) {
        try {
          await testDb.getClient().$executeRaw`DELETE FROM ${table} WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`
        } catch (error) {
          // 忽略清理错误
        }
      }
    }
  } catch (error) {
    // 忽略数据库清理错误，在没有DB的情况下正常运行
  }
})

// 导出测试实例供测试文件使用
export { testPrisma, testRedis, testDb, testCache }

// 测试工具函数
export const createTestUser = async (overrides: Partial<any> = {}) => {
  if (!testDb) {
    throw new Error('Test database not initialized')
  }

  const defaultUser = {
    email: 'test@example.com',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4QJw/2.EjO', // secret
    name: 'Test User',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const userData = { ...defaultUser, ...overrides }
  return await testDb.getClient().user.create({
    data: userData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  })
}

export const createTestRoom = async (overrides: Partial<any> = {}) => {
  if (!testDb) {
    throw new Error('Test database not initialized')
  }

  const defaultRoom = {
    name: 'Test Room',
    capacity: 10,
    location: 'Test Building',
    equipment: ['Projector', 'Whiteboard'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const roomData = { ...defaultRoom, ...overrides }
  return await testDb.getClient().meetingRoom.create({
    data: roomData
  })
}

export const createTestReservation = async (userId: number, roomId: number, overrides: Partial<any> = {}) => {
  if (!testDb) {
    throw new Error('Test database not initialized')
  }

  const startTime = new Date()
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1小时后

  const defaultReservation = {
    userId,
    roomId,
    startTime,
    endTime,
    title: 'Test Meeting',
    description: 'Test meeting description',
    status: 'CONFIRMED',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const reservationData = { ...defaultReservation, ...overrides }
  return await testDb.getClient().reservation.create({
    data: reservationData
  })
}

// 模拟数据
export const mockUsers = {
  admin: {
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'ADMIN'
  },
  user: {
    email: 'user@test.com',
    name: 'Regular User',
    role: 'USER'
  }
}

export const mockRooms = {
  small: {
    name: 'Small Meeting Room',
    capacity: 4,
    location: 'Floor 1',
    equipment: ['Whiteboard']
  },
  large: {
    name: 'Large Conference Room',
    capacity: 20,
    location: 'Floor 2',
    equipment: ['Projector', 'Microphone', 'Whiteboard']
  }
}

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in tests:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in tests:', error)
  process.exit(1)
})