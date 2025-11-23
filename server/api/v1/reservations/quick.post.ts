/**
 * 快捷预约API
 * POST /api/v1/reservations/quick
 *
 * 提供简化的会议室预约创建接口
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

    // 检查预约权限
    const hasPermission = await checkUserPermission(user, 'reservation', 'create')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，无法创建预约'
      })
    }

    // 获取请求数据
    const body = await readBody(event)

    // 验证必需字段
    const requiredFields = ['title', 'startTime', 'endTime', 'roomId', 'attendeeCount']
    for (const field of requiredFields) {
      if (!body[field]) {
        throw createError({
          statusCode: 400,
          statusMessage: `缺少必需字段: ${field}`
        })
      }
    }

    // 数据验证
    const validationResult = validateReservationData(body)
    if (!validationResult.isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: validationResult.error
      })
    }

    // 检查会议室可用性
    const availabilityCheck = await checkRoomAvailability(
      body.roomId,
      body.startTime,
      body.endTime
    )

    if (!availabilityCheck.isAvailable) {
      throw createError({
        statusCode: 409,
        statusMessage: availabilityCheck.reason || '该时间段会议室不可用'
      })
    }

    // 创建预约
    const reservation = await createReservation({
      ...body,
      organizerId: user.id,
      type: 'QUICK',
      status: 'CONFIRMED' // 快捷预约直接确认为已确认状态
    })

    // 记录审计日志
    await logAuditEvent({
      userId: user.id,
      action: 'CREATE_QUICK_RESERVATION',
      resourceId: reservation.id,
      details: {
        title: body.title,
        roomId: body.roomId,
        startTime: body.startTime,
        endTime: body.endTime
      }
    })

    // 发送通知
    await sendReservationNotification(reservation, user)

    return {
      success: true,
      data: reservation,
      message: '预约创建成功',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('创建快捷预约失败:', error)

    // 如果是已知的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 未知错误
    throw createError({
      statusCode: 500,
      statusMessage: '创建预约失败'
    })
  }
})

/**
 * 验证预约数据
 */
function validateReservationData(data: any) {
  const { title, startTime, endTime, roomId, attendeeCount } = data

  // 标题验证
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: '会议主题不能为空' }
  }

  if (title.length > 100) {
    return { isValid: false, error: '会议主题不能超过100个字符' }
  }

  // 时间验证
  const start = new Date(startTime)
  const end = new Date(endTime)
  const now = new Date()

  if (start >= end) {
    return { isValid: false, error: '结束时间必须晚于开始时间' }
  }

  if (start <= now) {
    return { isValid: false, error: '开始时间不能早于当前时间' }
  }

  // 检查预约时长（快捷预约限制在2小时内）
  const duration = (end.getTime() - start.getTime()) / (1000 * 60) // 分钟
  if (duration > 120) {
    return { isValid: false, error: '快捷预约时长不能超过2小时' }
  }

  // 参会人数验证
  if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
    return { isValid: false, error: '参会人数必须是大于0的整数' }
  }

  // 会议室ID验证
  if (!roomId || typeof roomId !== 'string') {
    return { isValid: false, error: '会议室ID无效' }
  }

  return { isValid: true }
}

/**
 * 检查会议室可用性
 */
async function checkRoomAvailability(roomId: string, startTime: string, endTime: string) {
  try {
    // 检查会议室是否存在且可用
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        status: true,
        capacity: true,
        currentStatus: true
      }
    })

    if (!room) {
      return {
        isAvailable: false,
        reason: '会议室不存在'
      }
    }

    if (room.status !== 'ACTIVE') {
      return {
        isAvailable: false,
        reason: '会议室当前不可用'
      }
    }

    if (room.currentStatus === 'MAINTENANCE') {
      return {
        isAvailable: false,
        reason: '会议室正在维护中'
      }
    }

    // 检查时间冲突
    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS']
        },
        OR: [
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gt: new Date(startTime) } }
            ]
          }
        ]
      }
    })

    if (conflictingReservation) {
      return {
        isAvailable: false,
        reason: '该时间段已被其他预约占用'
      }
    }

    return { isAvailable: true }

  } catch (error) {
    console.error('检查会议室可用性失败:', error)
    return {
      isAvailable: false,
      reason: '无法检查会议室可用性'
    }
  }
}

/**
 * 创建预约记录
 */
async function createReservation(data: any) {
  const reservation = await prisma.reservation.create({
    data: {
      title: data.title,
      description: data.description || '', // 快捷预约可能没有描述
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      roomId: data.roomId,
      organizerId: data.organizerId,
      attendeeCount: data.attendeeCount,
      status: data.status,
      type: data.type,
      attendees: JSON.stringify([]), // 快捷预约默认没有参会者列表
      materials: JSON.stringify([]), // 快捷预约默认没有材料
      recurrenceRule: null, // 快捷预约不支持重复
      metadata: JSON.stringify({
        source: 'quick_reservation',
        userAgent: getHeader(event, 'user-agent'),
        ipAddress: getClientIP(event)
      })
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true,
          equipment: true
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

  // 格式化返回数据
  return {
    ...reservation,
    attendees: [],
    materials: [],
    recurrenceRule: null,
    formattedDate: new Date(reservation.startTime).toLocaleDateString('zh-CN'),
    formattedTime: {
      start: new Date(reservation.startTime).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      end: new Date(reservation.endTime).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    duration: Math.round(
      (new Date(reservation.endTime).getTime() - new Date(reservation.startTime).getTime()) /
      (1000 * 60)
    ) // 分钟
  }
}

/**
 * 记录审计日志
 */
async function logAuditEvent(logData: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: logData.userId,
        action: logData.action,
        resourceId: logData.resourceId,
        resourceType: 'RESERVATION',
        details: logData.details,
        ipAddress: getClientIP(event),
        userAgent: getHeader(event, 'user-agent'),
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('记录审计日志失败:', error)
    // 审计日志失败不影响主流程
  }
}

/**
 * 发送预约通知
 */
async function sendReservationNotification(reservation: any, user: any) {
  try {
    // 这里可以集成邮件、短信或WebSocket通知
    console.log(`发送预约通知给用户: ${user.email}`, {
      reservationId: reservation.id,
      title: reservation.title,
      startTime: reservation.startTime,
      roomName: reservation.room?.name
    })

    // 发送WebSocket通知
    // await sendWebSocketNotification(user.id, {
    //   type: 'reservation_created',
    //   data: reservation
    // })

  } catch (error) {
    console.error('发送预约通知失败:', error)
    // 通知失败不影响主流程
  }
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

/**
 * 检查用户权限
 */
async function checkUserPermission(user: any, resource: string, action: string) {
  // 这里需要根据实际的权限系统来检查
  // 暂时返回true，表示允许所有操作
  return true
}