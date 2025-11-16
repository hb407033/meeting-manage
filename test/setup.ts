import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// 测试数据库实例
let testPrisma: PrismaClient | null = null
let testRedis: Redis | null = null

// 全局测试设置
beforeAll(async () => {
  console.log('🧪 开始测试环境初始化...')

  // 设置测试环境变量
  process.env.NODE_ENV = 'test'

  // 初始化测试数据库
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'mysql://test:test@localhost:3307/meeting_manage_test'
      }
    },
    log: ['error', 'warn']
  })

  // 初始化测试Redis
  testRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/1', {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100
  })

  // 等待数据库连接
  try {
    await testPrisma.$connect()
    console.log('✅ 测试数据库连接成功')
  } catch (error) {
    console.error('❌ 测试数据库连接失败:', error)
    throw error
  }

  // 等待Redis连接
  try {
    await testRedis.connect()
    console.log('✅ 测试Redis连接成功')
  } catch (error) {
    console.error('❌ 测试Redis连接失败:', error)
    throw error
  }

  // 清理测试数据
  await cleanupTestData()
})

// 每个测试前清理数据
beforeEach(async () => {
  // 清理Redis测试数据
  if (testRedis) {
    await testRedis.flushdb()
  }
})

// 每个测试后清理
afterEach(async () => {
  // 清理可能残留的测试数据
  await cleanupTestData()
})

// 全局测试清理
afterAll(async () => {
  console.log('🧹 清理测试环境...')

  await cleanupTestData()

  if (testPrisma) {
    await testPrisma.$disconnect()
    console.log('✅ 测试数据库连接已关闭')
  }

  if (testRedis) {
    await testRedis.quit()
    console.log('✅ 测试Redis连接已关闭')
  }

  console.log('✅ 测试环境清理完成')
})

// 清理测试数据
async function cleanupTestData() {
  if (!testPrisma) return

  try {
    // 按照外键依赖顺序清理数据
    await testPrisma.auditLog.deleteMany()
    await testPrisma.reservation.deleteMany()
    await testPrisma.meetingRoom.deleteMany()
    await testPrisma.systemConfig.deleteMany()
    await testPrisma.user.deleteMany()

    console.log('✅ 测试数据清理完成')
  } catch (error) {
    console.error('❌ 测试数据清理失败:', error)
  }
}

// 导出测试实例
export { testPrisma, testRedis }

// 测试工具函数
export const createTestUser = async (overrides: Partial<any> = {}) => {
  if (!testPrisma) throw new Error('测试数据库未初始化')

  const defaultUser = {
    email: `test${Date.now()}@example.com`,
    password: 'hashedpassword123',
    name: '测试用户',
    role: 'USER',
    department: '技术部',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return testPrisma.user.create({
    data: { ...defaultUser, ...overrides }
  })
}

export const createTestRoom = async (overrides: Partial<any> = {}) => {
  if (!testPrisma) throw new Error('测试数据库未初始化')

  const defaultRoom = {
    name: '测试会议室',
    capacity: 10,
    equipment: ['投影仪', '白板'],
    location: '1楼',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return testPrisma.meetingRoom.create({
    data: { ...defaultRoom, ...overrides }
  })
}

export const createTestReservation = async (userId: number, roomId: number, overrides: Partial<any> = {}) => {
  if (!testPrisma) throw new Error('测试数据库未初始化')

  const startTime = new Date()
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1小时后

  const defaultReservation = {
    userId,
    roomId,
    startTime,
    endTime,
    title: '测试会议',
    description: '这是一个测试会议',
    status: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return testPrisma.reservation.create({
    data: { ...defaultReservation, ...overrides }
  })
}

// 模拟数据生成器
export const mockUser = () => ({
  email: `user${Date.now()}@test.com`,
  password: 'password123',
  name: '测试用户',
  role: 'USER',
  department: '技术部',
  isActive: true
})

export const mockRoom = () => ({
  name: '会议室' + Date.now(),
  capacity: Math.floor(Math.random() * 20) + 5,
  equipment: ['投影仪', '白板', '电视'],
  location: `${Math.floor(Math.random() * 10) + 1}楼`,
  isActive: true
})

export const mockReservation = (userId: number, roomId: number) => {
  const startTime = new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000) // 未来7天内
  const endTime = new Date(startTime.getTime() + (Math.random() * 4 + 1) * 60 * 60 * 1000) // 1-5小时

  return {
    userId,
    roomId,
    startTime,
    endTime,
    title: '会议' + Date.now(),
    description: '重要会议讨论',
    status: 'APPROVED'
  }
}

// 异步错误捕获辅助函数
export const expectError = async (fn: () => Promise<any>, expectedError?: string) => {
  let error: Error | null = null

  try {
    await fn()
  } catch (e) {
    error = e as Error
  }

  expect(error).not.toBeNull()
  if (expectedError) {
    expect(error!.message).toContain(expectedError)
  }

  return error
}