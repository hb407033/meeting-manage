/**
 * 重复预约相关类型定义
 */

// 重复预约模式
export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number // 间隔数
  endDate?: Date
  endOccurrences?: number
  daysOfWeek?: number[] // 0-6, 0是周日
  dayOfMonth?: number // 每月的第几天
  weekOfMonth?: number // 每月的第几周 (1-4, -1为最后一周)
  dayOfWeek?: number // 星期几 (0-6)
  exceptions?: Date[] // 排除的日期
  skipHolidays?: boolean // 是否跳过节假日
  skipWeekends?: boolean // 是否跳过周末
  exceptionHandling?: 'move_next' | 'move_next_workday' | 'skip' | 'cancel'
}

// 重复预约实例
export interface RecurringReservationInstance {
  id: string
  originalDate: Date // 原计划日期
  actualDate: Date // 实际日期（处理后）
  startTime: Date
  endTime: Date
  index: number // 实例索引
  isException: boolean // 是否为例外
  exceptionReason?: string // 例外原因
}

// 重复预约冲突
export interface RecurringReservationConflict {
  instanceId: string
  conflictType: 'time' | 'resource' | 'policy'
  conflictingReservationId: string
  conflictingReservationTitle: string
  conflictDescription: string
  suggestedSolution?: string
}

// 重复预约统计
export interface RecurringReservationStats {
  totalInstances: number
  completedInstances: number
  cancelledInstances: number
  upcomingInstances: number
  totalDuration: number // 总时长（分钟）
}

// 重复例外类型
export enum RecurringExceptionType {
  CANCELLED = 'CANCELLED', // 取消该次预约
  MODIFIED = 'MODIFIED',   // 修改该次预约
  MOVED = 'MOVED'          // 移动该次预约到新时间
}

// 重复预约例外
export interface RecurringException {
  id: string
  recurringReservationId: string
  originalDate: Date
  type: RecurringExceptionType
  newDate?: Date // 移动后的新日期
  newStartTime?: Date // 修改后的开始时间
  newEndTime?: Date // 修改后的结束时间
  reason?: string // 例外原因
  createdBy: string
  createdAt: Date
}

// 重复预约创建请求
export interface CreateRecurringReservationRequest {
  title: string
  description?: string
  roomId: string
  organizerId: string
  startTime: Date
  endTime: Date
  pattern: RecurringPattern
  importanceLevel?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  attendeeCount?: number
  equipment?: any[]
  services?: any[]
  specialRequirements?: string
  budgetAmount?: number
}

// 重复预约更新请求
export interface UpdateRecurringReservationRequest {
  title?: string
  description?: string
  importanceLevel?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  attendeeCount?: number
  equipment?: any[]
  services?: any[]
  specialRequirements?: string
  budgetAmount?: number
}

// 重复预约实例更新请求
export interface UpdateRecurringInstanceRequest {
  startTime?: Date
  endTime?: Date
  title?: string
  description?: string
  attendeeCount?: number
  equipment?: any[]
  services?: any[]
  specialRequirements?: string
}