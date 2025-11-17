/**
 * 会议室API集成测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('会议室API', () => {
  let testRoom: any = null

  beforeAll(async () => {
    // 清理测试数据
    await prisma.meetingRoom.deleteMany({
      where: {
        name: {
          contains: 'TEST_ROOM'
        }
      }
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.meetingRoom.deleteMany({
      where: {
        name: {
          contains: 'TEST_ROOM'
        }
      }
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // 每个测试前清理
    await prisma.meetingRoom.deleteMany({
      where: {
        name: {
          contains: 'TEST_ROOM'
        }
      }
    })
  })

  describe('GET /api/v1/rooms', () => {
    it('应该返回空列表当没有会议室时', async () => {
      const response = await $fetch('/api/v1/rooms')

      expect(response.success).toBe(true)
      expect(response.data).toEqual([])
      expect(response.meta.total).toBe(0)
    })

    it('应该返回会议室列表', async () => {
      // 创建测试会议室
      testRoom = await prisma.meetingRoom.create({
        data: {
          name: 'TEST_ROOM_会议室',
          capacity: 10,
          location: '1楼',
          status: 'AVAILABLE'
        }
      })

      const response = await $fetch('/api/v1/rooms')

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(1)
      expect(response.data[0].name).toBe('TEST_ROOM_会议室')
      expect(response.meta.total).toBe(1)
    })

    it('应该支持分页', async () => {
      // 创建多个会议室
      await Promise.all([
        prisma.meetingRoom.create({
          data: { name: 'TEST_ROOM_A', capacity: 5, status: 'AVAILABLE' }
        }),
        prisma.meetingRoom.create({
          data: { name: 'TEST_ROOM_B', capacity: 10, status: 'AVAILABLE' }
        }),
        prisma.meetingRoom.create({
          data: { name: 'TEST_ROOM_C', capacity: 15, status: 'AVAILABLE' }
        })
      ])

      const response = await $fetch('/api/v1/rooms?page=1&limit=2')

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(2)
      expect(response.meta.total).toBe(3)
      expect(response.meta.totalPages).toBe(2)
    })

    it('应该支持状态筛选', async () => {
      await Promise.all([
        prisma.meetingRoom.create({
          data: { name: 'TEST_ROOM_AVAILABLE', capacity: 10, status: 'AVAILABLE' }
        }),
        prisma.meetingRoom.create({
          data: { name: 'TEST_ROOM_MAINTENANCE', capacity: 10, status: 'MAINTENANCE' }
        })
      ])

      const response = await $fetch('/api/v1/rooms?status=AVAILABLE')

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(1)
      expect(response.data[0].status).toBe('AVAILABLE')
    })

    it('应该支持搜索', async () => {
      await Promise.all([
        prisma.meetingRoom.create({
          data: { name: 'TEST_ROOM_SEARCH_1', capacity: 10, status: 'AVAILABLE' }
        }),
        prisma.meetingRoom.create({
          data: { name: 'OTHER_ROOM', capacity: 10, status: 'AVAILABLE' }
        })
      ])

      const response = await $fetch('/api/v1/rooms?search=SEARCH')

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(1)
      expect(response.data[0].name).toContain('SEARCH')
    })
  })

  describe('POST /api/v1/rooms', () => {
    it('应该创建新会议室', async () => {
      const roomData = {
        name: 'TEST_ROOM_CREATE',
        capacity: 20,
        location: '2楼',
        description: '测试会议室'
      }

      const response = await $fetch('/api/v1/rooms', {
        method: 'POST',
        body: roomData
      })

      expect(response.success).toBe(true)
      expect(response.data.name).toBe(roomData.name)
      expect(response.data.capacity).toBe(roomData.capacity)
      expect(response.data.location).toBe(roomData.location)
      expect(response.data.status).toBe('AVAILABLE')
    })

    it('应该验证必填字段', async () => {
      try {
        await $fetch('/api/v1/rooms', {
          method: 'POST',
          body: {}
        })
        expect.fail('应该抛出验证错误')
      } catch (error: any) {
        expect(error.response?.status).toBe(400)
        expect(error.data?.code).toBe('VALIDATION_ERROR')
      }
    })

    it('应该拒绝重复的会议室名称', async () => {
      await prisma.meetingRoom.create({
        data: { name: 'TEST_ROOM_DUPLICATE', capacity: 10, status: 'AVAILABLE' }
      })

      try {
        await $fetch('/api/v1/rooms', {
          method: 'POST',
          body: { name: 'TEST_ROOM_DUPLICATE', capacity: 15 }
        })
        expect.fail('应该抛出重复名称错误')
      } catch (error: any) {
        expect(error.response?.status).toBe(400)
        expect(error.data?.code).toBe('ROOM_ALREADY_EXISTS')
      }
    })
  })

  describe('GET /api/v1/rooms/:id', () => {
    it('应该返回会议室详情', async () => {
      testRoom = await prisma.meetingRoom.create({
        data: {
          name: 'TEST_ROOM_DETAIL',
          capacity: 15,
          location: '3楼',
          equipment: { projector: true, wifi: true }
        }
      })

      const response = await $fetch(`/api/v1/rooms/${testRoom.id}`)

      expect(response.success).toBe(true)
      expect(response.data.id).toBe(testRoom.id)
      expect(response.data.name).toBe('TEST_ROOM_DETAIL')
      expect(response.data.equipment).toEqual({ projector: true, wifi: true })
    })

    it('应该返回404当会议室不存在', async () => {
      try {
        await $fetch('/api/v1/rooms/non-existent-id')
        expect.fail('应该抛出404错误')
      } catch (error: any) {
        expect(error.response?.status).toBe(404)
        expect(error.data?.code).toBe('ROOM_NOT_FOUND')
      }
    })
  })

  describe('PUT /api/v1/rooms/:id', () => {
    it('应该更新会议室信息', async () => {
      testRoom = await prisma.meetingRoom.create({
        data: { name: 'TEST_ROOM_UPDATE', capacity: 10, status: 'AVAILABLE' }
      })

      const updateData = {
        name: 'TEST_ROOM_UPDATED',
        capacity: 25,
        location: '4楼'
      }

      const response = await $fetch(`/api/v1/rooms/${testRoom.id}`, {
        method: 'PUT',
        body: updateData
      })

      expect(response.success).toBe(true)
      expect(response.data.name).toBe(updateData.name)
      expect(response.data.capacity).toBe(updateData.capacity)
      expect(response.data.location).toBe(updateData.location)
    })

    it('应该记录更新历史', async () => {
      testRoom = await prisma.meetingRoom.create({
        data: { name: 'TEST_ROOM_HISTORY', capacity: 10, status: 'AVAILABLE' }
      })

      await $fetch(`/api/v1/rooms/${testRoom.id}`, {
        method: 'PUT',
        body: { name: 'TEST_ROOM_HISTORY_UPDATED' }
      })

      const history = await prisma.roomHistory.findMany({
        where: { roomId: testRoom.id }
      })

      expect(history).toHaveLength(1)
      expect(history[0].action).toBe('UPDATE')
      expect(history[0].field).toBe('name')
    })
  })

  describe('DELETE /api/v1/rooms/:id', () => {
    it('应该软删除会议室', async () => {
      testRoom = await prisma.meetingRoom.create({
        data: { name: 'TEST_ROOM_DELETE', capacity: 10, status: 'AVAILABLE' }
      })

      const response = await $fetch(`/api/v1/rooms/${testRoom.id}`, {
        method: 'DELETE'
      })

      expect(response.success).toBe(true)
      expect(response.data.deleted).toBe(true)

      // 验证软删除
      const deletedRoom = await prisma.meetingRoom.findUnique({
        where: { id: testRoom.id }
      })
      expect(deletedRoom?.deletedAt).toBeTruthy()
    })

    it('应该记录删除历史', async () => {
      testRoom = await prisma.meetingRoom.create({
        data: { name: 'TEST_ROOM_DELETE_HISTORY', capacity: 10, status: 'AVAILABLE' }
      })

      await $fetch(`/api/v1/rooms/${testRoom.id}`, {
        method: 'DELETE'
      })

      const history = await prisma.roomHistory.findMany({
        where: { roomId: testRoom.id }
      })

      expect(history).toHaveLength(1)
      expect(history[0].action).toBe('DELETE')
    })
  })
})