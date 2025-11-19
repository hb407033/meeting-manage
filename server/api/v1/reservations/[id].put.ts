import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { getRequiredCurrentUser } from '~~/server/utils/auth'
import Prisma from '~~/server/services/database'

interface UpdateReservationRequest {
  title?: string
  description?: string
  startTime?: string // ISO datetime
  endTime?: string   // ISO datetime
  attendeeCount?: number
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED'
}

export default defineEventHandler(async (event) => {
  try {
    // 验证用户认证
    const user = await getRequiredCurrentUser(event)

    // 获取路由参数
    const reservationId = getRouterParam(event, 'id')
    if (!reservationId) {
      return createErrorResponse('BAD_REQUEST', '预约ID是必需的')
    }

    // 获取请求数据
    const body = await readBody(event) as UpdateReservationRequest

    // 查找现有预约
    const existingReservation = await Prisma.reservation.findUnique({
      where: { id: reservationId },
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
            capacity: true,
            status: true
          }
        }
      }
    })

    if (!existingReservation) {
      return createErrorResponse('NOT_FOUND', '预约不存在')
    }

    // 权限检查：只有预约组织者或管理员可以修改预约
    // 这里简化处理，假设预约组织者可以修改自己的预约
    if (existingReservation.organizerId !== user.id) {
      return createErrorResponse('FORBIDDEN', '只能修改自己的预约')
    }

    // 检查预约状态：已取消或已完成的预约不能修改时间信息
    if (existingReservation.status === 'CANCELED' || existingReservation.status === 'COMPLETED') {
      return createErrorResponse('ROOM_NOT_AVAILABLE', '已取消或已完成的预约不能修改')
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.title !== undefined) {
      if (!body.title?.trim()) {
        return createErrorResponse('BAD_REQUEST', '预约标题不能为空')
      }
      updateData.title = body.title.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.attendeeCount !== undefined) {
      if (body.attendeeCount < 1 || body.attendeeCount > 999) {
        return createErrorResponse('BAD_REQUEST', '参会人数必须在1-999之间')
      }

      // 检查参会人数不能超过会议室容量
      if (body.attendeeCount > existingReservation.room.capacity) {
        return createErrorResponse('ROOM_NOT_AVAILABLE',
          `参会人数(${body.attendeeCount})超过会议室容量(${existingReservation.room.capacity})`)
      }

      updateData.attendeeCount = body.attendeeCount
    }

    if (body.status !== undefined) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED']
      if (!validStatuses.includes(body.status)) {
        return createErrorResponse('BAD_REQUEST', '无效的预约状态')
      }

      // 只有特定状态转换是允许的
      if (existingReservation.status === 'CANCELED' && body.status !== 'CANCELED') {
        return createErrorResponse('ROOM_NOT_AVAILABLE', '已取消的预约不能恢复')
      }

      updateData.status = body.status
    }

    // 时间更新需要特别处理
    if (body.startTime !== undefined || body.endTime !== undefined) {
      const newStartTime = body.startTime ? new Date(body.startTime) : existingReservation.startTime
      const newEndTime = body.endTime ? new Date(body.endTime) : existingReservation.endTime

      // 验证时间格式
      if (isNaN(newStartTime.getTime()) || isNaN(newEndTime.getTime())) {
        return createErrorResponse('BAD_REQUEST', '时间格式无效')
      }

      if (newStartTime >= newEndTime) {
        return createErrorResponse('BAD_REQUEST', '开始时间必须早于结束时间')
      }

      // 检查预约时间不能是过去时间（对于已确认的预约）
      if (newStartTime < new Date() && existingReservation.status === 'CONFIRMED') {
        return createErrorResponse('BAD_REQUEST', '已确认的预约的开始时间不能修改为过去时间')
      }

      // 检查时间冲突（排除当前预约）
      const conflictReservation = await Prisma.reservation.findFirst({
        where: {
          roomId: existingReservation.roomId,
          status: {
            notIn: ['CANCELED']
          },
          id: {
            not: reservationId // 排除当前预约
          },
          OR: [
            {
              AND: [
                { startTime: { lte: newStartTime } },
                { endTime: { gt: newStartTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: newEndTime } },
                { endTime: { gte: newEndTime } }
              ]
            },
            {
              AND: [
                { startTime: { gte: newStartTime } },
                { endTime: { lte: newEndTime } }
              ]
            }
          ]
        }
      })

      if (conflictReservation) {
        return createErrorResponse('ROOM_NOT_AVAILABLE',
          `该时间段已被预约，预约ID: ${conflictReservation.id}，标题: ${conflictReservation.title}`)
      }

      updateData.startTime = newStartTime
      updateData.endTime = newEndTime
    }

    // 如果没有需要更新的数据
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('BAD_REQUEST', '没有提供需要更新的数据')
    }

    // 更新预约
    const updatedReservation = await Prisma.reservation.update({
      where: { id: reservationId },
      data: updateData,
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
            capacity: true,
            status: true
          }
        }
      }
    })

    // 记录审计日志
    await Prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_RESERVATION',
        resourceType: 'RESERVATION',
        resourceId: reservationId,
        details: {
          changes: updateData,
          originalData: {
            title: existingReservation.title,
            startTime: existingReservation.startTime,
            endTime: existingReservation.endTime,
            attendeeCount: existingReservation.attendeeCount,
            status: existingReservation.status
          }
        },
        ipAddress: getClientIP(event) || undefined,
        userAgent: getHeader(event, 'user-agent') || undefined
      }
    })

    console.log(`✅ 预约更新成功: ${reservationId}`)

    return createSuccessResponse(updatedReservation, '预约更新成功')

  } catch (error) {
    console.error('❌ 更新预约失败:', error)

    if (error instanceof Error) {
      return createErrorResponse('INTERNAL_ERROR', error.message)
    }

    return createErrorResponse('INTERNAL_ERROR', '更新预约失败')
  }
})