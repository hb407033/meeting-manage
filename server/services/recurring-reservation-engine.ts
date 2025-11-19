/**
 * 周期性预约引擎
 * 基于RFC 5545标准实现周期性预约的日期序列生成、例外处理和节假日跳过
 */

import { RRule } from 'rrule'
import {
  RecurrencePattern,
  RRuleOptions,
  RecurrenceRuleEngine,
  WeekDay
} from '../types/recurrence'
import { Holiday, RecurringException, RecurringReservation } from '@prisma/client'
import prisma  from './database'

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface OccurrenceInstance {
  id?: string
  startTime: Date
  endTime: Date
  isHoliday: boolean
  hasException: boolean
  exceptionType?: 'CANCELLED' | 'MODIFIED' | 'MOVED'
  originalStartTime?: Date
  newStartTime?: Date
  newEndTime?: Date
  reason?: string
}

export interface GenerateOccurrencesOptions {
  maxOccurrences?: number    // 最大生成实例数量
  includeExceptions?: boolean // 是否包含例外实例
  skipHolidays?: boolean    // 是否跳过节假日
  bufferMinutes?: number    // 缓冲时间（分钟）
}

export interface ConflictCheckResult {
  hasConflict: boolean
  conflicts: Array<{
    occurrence: OccurrenceInstance
    conflictType: 'time_overlap' | 'holiday'
    details: string
  }>
  alternatives: DateRange[]
}

/**
 * 周期性预约引擎
 */
export class RecurringReservationEngine {

  /**
   * 基于周期性配置生成日期序列
   */
  static generateDateSeries(
    pattern: RecurrencePattern,
    baseStartTime: Date,
    baseEndTime: Date,
    options: GenerateOccurrencesOptions = {}
  ): DateRange[] {
    const {
      maxOccurrences = 100,
      skipHolidays = pattern.skipHolidays || true,
      bufferMinutes = 15
    } = options

    // 转换为RRuleOptions
    const rruleOptions = RecurrenceRuleEngine.patternToRRule(pattern)

    // 创建RRule实例
    const rule = new RRule({
      ...rruleOptions,
      dtstart: baseStartTime
    })

    // 生成日期序列
    const dateRanges: DateRange[] = []
    const duration = baseEndTime.getTime() - baseStartTime.getTime()
    const processedDates = new Set<string>() // 避免重复

    rule.all().forEach((date: Date) => {
      // 检查最大数量限制
      if (dateRanges.length >= maxOccurrences) {
        return
      }

      // 生成结束时间
      const endTime = new Date(date.getTime() + duration)

      // 添加缓冲时间
      if (bufferMinutes > 0) {
        date = new Date(date.getTime() - bufferMinutes * 60 * 1000)
      }

      const dateKey = date.toISOString().split('T')[0]

      // 避免重复日期
      if (processedDates.has(dateKey)) {
        return
      }

      processedDates.add(dateKey)

      dateRanges.push({
        startDate: date,
        endDate: endTime
      })
    })

    return dateRanges
  }

