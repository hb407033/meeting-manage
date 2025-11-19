import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { getRequiredCurrentUser } from '~~/server/utils/auth'
import Prisma from '~~/server/services/database'

interface CreateReservationRequest {
  title: string
  description?: string
  startTime: string // ISO datetime
  endTime: string   // ISO datetime
  roomId: string
  attendeeCount?: number
}

export default defineEventHandler(async (event) => {
  try {
    // 验证用户认证
    const user = await getRequiredCurrentUser(event)

    // 获取请求数据
    const body = await readBody(event) as CreateReservationRequest

    // 验证必需字段
    if (!body.title?.trim()) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '预约标题是必需的')
    }

    if (!body.startTime || !body.endTime) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '开始时间和结束时间是必需的')
    }

    if (!body.roomId) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '会议室ID是必需的')
    }

    // 验证时间格式
    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '时间格式无效')
    }

    if (startTime >= endTime) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '开始时间必须早于结束时间')
    }

    // 检查预约时间不能是过去时间
    if (startTime < new Date()) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '预约开始时间不能是过去时间')
    }

    // 验证会议室是否存在
    const room = await Prisma.meetingRoom.findFirst({
      where: {
        id: body.roomId,
        deletedAt: null
      }
    })

    if (!room) {
      return createErrorResponse(API_CODES.NOT_FOUND, '会议室不存在')
    }

    if (room.status !== 'AVAILABLE') {
      return createErrorResponse(API_CODES.BUSINESS_ERROR, '会议室当前不可用')
    }

    // 验证参会人数不能超过会议室容量
    const attendeeCount = body.attendeeCount || 1
    if (attendeeCount > room.capacity) {
      return createErrorResponse(API_CODES.BUSINESS_ERROR, `参会人数(${attendeeCount})超过会议室容量(${room.capacity})`)
    }

    // 检查时间冲突
    const conflictReservation = await Prisma.reservation.findFirst({
      where: {
        roomId: body.roomId,
        status: {
          notIn: ['CANCELED']
        },
        OR: [
          {
            // 新预约的开始时间在现有预约期间内
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            // 新预约的结束时间在现有预约期间内
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            // 新预约完全包含现有预约
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    })

    if (conflictReservation) {
      return createErrorResponse(API_CODES.BUSINESS_ERROR,
        `该时间段已被预约，预约ID: ${conflictReservation.id}，标题: ${conflictReservation.title}`)
    }

    // 创建预约
    const reservation = await Prisma.reservation.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        startTime,
        endTime,
        roomId: body.roomId,
        organizerId: user.id,
        attendeeCount,
        status: 'PENDING'
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        room: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true
          }
        }
      }
    })

    // 记录审计日志
    await Prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_RESERVATION',
        resourceType: 'RESERVATION',
        resourceId: reservation.id,
        details: {
          reservationTitle: reservation.title,
          roomId: reservation.roomId,
          startTime: reservation.startTime,
          endTime: reservation.endTime
        },
        ipAddress: getClientIP(event) || undefined,
        userAgent: getHeader(event, 'user-agent') || undefined
      }
    })

    console.log(`✅ 预约创建成功: ${reservation.id} - ${reservation.title}`)

    return createSuccessResponse(reservation, '预约创建成功')

  } catch (error) {
    console.error('❌ 创建预约失败:', error)

    if (error instanceof Error) {
      return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, error.message)
    }

    return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, '创建预约失败')
  }
})