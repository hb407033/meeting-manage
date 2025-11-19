/**
 * RFC 5545 rrule 规则的类型定义和工具函数
 * 支持周期性预约的重复规则解析和生成
 */

import { z } from 'zod'

// RRule 库支持的频率（数字常量）
export enum RecurrenceFrequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
  HOURLY = 4,
  MINUTELY = 5,
  SECONDLY = 6
}

// 星期几映射
export enum WeekDay {
  SU = 'SU', // Sunday
  MO = 'MO', // Monday
  TU = 'TU', // Tuesday
  WE = 'WE', // Wednesday
  TH = 'TH', // Thursday
  FR = 'FR', // Friday
  SA = 'SA'  // Saturday
}

// RRule 参数接口
export interface RRuleOptions {
  freq: RecurrenceFrequency        // 频率（必需）
  interval?: number               // 间隔，默认1
  count?: number                  // 重复次数
  until?: Date                    // 结束日期
  bySecond?: number[]             // 按秒
  byMinute?: number[]             // 按分钟
  byHour?: number[]               // 按小时
  byDay?: WeekDay[]               // 按星期几
  byMonthDay?: number[]           // 按月份中的日期
  byYearDay?: number[]            // 按年份中的日期
  byWeekNo?: number[]             // 按周数
  byMonth?: number[]              // 按月份
  bySetPos?: number[]             // 按位置
  wkst?: WeekDay                  // 一周的开始日期，默认MO
}

// 周期性预约配置接口（用户友好的简化版本）
export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number                           // 间隔天数/周数/月数/年数
  weekDays?: WeekDay[]                      // 每周几（仅weekly需要）
  monthlyPattern?: 'date' | 'weekday'       // 月度模式：按日期或按星期
  monthlyDate?: number                      // 每月第几天（1-31）
  monthlyWeek?: number                      // 每月第几周（1-5）
  monthlyWeekDay?: WeekDay                  // 每月星期几
  endCondition: 'never' | 'date' | 'count'  // 结束条件
  endDate?: Date                            // 结束日期
  endCount?: number                         // 重复次数
  skipHolidays?: boolean                    // 是否跳过节假日
  holidayRegion?: string                    // 节假日地区
}

// RRule 字符串验证 Schema
export const RRuleStringSchema = z.string().regex(/^RRULE:/i, {
  message: 'RRule 字符串必须以 RRULE: 开头'
})