  /**
   * 生成周期性预约的具体实例（考虑例外和节假日）
   */
  static async generateOccurrences(
    recurringReservation: RecurringReservation,
    dateRange?: DateRange,
    options: GenerateOccurrencesOptions = {}
  ): Promise<OccurrenceInstance[]> {
    const {
      maxOccurrences = 100,
      includeExceptions = true,
      skipHolidays = recurringReservation.skipHolidays,
      bufferMinutes = recurringReservation.bufferMinutes
    } = options

    // 解析RRule
    const rruleOptions = RecurrenceRuleEngine.parseRRuleString(recurringReservation.recurrenceRule)
    const rule = new RRule({
      ...rruleOptions,
      dtstart: recurringReservation.startTime
    })

    // 获取时间范围
    const start = dateRange?.startDate || new Date()
    const end = dateRange?.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 默认90天

    // 生成基础日期序列
    const duration = recurringReservation.endTime.getTime() - recurringReservation.startTime.getTime()
    const instances: OccurrenceInstance[] = []
    let count = 0

    // 查询该周期性预约的所有例外
    const exceptions = includeExceptions
      ? await prisma.recurringException.findMany({
          where: { recurringReservationId: recurringReservation.id },
          orderBy: { originalStartTime: 'asc' }
        })
      : []

    // 查询节假日
    const holidays = skipHolidays
      ? await this.getHolidaysInRange(start, end, recurringReservation.holidayRegion)
      : []

    // 创建例外日期映射
    const exceptionMap = new Map<string, RecurringException>()
    exceptions.forEach(exception => {
      const key = exception.originalStartTime.toISOString()
      exceptionMap.set(key, exception)
    })

    // 创建节假日映射
    const holidayMap = new Map<string, Holiday>()
    holidays.forEach(holiday => {
      const key = holiday.date.toISOString().split('T')[0]
      holidayMap.set(key, holiday)
    })

    // 生成实例
    rule.between(start, end, true).forEach((date: Date) => {
      if (count >= maxOccurrences) return

      const endTime = new Date(date.getTime() + duration)
      const dateKey = date.toISOString().split('T')[0]

      // 检查是否有例外
      const exception = exceptionMap.get(date.toISOString())
      let hasException = !!exception
      let instanceStartTime = date
      let instanceEndTime = endTime

      // 处理例外
      if (exception) {
        switch (exception.exceptionType) {
          case 'CANCELLED':
            // 取消的实例不生成，但记录例外信息
            instances.push({
              startTime: date,
              endTime,
              isHoliday: holidayMap.has(dateKey),
              hasException: true,
              exceptionType: 'CANCELLED',
              reason: exception.reason
            })
            count++
            return // 不生成正常实例

          case 'MODIFIED':
          case 'MOVED':
            // 修改时间的实例
            instanceStartTime = exception.newStartTime || date
            instanceEndTime = exception.newEndTime || endTime
            break
        }
      }

      // 添加缓冲时间
      if (bufferMinutes > 0) {
        instanceStartTime = new Date(instanceStartTime.getTime() - bufferMinutes * 60 * 1000)
        instanceEndTime = new Date(instanceEndTime.getTime() - bufferMinutes * 60 * 1000)
      }

      // 检查是否跳过节假日
      const isHoliday = holidayMap.has(dateKey)
      const shouldSkipHoliday = skipHolidays && isHoliday

      if (!shouldSkipHoliday) {
        instances.push({
          startTime: instanceStartTime,
          endTime: instanceEndTime,
          isHoliday,
          hasException,
          exceptionType: exception?.exceptionType,
          originalStartTime: exception ? date : undefined,
          newStartTime: exception?.newStartTime || undefined,
          newEndTime: exception?.newEndTime || undefined,
          reason: exception?.reason
        })
        count++
      }
    })

    return instances
  }

