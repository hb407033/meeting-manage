/**
 * 会议相关类型定义 (前端)
 */

// 会议材料文件类型
export interface MaterialFile {
  id: string
  name: string
  originalName: string
  type: string // MIME type
  size: number // bytes
  url: string
  uploadedBy: string
  uploadedAt: string
  reservationId?: string
  description?: string
  isPublic: boolean
}

// 文件上传选项
export interface UploadOptions {
  maxFileSize: number // bytes
  allowedTypes: string[]
  maxFiles: number
}

// 时间段类型
export interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  isAvailable: boolean
  reservationId?: string
  reservationTitle?: string
}

// 设备选择类型
export interface EquipmentSelection {
  equipment: {
    id: string
    name: string
    type: string
    cost: number
    description?: string
  }
  quantity: number
}

// 设备冲突类型
export interface EquipmentConflict {
  equipmentId: string
  equipmentName: string
  conflictType: 'unavailable' | 'insufficient' | 'double_booking'
  conflictTime: {
    startTime: Date
    endTime: Date
  }
  alternative?: {
    equipmentId: string
    equipmentName: string
    isAvailable: boolean
  }
}

// 服务选择类型
export interface ServiceSelection {
  service: {
    id: string
    name: string
    type: string
    baseCost: number
    description?: string
  }
  quantity: number
  config?: {
    timeOption?: string
    specialRequirements?: string
    additionalCost?: number
  }
  discount?: {
    type: 'percentage' | 'fixed'
    value: number
  }
}

// 重复预约模式
export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number // 间隔数，如每2周
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

// 预约冲突类型
export interface ReservationConflict {
  conflictType: 'time' | 'resource' | 'policy'
  conflictDescription: string
  conflictingReservationId?: string
  conflictingReservationTitle?: string
  conflictingTime?: {
    startTime: Date
    endTime: Date
  }
  suggestions?: string[]
}

// 参会人员类型
export interface Attendee {
  id: string
  name: string
  email: string
  phone?: string
  type: 'internal' | 'external'

  // 内部员工特有字段
  employeeId?: string
  department?: string
  position?: string

  // 外部访客特有字段
  company?: string
  visitPurpose?: string

  // 通用字段
  isOrganizer?: boolean
  specialRequirements?: string
}