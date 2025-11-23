/**
 * 检查预约时间冲突
 * POST /api/v1/reservations/check-conflict
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

    // 获取请求体
    const body = await readBody(event)
    const { roomId, startTime, endTime, excludeId } = body

    // 参数验证
    if (!roomId || !startTime || !endTime) {
      throw createError({
        statusCode: 400,
        statusMessage: '会议室ID、开始时间和结束时间不能为空'
      })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: '结束时间必须晚于开始时间'
      })
    }

    // 检查会议室是否存在
    const room = await prisma.meetingRoom.findUnique({
      where: { id: roomId }
    })

    if (!room) {
      throw createError({
        statusCode: 404,
        statusMessage: '会议室不存在'
      })
    }

    // 查询时间重叠的预约
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        roomId,
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS']
        },
        startTime: { lt: end },
        endTime: { gt: start },
        ...(excludeId && { id: { not: excludeId } })
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    const hasConflict = conflictingReservations.length > 0

    // 如果有冲突，提供详细信息
    if (hasConflict) {
      const conflictDetails = conflictingReservations.map(reservation => ({
        id: reservation.id,
        title: reservation.title,
        organizer: reservation.organizer.name,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        overlapType: getOverlapType(start, end, reservation.startTime, reservation.endTime)
      }))

      return {
        success: true,
        data: {
          hasConflict: true,
          conflicts: conflictDetails,
          room: {
            id: room.id,
            name: room.name,
            location: room.location,
            capacity: room.capacity
          },
          requestedTime: {
            startTime,
            endTime,
            duration: Math.round((end.getTime() - start.getTime()) / (1000 * 60))
          },
          suggestions: await generateAlternativeSuggestions(roomId, start, end, excludeId)
        },
        timestamp: new Date().toISOString()
      }
    }

    return {
      success: true,
      data: {
        hasConflict: false,
        conflicts: [],
        room: {
          id: room.id,
          name: room.name,
          location: room.location,
          capacity: room.capacity
        },
        requestedTime: {
          startTime,
          endTime,
          duration: Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        }
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('检查时间冲突失败:', error)

    // 如果是已知的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 未知错误
    throw createError({
      statusCode: 500,
      statusMessage: '检查时间冲突失败'
    })
  }
})

/**
 * 判断时间重叠类型
 */
function getOverlapType(
  newStart: Date,
  newEnd: Date,
  existingStart: string,
  existingEnd: string
): string {
  const existingStartDate = new Date(existingStart)
  const existingEndDate = new Date(existingEnd)

  if (newStart < existingStartDate && newEnd > existingEndDate) {
    return '完全包含'
  } else if (newStart >= existingStartDate && newEnd <= existingEndDate) {
    return '被完全包含'
  } else if (newStart < existingEndDate && newEnd > existingStartDate) {
    return '部分重叠'
  } else {
    return '时间相邻'
  }
}

/**
 * 生成替代时间建议
 */
async function generateAlternativeSuggestions(
  roomId: string,
  requestedStart: Date,
  requestedEnd: Date,
  excludeId?: string
): Promise<Array<{ startTime: string; endTime: string; reason: string }>> {
  const suggestions = []
  const requestedDuration = requestedEnd.getTime() - requestedStart.getTime()

  // 查找当天其他可用时间段
  const dayStart = new Date(requestedStart)
  dayStart.setHours(8, 0, 0, 0) // 假设营业时间从8点开始

  const dayEnd = new Date(requestedStart)
  dayEnd.setHours(22, 0, 0, 0) // 假设营业时间到22点结束

  // 查询当天的所有预约
  const existingReservations = await prisma.reservation.findMany({
    where: {
      roomId,
      status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
      ...(excludeId && { id: { not: excludeId } })
    },
    orderBy: { startTime: 'asc' }
  })

  // 查找可用时间段
  let currentTime = new Date(dayStart)

  for (const reservation of existingReservations) {
    const reservationStart = new Date(reservation.startTime)
    const reservationEnd = new Date(reservation.endTime)

    // 检查当前时间段到预约开始前是否有足够的时间
    if (reservationStart.getTime() - currentTime.getTime() >= requestedDuration) {
      suggestions.push({
        startTime: currentTime.toISOString(),
        endTime: new Date(currentTime.getTime() + requestedDuration).toISOString(),
        reason: '前一个时间段可用'
      })
      if (suggestions.length >= 3) break
    }

    // 更新当前时间为预约结束时间
    if (reservationEnd > currentTime) {
      currentTime = new Date(reservationEnd)
    }
  }

  // 检查最后一个预约之后的时间
  if (suggestions.length < 3 && dayEnd.getTime() - currentTime.getTime() >= requestedDuration) {
    suggestions.push({
      startTime: currentTime.toISOString(),
      endTime: new Date(currentTime.getTime() + requestedDuration).toISOString(),
      reason: '后一个时间段可用'
    })
  }

  return suggestions
}

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