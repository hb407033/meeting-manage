/**
 * 周期性规则类型定义单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  RecurrenceRuleEngine,
  RecurrencePatternSchema,
  RecurrencePattern,
  WeekDay,
  RecurrenceFrequency
} from '~/server/types/recurrence'

describe('RecurrenceRuleEngine', () => {
  describe('patternToRRule', () => {
    it('应该将每日模式转换为RRule选项', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 2,
        endCondition: 'count',
        endCount: 10,
        skipHolidays: false
      }

      const rruleOptions = RecurrenceRuleEngine.patternToRRule(pattern)

      expect(rruleOptions.freq).toBe(RecurrenceFrequency.DAILY)
      expect(rruleOptions.interval).toBe(2)
      expect(rruleOptions.count).toBe(10)
    })

    it('应该将每周模式转换为RRule选项', () => {
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        weekDays: ['MO', 'WE', 'FR'],
        endCondition: 'never',
        skipHolidays: true
      }

      const rruleOptions = RecurrenceRuleEngine.patternToRRule(pattern)

      expect(rruleOptions.freq).toBe(RecurrenceFrequency.WEEKLY)
      expect(rruleOptions.interval).toBe(1)
      expect(rruleOptions.byDay).toEqual(['MO', 'WE', 'FR'])
    })

    it('应该将每月按日期模式转换为RRule选项', () => {
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        monthlyPattern: 'date',
        monthlyDate: 15,
        endCondition: 'date',
        endDate: new Date('2024-12-31')
      }

      const rruleOptions = RecurrenceRuleEngine.patternToRRule(pattern)

      expect(rruleOptions.freq).toBe(RecurrenceFrequency.MONTHLY)
      expect(rruleOptions.interval).toBe(1)
      expect(rruleOptions.byMonthDay).toEqual([15])
    })

    it('应该将每月按星期模式转换为RRule选项', () => {
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        monthlyPattern: 'weekday',
        monthlyWeek: 2,
        monthlyWeekDay: 'TU',
        endCondition: 'date',
        endDate: new Date('2024-12-31')
      }

      const rruleOptions = RecurrenceRuleEngine.patternToRRule(pattern)

      expect(rruleOptions.freq).toBe(RecurrenceFrequency.MONTHLY)
      expect(rruleOptions.interval).toBe(1)
      expect(rruleOptions.byDay).toEqual(['TU'])
      expect(rruleOptions.bySetPos).toEqual([2])
    })
  })

  describe('rruleToString', () => {
    it('应该生成正确的RRule字符串', () => {
      const options = {
        freq: RecurrenceFrequency.WEEKLY,
        interval: 2,
        byDay: ['MO', 'WE', 'FR'],
        count: 10
      }

      const rruleString = RecurrenceEngine.rruleToString(options)

      expect(rruleString).toContain('RRULE:')
      expect(rruleString).toContain('FREQ=WEEKLY')
      expect(rruleString).toContain('INTERVAL=2')
      expect(rruleString).toContain('BYDAY=MO,WE,FR')
      expect(rruleString).toContain('COUNT=10')
    })
  })

  describe('validateRRuleString', () => {
    it('应该验证有效的RRule字符串', () => {
      const validRRule = 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO'
      expect(RecurrenceRuleEngine.validateRRuleString(validRRule)).toBe(true)
    })

    it('应该拒绝无效的RRule字符串', () => {
      const invalidRRule = 'INVALID_RRULE'
      expect(RecurrenceRuleEngine.validateRRuleString(invalidRRule)).toBe(false)
    })

    it('应该拒绝不包含RRULE前缀的字符串', () => {
      const incompleteRRule = 'FREQ=WEEKLY;INTERVAL=1'
      expect(RecurrenceRuleEngine.validateRRuleString(incompleteRRule)).toBe(false)
    })
  })

  describe('getCommonPatterns', () => {
    it('应该返回常见的周期性模式', () => {
      const patterns = RecurrenceRuleEngine.getCommonPatterns()

      expect(patterns).toHaveLength(5)
      expect(patterns[0]).toEqual({
        name: 'daily',
        description: '每天',
        pattern: {
          type: 'daily',
          interval: 1,
          endCondition: 'never'
        }
      })
      expect(patterns[1]).toEqual({
        name: 'weekly',
        description: '每周',
        pattern: {
          type: 'weekly',
          interval: 1,
          weekDays: [WeekDay.MO, WeekDay.TU, WeekDay.WE, WeekDay.TH, WeekDay.FR],
          endCondition: 'never'
        }
      })
    })
  })
})

describe('RecurrencePatternSchema', () => {
  it('应该验证有效的周期性模式', () => {
    const validPattern = {
      type: 'weekly',
      interval: 2,
      weekDays: ['MO', 'TU', 'WE', 'TH', 'FR'],
      endCondition: 'count',
      endCount: 10,
      skipHolidays: true,
      holidayRegion: 'CN'
    }

    const result = RecurrencePatternSchema.safeParse(validPattern)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的周期性模式', () => {
    const invalidPattern = {
      type: 'invalid' as any,
      interval: -1,
      endCondition: 'invalid' as any
    }

    const result = RecurrencePatternSchema.safeParse(invalidPattern)
    expect(result.success).toBe(false)
  })

  it('应该验证结束条件的完整性', () => {
    const invalidEndCondition = {
      type: 'daily',
      interval: 1,
      endCondition: 'date' as 'date',
      // 缺少 endDate
      skipHolidays: true
    }

    const result = RecurrencePatternSchema.safeParse(invalidEndCondition)
    expect(result.success).toBe(false)
  })

  it('应该验证周模式的完整性', () => {
    const invalidWeeklyPattern = {
      type: 'weekly',
      interval: 1,
      weekDays: [], // 空的weekDays
      endCondition: 'never'
    }

    const result = RecurrencePatternSchema.safeParse(invalidWeeklyPattern)
    expect(result.success).toBe(false)
  })

  it('应该验证月度模式的完整性', () => {
    const invalidMonthlyPattern = {
      type: 'monthly',
      interval: 1,
      monthlyPattern: 'date',
      // 缺少monthlyDate
      endCondition: 'never'
    }

    const result = RecurrencePatternSchema.safeParse(invalidMonthlyPattern)
    expect(result.success).toBe(false)
  })
})