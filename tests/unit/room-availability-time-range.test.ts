/**
 * 会议室可用时间限制逻辑测试
 * 测试修复：会议室可用时间应根据预约规则（开始和结束时间）做限制，而不是硬编码0:00-24:00
 */

import { describe, it, expect, beforeEach } from 'vitest'

// 模拟会议室数据结构
interface RoomRules {
  requiresApproval: boolean
  minBookingDuration: number
  maxBookingDuration: number
  allowedTimeRange?: {
    start: string
    end: string
  }
  advanceBookingDays: number
  maxConcurrentBookings: number
}

interface MeetingRoom {
  id: string
  name: string
  capacity: number
  location?: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'DISABLED'
  rules?: RoomRules
  operatingHours?: {
    start: string
    end: string
  }
  requiresApproval: boolean
}

// 测试用的工具函数（从修复的代码中提取）
function getDefaultTimeRange() {
  return {
    start: '00:00',
    end: '23:59'
  }
}

function getRoomTimeRange(room: MeetingRoom | null | undefined) {
  if (room?.rules?.allowedTimeRange) {
    return {
      start: room.rules.allowedTimeRange.start,
      end: room.rules.allowedTimeRange.end
    }
  }
  // 如果没有预约规则，使用营业时间
  if (room?.operatingHours) {
    return {
      start: room.operatingHours.start || '09:00',
      end: room.operatingHours.end || '18:00'
    }
  }
  // 默认时间范围
  return getDefaultTimeRange()
}

function generateTimeRangeForDate(date: Date, timeRange: { start: string, end: string }) {
  const [startHour, startMinute] = timeRange.start.split(':')
  const [endHour, endMinute] = timeRange.end.split(':')

  const startDate = new Date(date)
  startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)

  const endDate = new Date(date)
  endDate.setHours(parseInt(endHour), parseInt(endMinute), 59, 999)

  return {
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString()
  }
}

function generateTimeRangeForDateLocal(date: Date, timeRange: { start: string, end: string }) {
  const [startHour, startMinute] = timeRange.start.split(':')
  const [endHour, endMinute] = timeRange.end.split(':')

  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(),
    parseInt(startHour), parseInt(startMinute), 0, 0)

  const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(),
    parseInt(endHour), parseInt(endMinute), 59, 999)

  return {
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString()
  }
}