  /**
   * 检查周期性预约的冲突
   */
  static async checkConflicts(
    recurringReservation: RecurringReservation,
    dateRange?: DateRange,
    options: GenerateOccurrencesOptions = {}
  ): Promise<ConflictCheckResult> {
    const occurrences = await this.generateOccurrences(
      recurringReservation,
      dateRange,
      options
    )

    const conflicts: ConflictCheckResult['conflicts'] = []

    // 检查每个实例的冲突
    for (const occurrence of occurrences) {
      // 跳过已取消的实例
      if (occurrence.exceptionType === 'CANCELLED') {
        continue
      }

      // 检查节假日冲突
      if (occurrence.isHoliday && !recurringReservation.skipHolidays) {
        conflicts.push({
          occurrence,
          conflictType: 'holiday',
          details: '预约时间与节假日冲突'
        })
      }

      // 检查现有预约的时间重叠冲突
      const existingReservations = await prisma.reservation.findMany({
        where: {
          roomId: recurringReservation.roomId,
          status: { not: 'CANCELED' },
          OR: [
            {
              AND: [
                { startTime: { lt: occurrence.endTime } },
                { endTime: { gt: occurrence.startTime } }
              ]
            }
          ]
        }
      })

      if (existingReservations.length > 0) {
        conflicts.push({
          occurrence,
          conflictType: 'time_overlap',
          details: `与现有预约"${existingReservations[0].title}"时间重叠`
        })
      }
    }

    // 生成建议的替代时间
    const alternatives = await this.generateAlternativeTimeSlots(
      recurringReservation,
      dateRange,
      conflicts.length
    )

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      alternatives
    }
  }

  /**
   * 获取指定时间范围内的节假日
   */
  private static async getHolidaysInRange(
    startDate: Date,
    endDate: Date,
    region?: string
  ): Promise<Holiday[]> {
    return await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        region: region || 'CN',
        isActive: true
      },
      orderBy: { date: 'asc' }
    })
  }

  /**
   * 生成建议的替代时间
   */
  private static async generateAlternativeTimeSlots(
    recurringReservation: RecurringReservation,
    dateRange?: DateRange,
    conflictCount: number = 0
  ): Promise<DateRange[]> {
    const alternatives: DateRange[] = []

    if (conflictCount === 0) {
      return alternatives
    }

    const start = dateRange?.startDate || new Date()
    const end = dateRange?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // 获取会议室的工作时间规则
    const room = await prisma.meetingRoom.findUnique({
      where: { id: recurringReservation.roomId }
    })

    const workStartHour = 9
    const workEndHour = 18
    const meetingDuration = recurringReservation.endTime.getTime() - recurringReservation.startTime.getTime()

    // 生成建议时间段（简单策略：在非冲突时间段寻找）
    for (let i = 0; i < 5 && alternatives.length < 3; i++) {
      const candidateDate = new Date(start)
      candidateDate.setDate(candidateDate.getDate() + i * 2) // 隔天

      // 设置候选时间为工作时间段
      candidateDate.setHours(workStartHour, 0, 0, 0)

      const candidateEnd = new Date(candidateDate.getTime() + meetingDuration)

      // 检查时间段是否可用
      const isAvailable = await this.isTimeSlotAvailable(
        recurringReservation.roomId,
        candidateDate,
        candidateEnd,
        recurringReservation.id // 排除自己的预约
      )

      if (isAvailable) {
        alternatives.push({
          startDate: candidateDate,
          endDate: candidateEnd
        })
      }
    }

    return alternatives
  }

  /**
   * 检查时间段是否可用
   */
  private static async isTimeSlotAvailable(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string
  ): Promise<boolean> {
    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: { not: 'CANCELED' },
        id: { not: excludeReservationId },
        OR: [
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } }
            ]
          }
        ]
      }
    })

    return !conflictingReservation
  }

  /**
   * 创建或更新例外
   */
  static async createOrUpdateException(
    recurringReservationId: string,
    exceptionType: 'CANCELLED' | 'MODIFIED' | 'MOVED',
    originalStartTime: Date,
    originalEndTime: Date,
    newStartTime?: Date,
    newEndTime?: Date,
    reason?: string
  ): Promise<RecurringException> {
    // 检查是否已存在例外
    const existingException = await prisma.recurringException.findFirst({
      where: {
        recurringReservationId,
        originalStartTime
      }
    })

    if (existingException) {
      // 更新现有例外
      return await prisma.recurringException.update({
        where: { id: existingException.id },
        data: {
          exceptionType,
          originalEndTime,
          newStartTime,
          newEndTime,
          reason
        }
      })
    } else {
      // 创建新例外
      return await prisma.recurringException.create({
        data: {
          recurringReservationId,
          exceptionType,
          originalStartTime,
          originalEndTime,
          newStartTime,
          newEndTime,
          reason
        }
      })
    }
  }

  /**
   * 删除例外
   */
  static async removeException(
    recurringReservationId: string,
    originalStartTime: Date
  ): Promise<void> {
    await prisma.recurringException.deleteMany({
      where: {
        recurringReservationId,
        originalStartTime
      }
    })
  }

  /**
   * 获取周期性预约的统计信息
   */
  static async getStatistics(
    recurringReservationId: string,
    dateRange?: DateRange
  ): Promise<{
    totalOccurrences: number
    cancelledOccurrences: number
    modifiedOccurrences: number
    holidayOccurrences: number
    nextOccurrence?: Date
  }> {
    const recurringReservation = await prisma.recurringReservation.findUnique({
      where: { id: recurringReservationId }
    })

    if (!recurringReservation) {
      throw new Error('周期性预约不存在')
    }

    const occurrences = await this.generateOccurrences(
      recurringReservation,
      dateRange,
      { includeExceptions: true }
    )

    const stats = {
      totalOccurrences: occurrences.length,
      cancelledOccurrences: 0,
      modifiedOccurrences: 0,
      holidayOccurrences: 0,
      nextOccurrence: undefined as Date | undefined
    }

    const now = new Date()

    for (const occurrence of occurrences) {
      if (occurrence.exceptionType === 'CANCELLED') {
        stats.cancelledOccurrences++
      } else if (occurrence.exceptionType === 'MODIFIED' || occurrence.exceptionType === 'MOVED') {
        stats.modifiedOccurrences++
      }

      if (occurrence.isHoliday) {
        stats.holidayOccurrences++
      }

      // 找到下一个未取消的预约
      if (!stats.nextOccurrence &&
          occurrence.startTime > now &&
          occurrence.exceptionType !== 'CANCELLED') {
        stats.nextOccurrence = occurrence.startTime
      }
    }

    return stats
  }
}

export default RecurringReservationEngine