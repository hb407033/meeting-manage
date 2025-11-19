import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { getRequiredCurrentUser } from '~~/server/utils/auth'
import Prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户认证
    const user = await getRequiredCurrentUser(event)

    // 获取路由参数
    const reservationId = getRouterParam(event, 'id')
    if (!reservationId) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '预约ID是必需的')
    }

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
            location: true
          }
        }
      }
    })

    if (!existingReservation) {
      return createErrorResponse(API_CODES.NOT_FOUND, '预约不存在')
    }

    // 权限检查：只有预约组织者或管理员可以取消预约
    // 这里简化处理，假设预约组织者可以取消自己的预约
    if (existingReservation.organizerId !== user.id) {
      return createErrorResponse(API_CODES.FORBIDDEN, '只能取消自己的预约')
    }

    // 检查预约状态：已取消或已完成的预约不能再次取消
    if (existingReservation.status === 'CANCELED') {
      return createErrorResponse(API_CODES.BUSINESS_ERROR, '预约已经被取消')
    }

    // 检查预约时间：已经开始的预约不能取消
    if (new Date() > existingReservation.startTime) {
      return createErrorResponse(API_CODES.BUSINESS_ERROR, '已经开始的预约不能取消')
    }

    // 取消预约（软删除，状态更新为已取消）
    const canceledReservation = await Prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELED',
        // 可选：添加取消原因和时间戳
        // canceledAt: new Date(),
        // cancelReason: '用户主动取消'
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
        action: 'CANCEL_RESERVATION',
        resourceType: 'RESERVATION',
        resourceId: reservationId,
        details: {
          reservationTitle: existingReservation.title,
          roomId: existingReservation.roomId,
          startTime: existingReservation.startTime,
          endTime: existingReservation.endTime,
          cancelTime: new Date()
        },
        ipAddress: getClientIP(event) || undefined,
        userAgent: getHeader(event, 'user-agent') || undefined
      }
    })

    console.log(`✅ 预约取消成功: ${reservationId} - ${existingReservation.title}`)

    return createSuccessResponse(canceledReservation, '预约取消成功')

  } catch (error) {
    console.error('❌ 取消预约失败:', error)

    if (error instanceof Error) {
      return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, error.message)
    }

    return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, '取消预约失败')
  }
})