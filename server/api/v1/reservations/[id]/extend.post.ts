/**
 * 延长预约时间
 * POST /api/v1/reservations/[id]/extend
 */
import prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 获取认证用户信息
    const user = await getUserFromEvent(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权访问'
      })
    }

    // 获取预约ID
    const reservationId = getRouterParam(event, 'id')
    if (!reservationId) {
      throw createError({
        statusCode: 400,
        statusMessage: '预约ID不能为空'
      })
    }

    // 获取请求体
    const body = await readBody(event)
    const { additionalMinutes = 30 } = body

    if (additionalMinutes < 5 || additionalMinutes > 120) {
      throw createError({
        statusCode: 400,
        statusMessage: '延长时间必须在5-120分钟之间'
      })
    }

    // 查找预约
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        room: true
      }
    })

    if (!reservation) {
      throw createError({
        statusCode: 404,
        statusMessage: '预约不存在'
      })
    }

    // 权限检查：只有预约创建者或管理员可以延长预约
    if (reservation.organizerId !== user.id && user.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足'
      })
    }

    // 检查预约状态
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'IN_PROGRESS') {
      throw createError({
        statusCode: 400,
        statusMessage: '只能延长已确认或进行中的预约'
      })
    }

    const now = new Date()
    const currentEndTime = new Date(reservation.endTime)

    // 检查预约是否已经结束
    if (currentEndTime <= now) {
      throw createError({
        statusCode: 400,
        statusMessage: '预约已结束，无法延长'
      })
    }

    // 计算新的结束时间
    const newEndTime = new Date(currentEndTime.getTime() + additionalMinutes * 60 * 1000)

    // 检查新结束时间是否与现有预约冲突
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        id: { not: reservationId },
        roomId: reservation.roomId,
        status: 'CONFIRMED',
        startTime: { lt: newEndTime },
        endTime: { gt: currentEndTime }
      }
    })

    if (conflictingReservations.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: '该时间段已有其他预约，无法延长'
      })
    }

    // 检查新结束时间是否超过当天的营业时间（假设营业时间到22:00）
    const endOfDay = new Date(currentEndTime)
    endOfDay.setHours(22, 0, 0, 0)

    if (newEndTime > endOfDay) {
      throw createError({
        statusCode: 400,
        statusMessage: '延长时间超过营业时间限制'
      })
    }

    // 更新预约
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        endTime: newEndTime
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true
          }
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // 记录操作日志
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EXTEND_RESERVATION',
        entityType: 'RESERVATION',
        entityId: reservationId,
        oldValues: JSON.stringify({ endTime: reservation.endTime }),
        newValues: JSON.stringify({ endTime: newEndTime }),
        description: `延长预约 ${additionalMinutes} 分钟`
      }
    })

    return {
      success: true,
      data: updatedReservation,
      message: `预约已成功延长 ${additionalMinutes} 分钟`,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('延长预约失败:', error)

    // 如果是已知的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 未知错误
    throw createError({
      statusCode: 500,
      statusMessage: '延长预约失败'
    })
  }
})

/**
 * 从事件中获取用户信息
 */
async function getUserFromEvent(event: any) {
  try {
    // 这里需要根据实际的认证机制来实现
    // 暂时返回模拟用户
    return {
      id: '1',
      email: 'user@example.com',
      role: 'USER'
    }
  } catch (error) {
    return null
  }
}