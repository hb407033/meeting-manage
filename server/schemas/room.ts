/**
 * 会议室相关数据验证 Schema
 * 使用 Zod 进行数据验证
 */

import { z } from 'zod'

// 基础设备配置 schema
const EquipmentSchema = z.object({
  projector: z.boolean().default(false),
  whiteboard: z.boolean().default(false),
  videoConf: z.boolean().default(false),
  airCondition: z.boolean().default(true),
  wifi: z.boolean().default(true),
  customEquipment: z.array(z.string()).optional()
})

// 图片信息 schema
const RoomImageSchema = z.object({
  url: z.string().url('图片URL格式不正确'),
  type: z.enum(['main', '360', 'video', 'gallery']),
  caption: z.string().optional(),
  size: z.number().optional(),
  uploadedAt: z.string().datetime().optional()
})

// 预约规则 schema
const RoomRulesSchema = z.object({
  requiresApproval: z.boolean().default(false),
  minBookingDuration: z.number().min(15).max(480).default(30), // 15分钟到8小时
  maxBookingDuration: z.number().min(30).max(1440).default(240), // 30分钟到24小时
  allowedTimeRange: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '开始时间格式不正确'),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '结束时间格式不正确')
  }).optional(),
  advanceBookingDays: z.number().min(0).max(365).default(30), // 提前预约天数
  maxConcurrentBookings: z.number().min(1).max(10).default(1) // 最大并发预约数
})

// 会议室状态枚举验证
export const RoomStatusSchema = z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'DISABLED'])

// 创建会议室的请求体 schema
export const CreateRoomSchema = z.object({
  name: z.string().min(1, '会议室名称不能为空').max(100, '会议室名称不能超过100个字符'),
  description: z.string().max(500, '描述不能超过500个字符').optional(),
  capacity: z.number().min(1, '容量必须大于0').max(1000, '容量不能超过1000'),
  location: z.string().max(200, '位置不能超过200个字符').optional(),
  equipment: EquipmentSchema.optional(),
  images: z.array(RoomImageSchema).max(10, '最多只能上传10张图片').optional(),
  rules: RoomRulesSchema.optional(),
  status: RoomStatusSchema.optional()
})

// 更新会议室的请求体 schema
export const UpdateRoomSchema = CreateRoomSchema.partial()

// 会议室查询参数 schema
export const RoomQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: RoomStatusSchema.optional(),
  location: z.string().optional(),
  capacityMin: z.coerce.number().min(1).optional(),
  capacityMax: z.coerce.number().max(1000).optional(),
  search: z.string().max(100).optional(), // 搜索关键词
  sortBy: z.enum(['name', 'capacity', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// 会议室ID参数 schema
export const RoomIdSchema = z.object({
  id: z.string().min(1, '会议室ID不能为空')
})

// 批量操作 schema
export const BatchOperationSchema = z.object({
  roomIds: z.array(z.string()).min(1, '至少选择一个会议室').max(50, '一次最多操作50个会议室'),
  action: z.enum(['delete', 'updateStatus', 'export']),
  data: z.any().optional() // 用于updateStatus等操作
})

// 文件上传 schema
export const FileUploadSchema = z.object({
  roomId: z.string().min(1, '会议室ID不能为空'),
  type: z.enum(['main', '360', 'video', 'gallery']).default('gallery'),
  caption: z.string().max(200, '图片说明不能超过200个字符').optional()
})

// 导出类型
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>
export type RoomQuery = z.infer<typeof RoomQuerySchema>
export type RoomIdParams = z.infer<typeof RoomIdSchema>
export type BatchOperationInput = z.infer<typeof BatchOperationSchema>
export type FileUploadInput = z.infer<typeof FileUploadSchema>