// 简化的周期性模式验证 Schema
export const RecurrencePatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  interval: z.number().int().min(1).max(999),
  weekDays: z.array(z.enum(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'])).optional(),
  monthlyPattern: z.enum(['date', 'weekday']).optional(),
  monthlyDate: z.number().int().min(1).max(31).optional(),
  monthlyWeek: z.number().int().min(1).max(5).optional(),
  monthlyWeekDay: z.enum(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']).optional(),
  endCondition: z.enum(['never', 'date', 'count']),
  endDate: z.date().optional(),
  endCount: z.number().int().min(1).max(999).optional(),
  skipHolidays: z.boolean().default(true),
  holidayRegion: z.string().optional()
}).refine((data) => {
  // 验证结束条件的完整性
  if (data.endCondition === 'date' && !data.endDate) {
    return false
  }
  if (data.endCondition === 'count' && !data.endCount) {
    return false
  }

  // 验证周模式的完整性
  if (data.type === 'weekly' && (!data.weekDays || data.weekDays.length === 0)) {
    return false
  }

  // 验证月模式的完整性
  if (data.type === 'monthly') {
    if (data.monthlyPattern === 'date' && !data.monthlyDate) {
      return false
    }
    if (data.monthlyPattern === 'weekday' && (!data.monthlyWeek || !data.monthlyWeekDay)) {
      return false
    }
  }

  return true
}, {
  message: '周期性模式配置不完整或无效',
  path: ['root']
})

/**
 * 周期性规则工具类
 */
export class RecurrenceRuleEngine {

  /**
   * 将简化的 RecurrencePattern 转换为标准的 RRuleOptions
   */
  static patternToRRule(pattern: RecurrencePattern): RRuleOptions {
    const baseOptions: Partial<RRuleOptions> = {
      interval: pattern.interval,
      wkst: WeekDay.MO // 默认周一开始
    }

    // 设置频率
    switch (pattern.type) {
      case 'daily':
        baseOptions.freq = RecurrenceFrequency.DAILY
        break
      case 'weekly':
        baseOptions.freq = RecurrenceFrequency.WEEKLY
        baseOptions.byDay = pattern.weekDays
        break
      case 'monthly':
        baseOptions.freq = RecurrenceFrequency.MONTHLY
        if (pattern.monthlyPattern === 'date' && pattern.monthlyDate) {
          baseOptions.byMonthDay = [pattern.monthlyDate]
        } else if (pattern.monthlyPattern === 'weekday' && pattern.monthlyWeek && pattern.monthlyWeekDay) {
          // 例如：每月第二个星期二 -> BYSETPOS=2 BYDAY=TU
          baseOptions.byDay = [pattern.monthlyWeekDay]
          baseOptions.bySetPos = [pattern.monthlyWeek]
        }
        break
      case 'yearly':
        baseOptions.freq = RecurrenceFrequency.YEARLY
        break
      default:
        baseOptions.freq = RecurrenceFrequency.DAILY
    }

    // 设置结束条件
    switch (pattern.endCondition) {
      case 'count':
        if (pattern.endCount) {
          baseOptions.count = pattern.endCount
        }
        break
      case 'date':
        if (pattern.endDate) {
          baseOptions.until = pattern.endDate
        }
        break
      // 'never' 情况下不设置结束条件
    }

    return baseOptions as RRuleOptions
  }

  /**
   * 将 RRuleOptions 转换为 RFC 5545 rrule 字符串
   */
  static rruleToString(options: RRuleOptions): string {
    const parts: string[] = ['RRULE']

    // 频率（必需）
    parts.push(`FREQ=${options.freq}`)

    // 间隔
    if (options.interval && options.interval !== 1) {
      parts.push(`INTERVAL=${options.interval}`)
    }

    // 重复次数
    if (options.count) {
      parts.push(`COUNT=${options.count}`)
    }

    // 结束日期
    if (options.until) {
      const untilDate = this.formatDate(options.until)
      parts.push(`UNTIL=${untilDate}`)
    }

    // 按秒
    if (options.bySecond && options.bySecond.length > 0) {
      parts.push(`BYSECOND=${options.bySecond.join(',')}`)
    }

    // 按分钟
    if (options.byMinute && options.byMinute.length > 0) {
      parts.push(`BYMINUTE=${options.byMinute.join(',')}`)
    }

    // 按小时
    if (options.byHour && options.byHour.length > 0) {
      parts.push(`BYHOUR=${options.byHour.join(',')}`)
    }

    // 按星期几
    if (options.byDay && options.byDay.length > 0) {
      parts.push(`BYDAY=${options.byDay.join(',')}`)
    }

    // 按月份中的日期
    if (options.byMonthDay && options.byMonthDay.length > 0) {
      parts.push(`BYMONTHDAY=${options.byMonthDay.join(',')}`)
    }

    // 按年份中的日期
    if (options.byYearDay && options.byYearDay.length > 0) {
      parts.push(`BYYEARDAY=${options.byYearDay.join(',')}`)
    }

    // 按周数
    if (options.byWeekNo && options.byWeekNo.length > 0) {
      parts.push(`BYWEEKNO=${options.byWeekNo.join(',')}`)
    }

    // 按月份
    if (options.byMonth && options.byMonth.length > 0) {
      parts.push(`BYMONTH=${options.byMonth.join(',')}`)
    }

    // 按位置
    if (options.bySetPos && options.bySetPos.length > 0) {
      parts.push(`BYSETPOS=${options.bySetPos.join(',')}`)
    }

    // 一周开始
    if (options.wkst && options.wkst !== WeekDay.MO) {
      parts.push(`WKST=${options.wkst}`)
    }

    return parts.join(':')
  }

  /**
   * 解析 RFC 5545 rrule 字符串为 RRuleOptions
   */
  static parseRRuleString(rruleString: string): RRuleOptions {
    if (!rruleString.startsWith('RRULE:')) {
      throw new Error('Invalid RRULE string format')
    }

    const content = rruleString.substring(6) // 移除 'RRULE:' 前缀
    const parts = content.split(';')
    const options: Partial<RRuleOptions> = {}

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (!key || !value) continue

      switch (key.toUpperCase()) {
        case 'FREQ':
          options.freq = value as RecurrenceFrequency
          break
        case 'INTERVAL':
          options.interval = parseInt(value, 10)
          break
        case 'COUNT':
          options.count = parseInt(value, 10)
          break
        case 'UNTIL':
          options.until = this.parseDate(value)
          break
        case 'BYSECOND':
          options.bySecond = value.split(',').map(v => parseInt(v, 10))
          break
        case 'BYMINUTE':
          options.byMinute = value.split(',').map(v => parseInt(v, 10))
          break
        case 'BYHOUR':
          options.byHour = value.split(',').map(v => parseInt(v, 10))
          break
        case 'BYDAY':
          options.byDay = value.split(',') as WeekDay[]
          break
        case 'BYMONTHDAY':
          options.byMonthDay = value.split(',').map(v => parseInt(v, 10))
          break
        case 'BYYEARDAY':
          options.byYearDay = value.split(',').map(v => parseInt(v, 10))
          break
        case 'BYWEEKNO':
          options.byWeekNo = value.split(',').map(v => parseInt(v, 10))
          break
        case 'BYMONTH':
          options.byMonth = value.split(',').map(v => parseInt(v, 10))
          break
        case 'BYSETPOS':
          options.bySetPos = value.split(',').map(v => parseInt(v, 10))
          break
        case 'WKST':
          options.wkst = value as WeekDay
          break
      }
    }

    if (!options.freq) {
      throw new Error('FREQ is required in RRULE string')
    }

    return options as RRuleOptions
  }

  /**
   * 格式化日期为 YYYYMMDDTHHMMSSZ 格式
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
  }

  /**
   * 解析 YYYYMMDDTHHMMSSZ 格式的日期
   */
  private static parseDate(dateString: string): Date {
    // 移除末尾的 Z
    const cleanDate = dateString.replace(/Z$/, '')

    // 解析 YYYYMMDDTHHMMSS 格式
    const year = parseInt(cleanDate.substring(0, 4), 10)
    const month = parseInt(cleanDate.substring(4, 6), 10) - 1 // 月份从0开始
    const day = parseInt(cleanDate.substring(6, 8), 10)
    const hours = parseInt(cleanDate.substring(9, 11), 10)
    const minutes = parseInt(cleanDate.substring(11, 13), 10)
    const seconds = parseInt(cleanDate.substring(13, 15), 10)

    return new Date(Date.UTC(year, month, day, hours, minutes, seconds))
  }

  /**
   * 验证 rrule 字符串是否有效
   */
  static validateRRuleString(rruleString: string): boolean {
    try {
      this.parseRRuleString(rruleString)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取常见的周期性模式预设
   */
  static getCommonPatterns(): Array<{
    name: string
    description: string
    pattern: RecurrencePattern
  }> {
    return [
      {
        name: 'daily',
        description: '每天',
        pattern: {
          type: 'daily',
          interval: 1,
          endCondition: 'never'
        }
      },
      {
        name: 'weekly',
        description: '每周',
        pattern: {
          type: 'weekly',
          interval: 1,
          weekDays: [WeekDay.MO, WeekDay.TU, WeekDay.WE, WeekDay.TH, WeekDay.FR],
          endCondition: 'never'
        }
      },
      {
        name: 'biweekly',
        description: '每两周',
        pattern: {
          type: 'weekly',
          interval: 2,
          weekDays: [WeekDay.MO, WeekDay.TU, WeekDay.WE, WeekDay.TH, WeekDay.FR],
          endCondition: 'never'
        }
      },
      {
        name: 'monthly',
        description: '每月',
        pattern: {
          type: 'monthly',
          interval: 1,
          monthlyPattern: 'date',
          monthlyDate: 1,
          endCondition: 'never'
        }
      },
      {
        name: 'quarterly',
        description: '每季度',
        pattern: {
          type: 'monthly',
          interval: 3,
          monthlyPattern: 'date',
          monthlyDate: 1,
          endCondition: 'never'
        }
      }
    ]
  }
}

export default RecurrenceRuleEngine