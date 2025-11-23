/**
 * 详细预约创建 API
 * POST /api/v1/reservations/detailed
 */

import prisma from '~~/server/services/database'
import {
  createSuccessResponse,
  createErrorResponse,
  API_CODES,
  getClientIP
} from '~~/server/utils/response'
import { auditLogger } from '~~/server/utils/audit'
import { RecurringReservationEngine } from '~~/server/services/recurring-reservation-engine'
import type { CreateRecurringReservationRequest } from '~~/server/types/recurring-reservation'
import { requirePermission } from '~~/server/middleware/permission'

// 请求体验证schema
const DetailedReservationSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 200 },
  description: { type: 'string', required: false, maxLength: 1000 },
  importanceLevel: { type: 'string', required: false, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
  attendeeCount: { type: 'number', required: false, min: 1, max: 1000, default: 1 },
  roomId: { type: 'string', required: true },
  organizerId: { type: 'string', required: true },
  startTime: { type: 'date', required: true },
  endTime: { type: 'date', required: true },
  equipment: { type: 'array', required: false, default: [] },
  services: { type: 'array', required: false, default: [] },
  attendeeList: { type: 'array', required: false, default: [] },
  meetingMaterials: { type: 'array', required: false, default: [] },
  isRecurring: { type: 'boolean', required: false, default: false },
  recurringPattern: { type: 'object', required: false },
  specialRequirements: { type: 'string', required: false, maxLength: 500 },
  budgetAmount: { type: 'number', required: false, min: 0, max: 999999.99 }
}

