/**
 * 周期性预约服务
 * 提供周期性预约的CRUD操作、序列管理和实例控制功能
 */

import { Prisma, RecurringReservation, RecurringReservationStatus, Reservation, RecurringExceptionType } from '@prisma/client'
import prisma from './database'
import RecurringReservationEngine from './recurring-reservation-engine'
import { RecurrencePattern, RecurrenceRuleEngine } from '../types/recurrence'
import { conflictDetectionEngine } from './conflict-detection'
import { cacheService } from './redis'

export interface CreateRecurringReservationRequest {
  title: string
  description?: string
  organizerId: string
  roomId: string
  startTime: Date
  endTime: Date
  pattern: RecurrencePattern
  timezone?: string
  skipHolidays?: boolean
  holidayRegion?: string
  bufferMinutes?: number
  maxBookingAhead?: number
  notes?: string
  generateInstances?: boolean // 是否立即生成预约实例
  checkConflicts?: boolean // 是否检查冲突
}

export interface UpdateRecurringReservationRequest {
  title?: string
  description?: string
  pattern?: RecurrencePattern
  status?: RecurringReservationStatus
  skipHolidays?: boolean
  holidayRegion?: string
  bufferMinutes?: number
  maxBookingAhead?: number
  notes?: string
  applyToFuture?: boolean // 是否应用到未来的实例
}

export interface CreateExceptionRequest {
  recurringReservationId: string
  exceptionType: RecurringExceptionType
  originalStartTime: Date
  originalEndTime: Date
  newStartTime?: Date
  newEndTime?: Date
  reason?: string
}

export interface BatchOperationRequest {
  recurringReservationId: string
  operation: 'pause' | 'resume' | 'cancel' | 'delete'
  fromDate?: Date // 从哪个日期开始应用操作
  reason?: string
}

export interface RecurringReservationWithStats extends RecurringReservation {
  _count: {
    reservations: number
    exceptions: number
  }
  nextOccurrence?: Date
  statistics?: {
    totalOccurrences: number
    cancelledOccurrences: number
    modifiedOccurrences: number
    holidayOccurrences: number
  }
}

/**
 * 周期性预约服务类
 */
export class RecurringReservationService {

  /**
   * 创建周期性预约
   */
  static async createRecurringReservation(
    data: CreateRecurringReservationRequest
  ): Promise<RecurringReservation> {
    const {
      title,
      description,
      organizerId,
      roomId,
      startTime,
      endTime,
      pattern,
      timezone = 'UTC',
      skipHolidays = true,
      holidayRegion = 'CN',
      bufferMinutes = 15,
      maxBookingAhead = 365,
      notes,
      generateInstances = true,
      checkConflicts = true
    } = data

    // 验证时间
    if (endTime <= startTime) {
      throw new Error('结束时间必须晚于开始时间')
    }

    // 验证会议室可用性
    const room = await prisma.meetingRoom.findUnique({
      where: { id: roomId, status: 'AVAILABLE' }
    })

    if (!room) {
      throw new Error('会议室不存在或不可用')
    }

    // 转换周期性模式为RRule
    const rruleOptions = RecurrenceRuleEngine.patternToRRule(pattern)
    const recurrenceRule = RecurrenceRuleEngine.rruleToString(rruleOptions)

    // 确定结束条件
    let endCondition: 'NEVER' | 'DATE' | 'COUNT' = 'NEVER'
    let endAfterOccurrences: number | undefined
    let endDate: Date | undefined

    switch (pattern.endCondition) {
      case 'count':
        endCondition = 'COUNT'
        endAfterOccurrences = pattern.endCount
        break
      case 'date':
        endCondition = 'DATE'
        endDate = pattern.endDate
        break
    }

    // 检查冲突（如果需要）
    if (checkConflicts) {
      const tempRecurringReservation: RecurringReservation = {
        id: 'temp',
        title,
        description,
        organizerId,
        roomId,
        startTime,
        endTime,
        recurrenceRule,
        timezone,
        endCondition,
        endAfterOccurrences,
        endDate,
        status: 'ACTIVE',
        skipHolidays,
        holidayRegion,
        bufferMinutes,
        maxBookingAhead,
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const conflictResult = await RecurringReservationEngine.checkConflicts(
        tempRecurringReservation
      )

      if (conflictResult.hasConflict) {
        throw new Error(`检测到 ${conflictResult.conflicts.length} 个冲突: ${conflictResult.conflicts.map(c => c.details).join(', ')}`)
      }
    }

    // 创建周期性预约记录
    const recurringReservation = await prisma.recurringReservation.create({
      data: {
        title,
        description,
        organizerId,
        roomId,
        startTime,
        endTime,
        recurrenceRule,
        timezone,
        endCondition,
        endAfterOccurrences,
        endDate,
        status: 'ACTIVE',
        skipHolidays,
        holidayRegion,
        bufferMinutes,
        maxBookingAhead,
        notes
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true }
        },
        room: {
          select: { id: true, name: true, location: true }
        }
      }
    })