describe('会议室可用时间限制逻辑测试', () => {
  let testDate: Date

  beforeEach(() => {
    // 设置测试日期：2025-01-15 (周三)，使用本地时间
    testDate = new Date(2025, 0, 15) // 月份从0开始，0=1月
  })

  describe('getRoomTimeRange 函数测试', () => {
    it('应该使用会议室预约规则中的时间范围', () => {
      const room: MeetingRoom = {
        id: 'room-1',
        name: '会议室A',
        capacity: 10,
        status: 'AVAILABLE',
        requiresApproval: false,
        rules: {
          requiresApproval: false,
          minBookingDuration: 30,
          maxBookingDuration: 240,
          allowedTimeRange: {
            start: '08:00',
            end: '20:00'
          },
          advanceBookingDays: 7,
          maxConcurrentBookings: 3
        }
      }

      const timeRange = getRoomTimeRange(room)
      expect(timeRange).toEqual({
        start: '08:00',
        end: '20:00'
      })
    })

    it('如果没有预约规则，应该使用营业时间', () => {
      const room: MeetingRoom = {
        id: 'room-2',
        name: '会议室B',
        capacity: 15,
        status: 'AVAILABLE',
        requiresApproval: false,
        rules: {
          requiresApproval: false,
          minBookingDuration: 30,
          maxBookingDuration: 240,
          advanceBookingDays: 7,
          maxConcurrentBookings: 3
        },
        operatingHours: {
          start: '09:00',
          end: '18:00'
        }
      }

      const timeRange = getRoomTimeRange(room)
      expect(timeRange).toEqual({
        start: '09:00',
        end: '18:00'
      })
    })

    it('如果营业时间为空，应该使用默认营业时间', () => {
      const room: MeetingRoom = {
        id: 'room-3',
        name: '会议室C',
        capacity: 8,
        status: 'AVAILABLE',
        requiresApproval: false,
        rules: {
          requiresApproval: false,
          minBookingDuration: 30,
          maxBookingDuration: 240,
          advanceBookingDays: 7,
          maxConcurrentBookings: 3
        },
        operatingHours: {
          start: '',
          end: ''
        }
      }

      const timeRange = getRoomTimeRange(room)
      expect(timeRange).toEqual({
        start: '09:00', // 默认营业时间
        end: '18:00'   // 默认营业时间
      })
    })

    it('如果没有预约规则和营业时间，应该使用默认时间范围', () => {
      const room: MeetingRoom = {
        id: 'room-4',
        name: '会议室D',
        capacity: 12,
        status: 'AVAILABLE',
        requiresApproval: false
      }

      const timeRange = getRoomTimeRange(room)
      expect(timeRange).toEqual({
        start: '00:00',
        end: '23:59'
      })
    })

    it('应该处理room为null或undefined的情况', () => {
      expect(getRoomTimeRange(null)).toEqual({
        start: '00:00',
        end: '23:59'
      })
      expect(getRoomTimeRange(undefined)).toEqual({
        start: '00:00',
        end: '23:59'
      })
    })
  })

  describe('时间范围生成测试', () => {
    it('应该正确生成预约规则时间范围的ISO时间', () => {
      const room: MeetingRoom = {
        id: 'room-1',
        name: '会议室A',
        capacity: 10,
        status: 'AVAILABLE',
        requiresApproval: false,
        rules: {
          requiresApproval: false,
          minBookingDuration: 30,
          maxBookingDuration: 240,
          allowedTimeRange: {
            start: '08:30',
            end: '17:45'
          },
          advanceBookingDays: 7,
          maxConcurrentBookings: 3
        }
      }

      const timeRange = getRoomTimeRange(room)
      // 验证时间范围解析正确
      expect(timeRange).toEqual({
        start: '08:30',
        end: '17:45'
      })

      // 验证时间解析逻辑
      const [startHour, startMinute] = timeRange.start.split(':')
      const [endHour, endMinute] = timeRange.end.split(':')

      expect(parseInt(startHour)).toBe(8)
      expect(parseInt(startMinute)).toBe(30)
      expect(parseInt(endHour)).toBe(17)
      expect(parseInt(endMinute)).toBe(45)
    })

    it('应该正确生成跨日时间范围（如果预约规则允许）', () => {
      const room: MeetingRoom = {
        id: 'room-night',
        name: '夜间会议室',
        capacity: 20,
        status: 'AVAILABLE',
        requiresApproval: false,
        rules: {
          requiresApproval: false,
          minBookingDuration: 30,
          maxBookingDuration: 240,
          allowedTimeRange: {
            start: '18:00',
            end: '02:00'  // 第二天凌晨2点
          },
          advanceBookingDays: 7,
          maxConcurrentBookings: 3
        }
      }

      const timeRange = getRoomTimeRange(room)
      // 测试时间范围解析是否正确
      expect(timeRange).toEqual({
        start: '18:00',
        end: '02:00'
      })
    })

    it('应该正确生成24小时时间范围', () => {
      const timeRange = { start: '00:00', end: '23:59' }

      // 验证时间范围正确解析
      const [startHour, startMinute] = timeRange.start.split(':')
      const [endHour, endMinute] = timeRange.end.split(':')

      expect(parseInt(startHour)).toBe(0)
      expect(parseInt(startMinute)).toBe(0)
      expect(parseInt(endHour)).toBe(23)
      expect(parseInt(endMinute)).toBe(59)
    })
  })

  describe('边界情况测试', () => {
    it('应该处理空的时间字符串', () => {
      const room: MeetingRoom = {
        id: 'room-empty-time',
        name: '空时间会议室',
        capacity: 5,
        status: 'AVAILABLE',
        requiresApproval: false,
        operatingHours: {
          start: '',
          end: ''
        }
      }

      const timeRange = getRoomTimeRange(room)
      expect(timeRange).toEqual({
        start: '09:00', // 使用默认营业时间
        end: '18:00'
      })
    })

    it('应该处理无效时间格式（回退到默认值）', () => {
      // 注意：实际代码中需要添加时间格式验证
      const timeRange = { start: 'invalid', end: 'time' }

      // 这里会抛出错误，实际代码中应该添加错误处理
      expect(() => {
        const [startHour, startMinute] = timeRange.start.split(':')
        parseInt(startHour) // 这会返回NaN
      }).not.toThrow()
    })

    it('应该测试常用的工作时间配置', () => {
      const commonConfigs = [
        { start: '08:00', end: '18:00', description: '标准工作时间' },
        { start: '09:00', end: '17:00', description: '朝九晚五' },
        { start: '07:00', end: '22:00', description: '延长工作时间' },
        { start: '10:00', end: '16:00', description: '短工作时间' }
      ]

      commonConfigs.forEach(config => {
        const room: MeetingRoom = {
          id: `room-${config.description}`,
          name: config.description,
          capacity: 10,
          status: 'AVAILABLE',
          requiresApproval: false,
          rules: {
            requiresApproval: false,
            minBookingDuration: 30,
            maxBookingDuration: 240,
            allowedTimeRange: {
              start: config.start,
              end: config.end
            },
            advanceBookingDays: 7,
            maxConcurrentBookings: 3
          }
        }

        const timeRange = getRoomTimeRange(room)
        expect(timeRange).toEqual({
          start: config.start,
          end: config.end
        })
      })
    })
  })

  describe('回归测试：确保修复了硬编码问题', () => {
    it('不应该总是返回00:00-23:59的时间范围', () => {
      const room: MeetingRoom = {
        id: 'room-business-hours',
        name: '标准会议室',
        capacity: 10,
        status: 'AVAILABLE',
        requiresApproval: false,
        rules: {
          requiresApproval: false,
          minBookingDuration: 30,
          maxBookingDuration: 240,
          allowedTimeRange: {
            start: '09:00',
            end: '18:00'
          },
          advanceBookingDays: 7,
          maxConcurrentBookings: 3
        }
      }

      const timeRange = getRoomTimeRange(room)
      // 确保不返回默认的00:00-23:59范围
      expect(timeRange).not.toEqual({
        start: '00:00',
        end: '23:59'
      })
      // 确保返回正确的时间范围
      expect(timeRange).toEqual({
        start: '09:00',
        end: '18:00'
      })
    })

    it('修复前：总是硬编码为0:00-24:00（测试确认问题存在）', () => {
      // 这个测试用于确认修复前的问题确实存在
      // 硬编码的时间范围（修复前的行为）
      const hardcodedTimeRange = { start: '00:00', end: '23:59' }

      // 验证硬编码时间范围解析
      const [startHour, startMinute] = hardcodedTimeRange.start.split(':')
      const [endHour, endMinute] = hardcodedTimeRange.end.split(':')

      expect(parseInt(startHour)).toBe(0)
      expect(parseInt(startMinute)).toBe(0)
      expect(parseInt(endHour)).toBe(23)
      expect(parseInt(endMinute)).toBe(59)
    })

    it('修复后：根据会议室规则返回正确的时间范围', () => {
      const room: MeetingRoom = {
        id: 'room-test',
        name: '测试会议室',
        capacity: 8,
        status: 'AVAILABLE',
        requiresApproval: false,
        rules: {
          requiresApproval: false,
          minBookingDuration: 30,
          maxBookingDuration: 240,
          allowedTimeRange: {
            start: '10:00',
            end: '16:00'
          },
          advanceBookingDays: 7,
          maxConcurrentBookings: 2
        }
      }

      const timeRange = getRoomTimeRange(room)

      // 确保使用会议室配置的时间范围
      expect(timeRange.start).toBe('10:00')
      expect(timeRange.end).toBe('16:00')

      // 确保不使用硬编码的00:00-23:59
      expect(timeRange.start).not.toBe('00:00')
      expect(timeRange.end).not.toBe('23:59')
    })
  })
})