export default defineEventHandler(async (event) => {
  // 权限验证：需要 reservation:create 权限
  await requirePermission('reservation:create')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id

  if (!userId) {
    return createErrorResponse(API_CODES.UNAUTHORIZED, '用户未认证')
  }

  try {
    // 解析请求体
    const body = await readBody(event)
    const {
      title,
      description,
      importanceLevel = 'NORMAL',
      attendeeCount = 1,
      roomId,
      organizerId = userId,
      startTime,
      endTime,
      equipment = [],
      services = [],
      attendeeList = [],
      meetingMaterials = [],
      isRecurring = false,
      recurringPattern,
      specialRequirements,
      budgetAmount
    } = body

    // 基础数据验证
    if (!title || !roomId || !startTime || !endTime) {
      return createErrorResponse('VALIDATION_ERROR', '缺少必需字段')
    }

    // 时间验证
    const startDateTime = new Date(startTime)
    const endDateTime = new Date(endTime)
    const now = new Date()

    if (startDateTime < now) {
      return createErrorResponse('INVALID_TIME_RANGE', '不能预约过去的时间')
    }

    if (endDateTime <= startDateTime) {
      return createErrorResponse('INVALID_TIME_RANGE', '结束时间必须大于开始时间')
    }

    // 检查会议室是否存在
    const room = await prisma.meetingRoom.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
        status: 'AVAILABLE'
      }
    })

    if (!room) {
      return createErrorResponse('ROOM_NOT_AVAILABLE', '会议室不存在或不可用')
    }

    // 检查参会人数是否超过会议室容量
    if (attendeeCount > room.capacity) {
      return createErrorResponse('ROOM_CAPACITY_EXCEEDED',
        `参会人数(${attendeeCount})超过会议室容量(${room.capacity}人)`)
    }

    // 检查时间冲突
    const conflictReservations = await prisma.reservation.findMany({
      where: {
        roomId,
        status: { not: 'CANCELED' },
        AND: [
          { startTime: { lt: endDateTime } },
          { endTime: { gt: startDateTime } }
        ]
      }
    })

    if (conflictReservations.length > 0) {
      return createErrorResponse('RESERVATION_CONFLICT',
        `该时间段与现有预约"${conflictReservations[0].title}"冲突`)
    }

    // 检查设备可用性
    const equipmentConflicts = await checkEquipmentAvailability(
      roomId,
      equipment,
      startDateTime,
      endDateTime
    )

    if (equipmentConflicts.length > 0) {
      return createErrorResponse('EQUIPMENT_CONFLICT',
        `设备冲突: ${equipmentConflicts.map(c => c.name).join(', ')}`)
    }

    // 处理重复预约
    let recurringReservationId = null
    if (isRecurring && recurringPattern) {
      // 验证重复模式
      const { isValid, errors } = RecurringReservationEngine.validatePattern(recurringPattern)
      if (!isValid) {
        return createErrorResponse('VALIDATION_ERROR', `重复模式错误: ${errors.join(', ')}`)
      }

      // 创建重复预约记录
      const recurringReservation = await createRecurringReservation(
        title,
        roomId,
        organizerId,
        startDateTime,
        endDateTime,
        recurringPattern,
        equipment,
        services,
        attendeeList,
        specialRequirements,
        budgetAmount
      )
      recurringReservationId = recurringReservation.id
    }

    // 创建主预约记录
    const reservation = await prisma.reservation.create({
      data: {
        title,
        description,
        importanceLevel,
        attendeeCount,
        roomId,
        organizerId,
        startTime: startDateTime,
        endTime: endDateTime,
        equipment: equipment.length > 0 ? equipment : null,
        services: services.length > 0 ? services : null,
        attendeeList: attendeeList.length > 0 ? attendeeList : null,
        isRecurring,
        recurringPattern: isRecurring && recurringPattern ? recurringPattern : null,
        recurringReservationId,
        specialRequirements,
        budgetAmount: budgetAmount ? budgetAmount : null,
        status: 'PENDING'
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true }
        },
        room: {
          select: { id: true, name: true, location: true, capacity: true }
        },
        meetingMaterials: true,
        recurringReservation: true
      }
    })

    // 关联会议材料
    if (meetingMaterials.length > 0) {
      await Promise.all(meetingMaterials.map(async (materialId: string) => {
        await prisma.meetingMaterial.update({
          where: { id: materialId },
          data: { reservationId: reservation.id }
        })
      }))
    }

    // 记录操作日志
    auditLogger.log({
      userId,
      action: 'CREATE_DETAILED_RESERVATION',
      resourceType: 'reservation',
      resourceId: reservation.id,
      details: {
        title,
        roomId,
        startTime: startDateTime,
        endTime: endDateTime,
        isRecurring,
        equipmentCount: equipment.length,
        servicesCount: services.length,
        attendeeCount,
        materialsCount: meetingMaterials.length
      },
      ipAddress: getClientIP(event),
      userAgent: getHeader(event, 'user-agent') || undefined
    })

    return createSuccessResponse({
      id: reservation.id,
      title: reservation.title,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      room: reservation.room,
      organizer: reservation.organizer,
      status: reservation.status,
      isRecurring: reservation.isRecurring,
      meetingMaterials: reservation.meetingMaterials,
      recurringReservationId: reservation.recurringReservationId
    }, '详细预约创建成功')

  } catch (error: any) {
    console.error('创建详细预约失败:', error)

    // 验证错误
    if (error.name === 'ValidationError') {
      return createErrorResponse('VALIDATION_ERROR', '请求数据验证失败', error.errors)
    }

    // Prisma错误处理
    if (error?.code === 'P2002') {
      return createErrorResponse('DUPLICATE_RESOURCE', '预约已存在')
    }

    if (error?.code?.startsWith('P2')) {
      return createErrorResponse('DATABASE_ERROR', '数据库约束错误')
    }

    return createErrorResponse('INTERNAL_ERROR', '创建详细预约失败')
  } finally {
    await prisma.$disconnect()
  }
})

/**
 * 检查设备可用性
 */
async function checkEquipmentAvailability(
  roomId: string,
  equipmentRequests: any[],
  startTime: Date,
  endTime: Date
): Promise<Array<{ id: string; name: string }>> {
  // 这里应该检查设备的可用性和冲突
  // 暂时返回空数组，表示无冲突
  return []
}

/**
 * 创建重复预约记录
 */
async function createRecurringReservation(
  title: string,
  roomId: string,
  organizerId: string,
  startTime: Date,
  endTime: Date,
  pattern: any,
  equipment: any[],
  services: any[],
  attendeeList: any[],
  specialRequirements?: string,
  budgetAmount?: number
) {
  const rruleString = RecurringReservationEngine.patternToRRule(pattern, startTime)

  return await prisma.recurringReservation.create({
    data: {
      title,
      roomId,
      organizerId,
      startTime,
      endTime,
      recurrenceRule: rruleString,
      pattern: pattern,
      equipment: equipment.length > 0 ? equipment : null,
      services: services.length > 0 ? services : null,
      attendeeList: attendeeList.length > 0 ? attendeeList : null,
      specialRequirements,
      budgetAmount: budgetAmount ? budgetAmount : null,
      status: 'ACTIVE',
      skipHolidays: pattern.skipHolidays || false,
      bufferMinutes: 0
    }
  })
}