    // 生成预约实例（如果需要）
    if (generateInstances) {
      await this.generateReservationInstances(recurringReservation.id)
    }

    // 清除缓存
    await this.clearCache(roomId, organizerId)

    return recurringReservation
  }

  /**
   * 更新周期性预约
   */
  static async updateRecurringReservation(
    id: string,
    data: UpdateRecurringReservationRequest
  ): Promise<RecurringReservation> {
    const existing = await prisma.recurringReservation.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new Error('周期性预约不存在')
    }

    const updateData: Partial<RecurringReservation> = {}

    // 基础信息更新
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.skipHolidays !== undefined) updateData.skipHolidays = data.skipHolidays
    if (data.holidayRegion !== undefined) updateData.holidayRegion = data.holidayRegion
    if (data.bufferMinutes !== undefined) updateData.bufferMinutes = data.bufferMinutes
    if (data.maxBookingAhead !== undefined) updateData.maxBookingAhead = data.maxBookingAhead
    if (data.notes !== undefined) updateData.notes = data.notes

    // 更新周期性规则
    if (data.pattern) {
      const rruleOptions = RecurrenceRuleEngine.patternToRRule(data.pattern)
      updateData.recurrenceRule = RecurrenceRuleEngine.rruleToString(rruleOptions)

      // 更新结束条件
      switch (data.pattern.endCondition) {
        case 'count':
          updateData.endCondition = 'COUNT'
          updateData.endAfterOccurrences = data.pattern.endCount
          break
        case 'date':
          updateData.endCondition = 'DATE'
          updateData.endDate = data.pattern.endDate
          break
        case 'never':
          updateData.endCondition = 'NEVER'
          updateData.endAfterOccurrences = null
          updateData.endDate = null
          break
      }
    }

    const updated = await prisma.recurringReservation.update({
      where: { id },
      data: updateData
    })

    // 如果更新了周期性规则或状态，重新生成实例
    if (data.pattern || data.status) {
      if (data.applyToFuture) {
        await this.regenerateFutureInstances(id)
      } else {
        await this.generateReservationInstances(id)
      }
    }

    // 清除缓存
    await this.clearCache(existing.roomId, existing.organizerId)

    return updated
  }

  /**
   * 删除周期性预约
   */
  static async deleteRecurringReservation(
    id: string,
    deleteInstances: boolean = true
  ): Promise<void> {
    const existing = await prisma.recurringReservation.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new Error('周期性预约不存在')
    }

    // 删除相关例外
    await prisma.recurringException.deleteMany({
      where: { recurringReservationId: id }
    })

    // 删除相关预约实例
    if (deleteInstances) {
      await prisma.reservation.updateMany({
        where: { recurringReservationId: id },
        data: { status: 'CANCELED' }
      })
    }

    // 删除周期性预约记录
    await prisma.recurringReservation.delete({
      where: { id }
    })

    // 清除缓存
    await this.clearCache(existing.roomId, existing.organizerId)
  }

  /**
   * 获取周期性预约详情（包含统计信息）
   */
  static async getRecurringReservation(
    id: string,
    includeStats: boolean = true
  ): Promise<RecurringReservationWithStats | null> {
    const reservation = await prisma.recurringReservation.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true }
        },
        room: {
          select: { id: true, name: true, location: true, capacity: true }
        },
        _count: {
          select: {
            reservations: true,
            recurringExceptions: true
          }
        }
      }
    })

    if (!reservation || !includeStats) {
      return reservation as RecurringReservationWithStats | null
    }

    // 获取统计信息
    const statistics = await RecurringReservationEngine.getStatistics(id)

    // 获取下一次预约时间
    const nextOccurrence = statistics.nextOccurrence

    return {
      ...reservation,
      nextOccurrence,
      statistics
    }
  }

  /**
   * 获取周期性预约列表
   */
  static async getRecurringReservations(
    filters: {
      organizerId?: string
      roomId?: string
      status?: RecurringReservationStatus
      search?: string
      page?: number
      limit?: number
    } = {}
  ): Promise<{ items: RecurringReservation[]; total: number; page: number; limit: number }> {
    const {
      organizerId,
      roomId,
      status,
      search,
      page = 1,
      limit = 20
    } = filters

    const where: Prisma.RecurringReservationWhereInput = {}

    if (organizerId) where.organizerId = organizerId
    if (roomId) where.roomId = roomId
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.recurringReservation.findMany({
        where,
        include: {
          organizer: {
            select: { id: true, name: true, email: true }
          },
          room: {
            select: { id: true, name: true, location: true }
          },
          _count: {
            select: {
              reservations: true,
              recurringExceptions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.recurringReservation.count({ where })
    ])

    return {
      items,
      total,
      page,
      limit
    }
  }

  /**
   * 生成预约实例
   */
  static async generateReservationInstances(
    recurringReservationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<Reservation[]> {
    const recurringReservation = await prisma.recurringReservation.findUnique({
      where: { id: recurringReservationId }
    })

    if (!recurringReservation) {
      throw new Error('周期性预约不存在')
    }

    // 生成预约实例
    const occurrences = await RecurringReservationEngine.generateOccurrences(
      recurringReservation,
      dateRange
    )

    const reservations: Reservation[] = []

    for (const occurrence of occurrences) {
      // 跳过已取消的实例
      if (occurrence.exceptionType === 'CANCELLED') {
        continue
      }

      // 检查是否已存在实例
      const existing = await prisma.reservation.findFirst({
        where: {
          recurringReservationId,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime
        }
      })

      if (!existing) {
        const reservation = await prisma.reservation.create({
          data: {
            title: recurringReservation.title,
            description: recurringReservation.description,
            startTime: occurrence.startTime,
            endTime: occurrence.endTime,
            organizerId: recurringReservation.organizerId,
            roomId: recurringReservation.roomId,
            recurringReservationId,
            isException: occurrence.hasException,
            originalStartTime: occurrence.originalStartTime,
            status: 'CONFIRMED'
          }
        })

        reservations.push(reservation)
      }
    }

    return reservations
  }

  /**
   * 创建例外
   */
  static async createException(data: CreateExceptionRequest): Promise<RecurringException> {
    const { recurringReservationId, exceptionType, originalStartTime, originalEndTime, newStartTime, newEndTime, reason } = data

    // 验证周期性预约存在
    const recurringReservation = await prisma.recurringReservation.findUnique({
      where: { id: recurringReservationId }
    })

    if (!recurringReservation) {
      throw new Error('周期性预约不存在')
    }

    // 创建例外
    const exception = await RecurringReservationEngine.createOrUpdateException(
      recurringReservationId,
      exceptionType,
      originalStartTime,
      originalEndTime,
      newStartTime,
      newEndTime,
      reason
    )

    // 更新相关的预约实例
    if (exceptionType === 'CANCELLED') {
      await prisma.reservation.updateMany({
        where: {
          recurringReservationId,
          startTime: originalStartTime,
          endTime: originalEndTime
        },
        data: {
          status: 'CANCELED',
          isException: true
        }
      })
    } else if (exceptionType === 'MODIFIED' && newStartTime && newEndTime) {
      await prisma.reservation.updateMany({
        where: {
          recurringReservationId,
          startTime: originalStartTime,
          endTime: originalEndTime
        },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          isException: true,
          originalStartTime
        }
      })
    }

    // 清除缓存
    await this.clearCache(recurringReservation.roomId, recurringReservation.organizerId)

    return exception
  }

  /**
   * 批量操作
   */
  static async batchOperation(data: BatchOperationRequest): Promise<{ affected: number }> {
    const { recurringReservationId, operation, fromDate, reason } = data

    const recurringReservation = await prisma.recurringReservation.findUnique({
      where: { id: recurringReservationId }
    })

    if (!recurringReservation) {
      throw new Error('周期性预约不存在')
    }

    let affected = 0

    switch (operation) {
      case 'pause':
        await prisma.recurringReservation.update({
          where: { id: recurringReservationId },
          data: { status: 'PAUSED' }
        })
        affected = 1
        break

      case 'resume':
        await prisma.recurringReservation.update({
          where: { id: recurringReservationId },
          data: { status: 'ACTIVE' }
        })
        affected = 1
        break

      case 'cancel':
        // 取消从指定日期开始的所有实例
        if (fromDate) {
          const result = await prisma.reservation.updateMany({
            where: {
              recurringReservationId,
              startTime: { gte: fromDate },
              status: { not: 'CANCELED' }
            },
            data: { status: 'CANCELED' }
          })
          affected = result.count
        } else {
          // 取消整个周期性预约
          await this.deleteRecurringReservation(recurringReservationId, true)
          affected = 1
        }
        break

      case 'delete':
        await this.deleteRecurringReservation(recurringReservationId, true)
        affected = 1
        break
    }

    // 清除缓存
    await this.clearCache(recurringReservation.roomId, recurringReservation.organizerId)

    return { affected }
  }

  /**
   * 重新生成未来的实例
   */
  private static async regenerateFutureInstances(id: string): Promise<void> {
    const recurringReservation = await prisma.recurringReservation.findUnique({
      where: { id }
    })

    if (!recurringReservation) return

    // 删除未来的实例
    const now = new Date()
    await prisma.reservation.deleteMany({
      where: {
        recurringReservationId: id,
        startTime: { gt: now }
      }
    })

    // 重新生成实例
    await this.generateReservationInstances(id, {
      startDate: now,
      endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 未来90天
    })
  }

  /**
   * 清除缓存
   */
  private static async clearCache(roomId: string, organizerId: string): Promise<void> {
    const keys = [
      `recurring_reservations:room:${roomId}`,
      `recurring_reservations:organizer:${organizerId}`,
      `reservations:room:${roomId}`,
      `reservations:organizer:${organizerId}`
    ]

    await Promise.all(keys.map(key => cacheService.del(key)))
  }
}

export default RecurringReservationService