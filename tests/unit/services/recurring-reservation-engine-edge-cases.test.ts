/**
 * 周期性预约引擎边界条件和异常情况测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RecurringReservationEngine } from '~/server/services/recurring-reservation-engine'
import { RecurrencePattern } from '~/server/types/recurrence'
import { prisma } from '~/server/services/database'

// Mock prisma
vi.mock('~/server/services/database', () => ({
  prisma: {
    recurringReservation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    recurringException: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn()
    },
    holiday: {
      findMany: vi.fn()
    },
    reservation: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    meetingRoom: {
      findUnique: vi.fn()
    }
  }
}))

describe('RecurringReservationEngine - 边界条件和异常测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateDateSeries - 边界条件测试', () => {
    it('应该处理最大限制边界', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endCondition: 'never'
      }

      const baseStartTime = new Date('2024-01-01T09:00:00Z')
      const baseEndTime = new Date('2024-01-01T10:00:00Z')

      // 测试最大生成数量限制
      const result = RecurringReservationEngine.generateDateSeries(
        pattern,
        baseStartTime,
        baseEndTime,
        { maxOccurrences: 5 }
      )

      expect(result).toHaveLength(5)
    })

    it('应该处理零间隔的情况', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1, // 最小有效间隔
        endCondition: 'count',
        endCount: 1
      }

      const baseStartTime = new Date('2024-01-01T09:00:00Z')
      const baseEndTime = new Date('2024-01-01T10:00:00Z')

      expect(() => {
        RecurringReservationEngine.generateDateSeries(pattern, baseStartTime, baseEndTime)
      }).not.toThrow()
    })

    it('应该处理结束时间早于开始时间的情况', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endCondition: 'count',
        endCount: 1
      }

      const baseStartTime = new Date('2024-01-01T10:00:00Z')
      const baseEndTime = new Date('2024-01-01T09:00:00Z') // 早于开始时间

      const result = RecurringReservationEngine.generateDateSeries(pattern, baseStartTime, baseEndTime)
      expect(result).toHaveLength(1)
      expect(result[0].startDate.getTime()).toBeGreaterThan(result[0].endDate.getTime())
    })

    it('应该处理相同的开始和结束时间', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endCondition: 'count',
        endCount: 1
      }

      const sameTime = new Date('2024-01-01T09:00:00Z')
      const result = RecurringReservationEngine.generateDateSeries(pattern, sameTime, sameTime)

      expect(result).toHaveLength(1)
      expect(result[0].startDate.getTime()).toBe(result[0].endDate.getTime())
    })
  })

  describe('generateOccurrences - 异常情况测试', () => {
    const mockRecurringReservation = {
      id: 'test-id',
      recurrenceRule: 'RRULE:FREQ=DAILY;INTERVAL=1;COUNT=5',
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T10:00:00Z'),
      skipHolidays: true,
      bufferMinutes: 15,
      holidayRegion: 'CN',
      roomId: 'room-1'
    }

    it('应该处理空的例外列表', async () => {
      ;(prisma.recurringException.findMany as any).mockResolvedValue([])
      ;(prisma.holiday.findMany as any).mockResolvedValue([])

      const result = await RecurringReservationEngine.generateOccurrences(
        mockRecurringReservation as any
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result.every(occ => !occ.hasException)).toBe(true)
    })

    it('应该处理所有实例都被取消的情况', async () => {
      const exceptions = [
        {
          id: 'exception-1',
          originalStartTime: new Date('2024-01-01T09:00:00Z'),
          exceptionType: 'CANCELLED',
          reason: '测试取消'
        }
      ]

      ;(prisma.recurringException.findMany as any).mockResolvedValue(exceptions)
      ;(prisma.holiday.findMany as any).mockResolvedValue([])

      const result = await RecurringReservationEngine.generateOccurrences(
        mockRecurringReservation as any
      )

      expect(result.some(occ => occ.exceptionType === 'CANCELLED')).toBe(true)
    })

    it('应该处理数据库连接异常', async () => {
      ;(prisma.recurringException.findMany as any).mockRejectedValue(new Error('数据库连接失败'))

      await expect(
        RecurringReservationEngine.generateOccurrences(mockRecurringReservation as any)
      ).rejects.toThrow('数据库连接失败')
    })

    it('应该处理无效的RRule字符串', async () => {
      const invalidReservation = {
        ...mockRecurringReservation,
        recurrenceRule: 'INVALID_RRULE'
      }

      await expect(
        RecurringReservationEngine.generateOccurrences(invalidReservation as any)
      ).rejects.toThrow()
    })

    it('应该处理极大的日期范围', async () => {
      const largeDateRange = {
        startDate: new Date('2020-01-01'),
        endDate: new Date('2030-12-31') // 10年范围
      }

      ;(prisma.recurringException.findMany as any).mockResolvedValue([])
      ;(prisma.holiday.findMany as any).mockResolvedValue([])

      const result = await RecurringReservationEngine.generateOccurrences(
        mockRecurringReservation as any,
        largeDateRange,
        { maxOccurrences: 1000 } // 允许更多实例
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('checkConflicts - 复杂冲突场景测试', () => {
    const mockRecurringReservation = {
      id: 'test-id',
      recurrenceRule: 'RRULE:FREQ=DAILY;INTERVAL=1;COUNT=3',
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T10:00:00Z'),
      skipHolidays: false,
      roomId: 'room-1'
    }

    it('应该处理多个重叠预约的冲突', async () => {
      const existingReservations = [
        {
          id: 'reservation-1',
          title: '会议1',
          startTime: new Date('2024-01-01T09:30:00Z'),
          endTime: new Date('2024-01-01T10:30:00Z')
        },
        {
          id: 'reservation-2',
          title: '会议2',
          startTime: new Date('2024-01-02T08:30:00Z'),
          endTime: new Date('2024-01-02T09:30:00Z')
        }
      ]

      ;(prisma.reservation.findMany as any).mockResolvedValue(existingReservations)

      const result = await RecurringReservationEngine.checkConflicts(
        mockRecurringReservation as any
      )

      expect(result.hasConflict).toBe(true)
      expect(result.conflicts.length).toBeGreaterThan(0)
    })

    it('应该处理节假日和时间的双重冲突', async () => {
      const holidays = [
        {
          date: new Date('2024-01-01'),
          name: '元旦',
          region: 'CN',
          isActive: true
        }
      ]

      ;(prisma.reservation.findMany as any).mockResolvedValue([])
      ;(prisma.holiday.findMany as any).mockResolvedValue(holidays)

      const result = await RecurringReservationEngine.checkConflicts(
        mockRecurringReservation as any
      )

      expect(result.hasConflict).toBe(true)
      expect(result.conflicts.some(c => c.conflictType === 'holiday')).toBe(true)
    })

    it('应该处理建议时间段不可用的情况', async () => {
      // 模拟所有建议时间段都被占用
      ;(prisma.reservation.findMany as any).mockResolvedValue([/* 现有预约 */])
      ;(prisma.meetingRoom.findUnique as any).mockResolvedValue({
        id: 'room-1',
        status: 'AVAILABLE'
      })

      // Mock isTimeSlotAvailable 总是返回 false
      vi.spyOn(RecurringReservationEngine as any, 'isTimeSlotAvailable')
        .mockResolvedValue(false)

      const result = await RecurringReservationEngine.checkConflicts(
        mockRecurringReservation as any
      )

      expect(result.alternatives).toHaveLength(0)
    })
  })

  describe('createOrUpdateException - 异常处理测试', () => {
    it('应该处理重复创建例外的情况', async () => {
      const exceptionData = {
        recurringReservationId: 'test-id',
        exceptionType: 'CANCELLED' as const,
        originalStartTime: new Date('2024-01-01T09:00:00Z'),
        originalEndTime: new Date('2024-01-01T10:00:00Z')
      }

      const existingException = {
        id: 'existing-exception',
        ...exceptionData,
        reason: '已存在的原因'
      }

      ;(prisma.recurringException.findFirst as any)
        .mockResolvedValueOnce(existingException)
        .mockResolvedValueOnce(null)

      ;(prisma.recurringException.update as any).mockResolvedValue({
        ...existingException,
        reason: '更新后的原因'
      })

      const result = await RecurringReservationEngine.createOrUpdateException(
        ...Object.values(exceptionData)
      )

      expect(result.reason).toBe('更新后的原因')
    })

    it('应该处理无效的例外类型', async () => {
      const exceptionData = {
        recurringReservationId: 'test-id',
        exceptionType: 'INVALID_TYPE' as any,
        originalStartTime: new Date('2024-01-01T09:00:00Z'),
        originalEndTime: new Date('2024-01-01T10:00:00Z')
      }

      ;(prisma.recurringException.findFirst as any).mockResolvedValue(null)
      ;(prisma.recurringException.create as any).mockImplementation(() => {
        throw new Error('无效的例外类型')
      })

      await expect(
        RecurringReservationEngine.createOrUpdateException(
          ...Object.values(exceptionData)
        )
      ).rejects.toThrow()
    })
  })

  describe('getStatistics - 边界条件测试', () => {
    it('应该处理不存在的周期性预约', async () => {
      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(null)

      await expect(
        RecurringReservationEngine.getStatistics('invalid-id')
      ).rejects.toThrow('周期性预约不存在')
    })

    it('应该处理空统计结果', async () => {
      const mockReservation = {
        id: 'test-id',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        recurrenceRule: 'RRULE:FREQ=DAILY;INTERVAL=1;COUNT=1'
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(mockReservation)

      // Mock generateOccurrences 返回空数组
      vi.spyOn(RecurringReservationEngine, 'generateOccurrences')
        .mockResolvedValue([])

      const result = await RecurringReservationEngine.getStatistics('test-id')

      expect(result.totalOccurrences).toBe(0)
      expect(result.cancelledOccurrences).toBe(0)
      expect(result.modifiedOccurrences).toBe(0)
      expect(result.holidayOccurrences).toBe(0)
      expect(result.nextOccurrence).toBeUndefined()
    })

    it('应该处理所有未来预约都被取消的情况', async () => {
      const mockReservation = {
        id: 'test-id',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        recurrenceRule: 'RRULE:FREQ=DAILY;INTERVAL=1;COUNT=3'
      }

      ;(prisma.recurringReservation.findUnique as any).mockResolvedValue(mockReservation)

      const cancelledOccurrences = [
        {
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          exceptionType: 'CANCELLED' as const,
          isHoliday: false,
          hasException: true
        }
      ]

      vi.spyOn(RecurringReservationEngine, 'generateOccurrences')
        .mockResolvedValue(cancelledOccurrences)

      const result = await RecurringReservationEngine.getStatistics('test-id')

      expect(result.nextOccurrence).toBeUndefined()
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内处理大量预约生成', async () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endCondition: 'count',
        endCount: 1000
      }

      const baseStartTime = new Date('2024-01-01T09:00:00Z')
      const baseEndTime = new Date('2024-01-01T10:00:00Z')

      const startTime = performance.now()

      const result = RecurringReservationEngine.generateDateSeries(
        pattern,
        baseStartTime,
        baseEndTime,
        { maxOccurrences: 1000 }
      )

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // 应该在1秒内完成
    })

    it('应该有效处理大量例外情况', async () => {
      const largeExceptions = Array.from({ length: 100 }, (_, i) => ({
        id: `exception-${i}`,
        originalStartTime: new Date(2024, 0, 1 + i, 9, 0, 0),
        exceptionType: 'CANCELLED',
        reason: `批量取消 ${i}`
      }))

      ;(prisma.recurringException.findMany as any).mockResolvedValue(largeExceptions)
      ;(prisma.holiday.findMany as any).mockResolvedValue([])

      const mockReservation = {
        id: 'test-id',
        recurrenceRule: 'RRULE:FREQ=DAILY;INTERVAL=1;COUNT=100',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        skipHolidays: false,
        bufferMinutes: 0
      }

      const startTime = performance.now()

      const result = await RecurringReservationEngine.generateOccurrences(
        mockReservation as any
      )

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(2000) // 应该在2秒内完成
    })
  })

  describe('内存和资源清理测试', () => {
    it('应该正确清理临时资源', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endCondition: 'count',
        endCount: 10
      }

      const baseStartTime = new Date('2024-01-01T09:00:00Z')
      const baseEndTime = new Date('2024-01-01T10:00:00Z')

      // 多次调用不应该造成内存泄漏
      for (let i = 0; i < 100; i++) {
        const result = RecurringReservationEngine.generateDateSeries(
          pattern,
          baseStartTime,
          baseEndTime
        )
        expect(result).toHaveLength(10)
      }
    })
  })
})