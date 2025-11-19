/**
 * 周期性预约服务单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import RecurringReservationService from '~/server/services/recurring-reservation-service'
import { prisma } from '~/server/services/database'

// Mock prisma
vi.mock('~/server/services/database', () => ({
  prisma: {
    recurringReservation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    },
    recurringException: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn()
    },
    reservation: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn()
    },
    meetingRoom: {
      findUnique: vi.fn()
    }
  }
}))

describe('RecurringReservationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createRecurringReservation', () => {
    const mockReservation = {
      id: 'test-id',
      title: '测试会议',
      roomId: 'room-1',
      organizerId: 'user-1'
    }

    it('应该成功创建周期性预约', async () => {
      const createData = {
        title: '测试会议',
        organizerId: 'user-1',
        roomId: 'room-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        pattern: {
          type: 'weekly',
          interval: 1,
          weekDays: ['MO', 'TU', 'WE', 'TH', 'FR'],
          endCondition: 'never'
        }
      }

      // Mock房间检查
      ;(prisma.meetingRoom.findUnique as any).mockResolvedValue({ id: 'room-1' })

      // Mock创建预约
      ;(prisma.recurringReservation.create as any).mockResolvedValue(mockReservation)

      const result = await RecurringReservationService.createRecurringReservation(createData)

      expect(result).toEqual(mockReservation)
      expect(prisma.meetingRoom.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1', status: 'AVAILABLE' }
      })
      expect(prisma.recurringReservation.create).toHaveBeenCalled()
    })

    it('应该抛出错误当结束时间早于开始时间', async () => {
      const createData = {
        title: '测试会议',
        organizerId: 'user-1',
        roomId: 'room-1',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'), // 早于开始时间
        pattern: {
          type: 'weekly',
          interval: 1,
          endCondition: 'never'
        }
      }

      await expect(RecurringReservationService.createRecurringReservation(createData))
        .rejects.toThrow('结束时间必须晚于开始时间')
    })

    it('应该抛出错误当会议室不存在', async () => {
      const createData = {
        title: '测试会议',
        organizerId: 'user-1',
        roomId: 'invalid-room',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        pattern: {
          type: 'weekly',
          interval: 1,
          endCondition: 'never'
        }
      }

      ;(prisma.meetingRoom.findUnique as any).mockResolvedValue(null)

      await expect(RecurringReservationService.createRecurringReservation(createData))
        .rejects.toThrow('会议室不存在或不可用')
    })
  })

  describe('updateRecurringReservation', () => {
    it('应该成功更新周期性预约', async () => {
      const existingReservation = {
        id: 'test-id',
        title: '原标题',
        organizerId: 'user-1'
      }

      const updateData = {
        title: '新标题'
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(existingReservation)
      ;(prisma.recurringReservation.update as any).mockResolvedValue({
        ...existingReservation,
        ...updateData
      })

      const result = await RecurringReservationService.updateRecurringReservation('test-id', updateData)

      expect(result.title).toBe('新标题')
      expect(prisma.recurringReservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      })
      expect(prisma.recurringReservation.update).toHaveBeenCalled()
    })

    it('应该抛出错误当预约不存在', async () => {
      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(null)

      await expect(RecurringReservationService.updateRecurringReservation('invalid-id', {}))
        .rejects.toThrow('周期性预约不存在')
    })
  })

  describe('deleteRecurringReservation', () => {
    it('应该成功删除周期性预约', async () => {
      const existingReservation = {
        id: 'test-id',
        organizerId: 'user-1',
        roomId: 'room-1'
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(existingReservation)
      ;(prisma.recurringReservation.delete as any).mockResolvedValue()
      ;(prisma.recurringException.deleteMany as any).mockResolvedValue({ count: 0 })
      ;(prisma.reservation.updateMany as any).mockResolvedValue({ count: 0 })

      await RecurringReservationService.deleteRecurringReservation('test-id', true)

      expect(prisma.recurringReservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      })
      expect(prisma.recurringReservation.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      })
      expect(prisma.recurringException.deleteMany).toHaveBeenCalledWith({
        where: { recurringReservationId: 'test-id' }
      })
      expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
        where: { recurringReservationId: 'test-id' },
        data: { status: 'CANCELED' }
      })
    })

    it('应该抛出错误当预约不存在', async () => {
      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(null)

      await expect(RecurringReservationService.deleteRecurringReservation('invalid-id'))
        .rejects.toThrow('周期性预约不存在')
    })
  })

  describe('getRecurringReservation', () => {
    it('应该成功获取周期性预约详情', async () => {
      const mockReservation = {
        id: 'test-id',
        title: '测试会议',
        roomId: 'room-1',
        organizerId: 'user-1',
        organizer: { id: 'user-1', name: '测试用户', email: 'test@example.com' },
        room: { id: 'room-1', name: '测试会议室', location: '北京' },
        _count: { reservations: 10, exceptions: 2 }
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(mockReservation)

      const result = await RecurringReservationService.getRecurringReservation('test-id', true)

      expect(result).toEqual(mockReservation)
      expect(prisma.recurringReservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      })
    })

    it('应该返回null当预约不存在', async () => {
      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(null)

      const result = await RecurringReservationService.getRecurringReservation('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('getRecurringReservations', () => {
    it('应该成功获取周期性预约列表', async () => {
      const mockReservations = [
        { id: '1', title: '会议1' },
        { id: '2', title: '会议2' }
      ]
      const mockTotal = 2

      ;(prisma.recurringReservation.findMany as any).mockResolvedValue(mockReservations)
      ;(prisma.recurringReservation.count as any).mockResolvedValue(mockTotal)

      const result = await RecurringReservationService.getRecurringReservations({
        page: 1,
        limit: 10
      })

      expect(result.items).toEqual(mockReservations)
      expect(result.total).toBe(mockTotal)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('应该正确应用过滤条件', async () => {
      const filters = {
        organizerId: 'user-1',
        roomId: 'room-1',
        status: 'ACTIVE'
      }

      ;(prisma.recurringReservation.findMany as any).mockResolvedValue([])
      ;(prisma.recurringReservation.count as any).mockResolvedValue(0)

      await RecurringReservationService.getRecurringReservations(filters)

      expect(prisma.recurringReservation.findMany).toHaveBeenCalledWith({
        where: {
          organizerId: 'user-1',
          roomId: 'room-1',
          status: 'ACTIVE'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      })
    })
  })

  describe('createException', () => {
    it('应该成功创建例外', async () => {
      const mockReservation = {
        id: 'test-id',
        organizerId: 'user-1'
      }

      const exceptionData = {
        recurringReservationId: 'test-id',
        exceptionType: 'CANCELLED' as const,
        originalStartTime: new Date(),
        originalEndTime: new Date(),
        reason: '测试原因'
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(mockReservation)
      ;(prisma.recurringException.findFirst as any).mockResolvedValue(null)
      ;(prisma.recurringException.create as any).mockResolvedValue({
        id: 'exception-1',
        ...exceptionData
      })

      const result = await RecurringReservationService.createException(exceptionData)

      expect(result).toEqual({
        id: 'exception-1',
        ...exceptionData
      })
    })

    it('应该更新已存在的例外', async () => {
      const mockReservation = {
        id: 'test-id',
        organizerId: 'user-1'
      }

      const exceptionData = {
        recurringReservationId: 'test-id',
        exceptionType: 'MODIFIED' as const,
        originalStartTime: new Date(),
        originalEndTime: new Date(),
        newStartTime: new Date(),
        newEndTime: new Date(),
        reason: '更新原因'
      }

      const existingException = {
        id: 'exception-1',
        ...exceptionData,
        exceptionType: 'CANCELLED' as const
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(mockReservation)
      ;(prisma.recurringException.findFirst as any).mockResolvedValue(existingException)
      ;(prisma.recurringException.update as any).mockResolvedValue({
        ...existingException,
        exceptionType: 'MODIFIED',
        newStartTime: exceptionData.newStartTime,
        newEndTime: exceptionData.newEndTime,
        reason: exceptionData.reason
      })

      const result = await RecurringReservationService.createException(exceptionData)

      expect(result.exceptionType).toBe('MODIFIED')
    })
  })

  describe('batchOperation', () => {
    it('应该成功执行暂停操作', async () => {
      const mockReservation = {
        id: 'test-id',
        organizerId: 'user-1'
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(mockReservation)
      ;(prisma.recurringReservation.update as any).mockResolvedValue({
        status: 'PAUSED'
      })

      const result = await RecurringReservationService.batchOperation({
        recurringReservationId: 'test-id',
        operation: 'pause'
      })

      expect(result.affected).toBe(1)
      expect(prisma.recurringReservation.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { status: 'PAUSED' }
      })
    })

    it('应该成功执行取消操作', async () => {
      const mockReservation = {
        id: 'test-id',
        organizerId: 'user-1'
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(mockReservation)
      ;(prisma.reservation.updateMany as any).mockResolvedValue({ count: 5 })

      const result = await RecurringReservationService.batchOperation({
        recurringReservationId: 'test-id',
        operation: 'cancel'
      })

      expect(result.affected).toBe(5)
      expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
        where: {
          recurringReservationId: 'test-id',
          status: { not: 'CANCELED' }
        },
        data: { status: 'CANCELED' }
      })
    })
  })
})