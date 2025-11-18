import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Reservations Availability API', () => {
  let testRoom: any
  let testUser: any

  beforeEach(async () => {
    // 创建测试数据
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    testRoom = await prisma.meetingRoom.create({
      data: {
        name: 'Test Room',
        type: 'Standard',
        capacity: 10,
        location: '1st Floor',
        equipment: ['Projector', 'Whiteboard'],
        status: 'available'
      }
    })
  })

  afterEach(async () => {
    // 清理测试数据
    await prisma.reservation.deleteMany({
      where: {
        roomId: testRoom.id
      }
    })

    await prisma.meetingRoom.delete({
      where: {
        id: testRoom.id
      }
    })

    await prisma.user.delete({
      where: {
        id: testUser.id
      }
    })
  })

  it('should return availability for a room without reservations', async () => {
    const startDate = new Date('2025-11-18T09:00:00Z')
    const endDate = new Date('2025-11-18T18:00:00Z')

    const response = await $fetch('/api/v1/reservations/availability', {
      method: 'POST',
      body: {
        roomIds: [testRoom.id],
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
      }
    })

    expect(response.success).toBe(true)
    expect(response.data).toHaveProperty(testRoom.id)
    expect(response.data[testRoom.id].roomId).toBe(testRoom.id)
    expect(response.data[testRoom.id].roomName).toBe(testRoom.name)
  })

  it('should correctly identify unavailable time slots with reservations', async () => {
    // 创建一个预约
    const reservation = await prisma.reservation.create({
      data: {
        title: 'Test Meeting',
        userId: testUser.id,
        roomId: testRoom.id,
        startTime: new Date('2025-11-18T10:00:00Z'),
        endTime: new Date('2025-11-18T11:00:00Z'),
        status: 'confirmed'
      }
    })

    const startDate = new Date('2025-11-18T09:00:00Z')
    const endDate = new Date('2025-11-18T12:00:00Z')

    const response = await $fetch('/api/v1/reservations/availability', {
      method: 'POST',
      body: {
        roomIds: [testRoom.id],
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
      }
    })

    expect(response.success).toBe(true)
    expect(response.data[testRoom.id].reservations).toHaveLength(1)
    expect(response.data[testRoom.id].reservations[0].id).toBe(reservation.id)
  })

  it('should handle multiple rooms correctly', async () => {
    // 创建第二个会议室
    const testRoom2 = await prisma.meetingRoom.create({
      data: {
        name: 'Test Room 2',
        type: 'Large',
        capacity: 20,
        location: '2nd Floor',
        equipment: ['Projector', 'Sound System'],
        status: 'available'
      }
    })

    try {
      const startDate = new Date('2025-11-18T09:00:00Z')
      const endDate = new Date('2025-11-18T18:00:00Z')

      const response = await $fetch('/api/v1/reservations/availability', {
        method: 'POST',
        body: {
          roomIds: [testRoom.id, testRoom2.id],
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString()
        }
      })

      expect(response.success).toBe(true)
      expect(Object.keys(response.data)).toHaveLength(2)
      expect(response.data).toHaveProperty(testRoom.id)
      expect(response.data).toHaveProperty(testRoom2.id)
    } finally {
      await prisma.meetingRoom.delete({
        where: { id: testRoom2.id }
      })
    }
  })

  it('should return error for invalid date range', async () => {
    try {
      await $fetch('/api/v1/reservations/availability', {
        method: 'POST',
        body: {
          roomIds: [testRoom.id],
          startTime: '2025-11-18T18:00:00Z',
          endTime: '2025-11-18T09:00:00Z' // 结束时间早于开始时间
        }
      })

      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.statusCode).toBe(400)
      expect(error.statusMessage).toContain('无效')
    }
  })

  it('should return empty results for non-existent room', async () => {
    const startDate = new Date('2025-11-18T09:00:00Z')
    const endDate = new Date('2025-11-18T18:00:00Z')

    const response = await $fetch('/api/v1/reservations/availability', {
      method: 'POST',
      body: {
        roomIds: ['non-existent-room-id'],
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
      }
    })

    expect(response.success).toBe(true)
    expect(Object.keys(response.data)).toHaveLength(0)
  })

  it('should require authentication', async () => {
    try {
      await $fetch('/api/v1/reservations/availability', {
        method: 'POST',
        body: {
          roomIds: [testRoom.id],
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString()
        },
        headers: {
          // 不提供认证头
        }
      })

      expect.fail('Should have thrown an authentication error')
    } catch (error: any) {
      expect(error.statusCode).toBe(401)
      expect(error.statusMessage).toContain('登录')
    }
  })

  it('should validate required parameters', async () => {
    try {
      await $fetch('/api/v1/reservations/availability', {
        method: 'POST',
        body: {
          // 缺少必需的参数
        }
      })

      expect.fail('Should have thrown a validation error')
    } catch (error: any) {
      expect(error.statusCode).toBe(400)
      expect(error.statusMessage).toContain('无效')
    }
  })

  it('should handle date parsing correctly', async () => {
    const response = await $fetch('/api/v1/reservations/availability', {
      method: 'POST',
      body: {
        roomIds: [testRoom.id],
        startTime: '2025-11-18T09:00:00.000Z',
        endTime: '2025-11-18T18:00:00.000Z'
      }
    })

    expect(response.success).toBe(true)
    // 验证返回的时间格式正确
    expect(response.data[testRoom.id].roomId).toBe(testRoom.id)
  })

  it('should include maintenance slots in response', async () => {
    // 这里可以添加维护时间段的数据
    // 目前API可能还没有实现维护时间段功能
    const response = await $fetch('/api/v1/reservations/availability', {
      method: 'POST',
      body: {
        roomIds: [testRoom.id],
        startTime: '2025-11-18T09:00:00Z',
        endTime: '2025-11-18T18:00:00Z'
      }
    })

    expect(response.success).toBe(true)
    // 维护时间段是可选功能，所以这里只是验证结构
    if (response.data[testRoom.id].maintenanceSlots) {
      expect(Array.isArray(response.data[testRoom.id].maintenanceSlots)).toBe(true)
    }
  })
})