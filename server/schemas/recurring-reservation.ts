/**
 * 周期性预约相关的数据验证模式
 */

import { z } from 'zod'
import { RecurrencePatternSchema } from '../types/recurrence'

// 周期性预约创建模式
export const CreateRecurringReservationSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  roomId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  pattern: RecurrencePatternSchema,
  timezone: z.string().default('UTC'),
  skipHolidays: z.boolean().default(true),
  holidayRegion: z.string().optional(),
  bufferMinutes: z.number().int().min(0).max(120).default(15),
  maxBookingAhead: z.number().int().min(1).max(1095).optional(),
  notes: z.string().max(1000).optional(),
  generateInstances: z.boolean().default(true),
  checkConflicts: z.boolean().default(true)
}).refine((data) => {
  const startTime = new Date(data.startTime)
  const endTime = new Date(data.endTime)
  return endTime > startTime
}, {
  message: '结束时间必须晚于开始时间',
  path: ['endTime']
})

// 周期性预约更新模式
export const UpdateRecurringReservationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  pattern: RecurrencePatternSchema.optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  skipHolidays: z.boolean().optional(),
  holidayRegion: z.string().optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  maxBookingAhead: z.number().int().min(1).max(1095).optional(),
  notes: z.string().max(1000).optional(),
  applyToFuture: z.boolean().default(false)
})

// 例外创建模式
export const CreateExceptionSchema = z.object({
  recurringReservationId: z.string().min(1),
  exceptionType: z.enum(['CANCELLED', 'MODIFIED', 'MOVED']),
  originalStartTime: z.string().datetime(),
  originalEndTime: z.string().datetime(),
  newStartTime: z.string().datetime().optional(),
  newEndTime: z.string().datetime().optional(),
  reason: z.string().max(500).optional()
}).refine((data) => {
  const originalStartTime = new Date(data.originalStartTime)
  const originalEndTime = new Date(data.originalEndTime)

  if (originalEndTime <= originalStartTime) {
    return false
  }

  if (data.newStartTime && data.newEndTime) {
    const newStartTime = new Date(data.newStartTime)
    const newEndTime = new Date(data.newEndTime)

    if (newEndTime <= newStartTime) {
      return false
    }
  }

  return true
}, {
  message: '时间配置无效',
  path: ['root']
})

// 批量操作模式
export const BatchOperationSchema = z.object({
  operation: z.enum(['pause', 'resume', 'cancel', 'delete']),
  fromDate: z.string().datetime().optional(),
  reason: z.string().max(500).optional()
})

// 冲突检查模式
export const ConflictCheckSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  maxInstances: z.number().int().min(1).max(100).default(50),
  skipHolidays: z.boolean().default(true),
  includeSuggestions: z.boolean().default(true),
  excludeReservationId: z.string().optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    return endDate > startDate
  }
  return true
}, {
  message: '结束日期必须晚于开始日期',
  path: ['endDate']
})

// 查询参数模式
export const RecurringReservationQuerySchema = z.object({
  organizerId: z.string().optional(),
  roomId: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

// 实例查询参数模式
export const OccurrencesQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.coerce.number().int().min(1).max(100).default(50),
  includeExceptions: z.boolean().default(true),
  skipHolidays: z.boolean().default(true)
})

export type CreateRecurringReservationRequest = z.infer<typeof CreateRecurringReservationSchema>
export type UpdateRecurringReservationRequest = z.infer<typeof UpdateRecurringReservationSchema>
export type CreateExceptionRequest = z.infer<typeof CreateExceptionSchema>
export type BatchOperationRequest = z.infer<typeof BatchOperationSchema>
export type ConflictCheckRequest = z.infer<typeof ConflictCheckSchema>
export type RecurringReservationQuery = z.infer<typeof RecurringReservationQuerySchema>
export type OccurrencesQuery = z.infer<typeof OccurrencesQuerySchema>