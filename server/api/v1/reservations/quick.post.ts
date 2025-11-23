/**
 * 快捷预约API
 * POST /api/v1/reservations/quick
 *
 * 提供简化的会议室预约创建接口
 */
import prisma from '~~/server/services/database'
import { getCurrentUser, hasPermission } from '~~/server/utils/auth'
import { getHeader } from 'h3'
import { getClientIP } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  try {
    // 获取认证用户信息
    const user = await getCurrentUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权访问'
      })
    }

    // 检查预约权限
    const hasReservationPermission = await hasPermission(event, 'reservation:create')
    if (!hasReservationPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，无法创建预约'
      })
    }

    // 获取请求数据
    const body = await readBody(event)

    // 验证必需字段 (roomId可以在没有指定时自动分配)
    const requiredFields = ['title', 'startTime', 'endTime', 'attendeeCount']
    for (const field of requiredFields) {
      if (!body[field]) {
        throw createError({
          statusCode: 400,
          statusMessage: `缺少必需字段: ${field}`
        })
      }
    }

    // 自动分配会议室 (如果没有指定)
    let roomId = body.roomId
    if (!roomId) {
      const availableRoom = await findAvailableRoom(body.startTime, body.endTime, body.attendeeCount)
      if (!availableRoom) {
        throw createError({
          statusCode: 404,
          statusMessage: '没有找到可用的会议室'
        })
      }
      roomId = availableRoom.id
    }

    // 数据验证
    const validationResult = validateReservationData({
      ...body,
      roomId
    })
    if (!validationResult.isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: validationResult.error
      })
    }

    // 检查会议室可用性
    const availabilityCheck = await checkRoomAvailability(
      roomId,
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
      roomId,
      organizerId: user.id,
      type: 'QUICK',
      status: 'CONFIRMED' // 快捷预约直接确认为已确认状态
    }, event)

    // 记录审计日志（简化版）
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_QUICK_RESERVATION',
          resourceId: reservation.id,
          resourceType: 'RESERVATION',
          details: JSON.stringify({
            title: body.title,
            roomId: reservation.roomId,
            startTime: body.startTime,
            endTime: body.endTime
          }),
          ipAddress: getClientIP(event),
          userAgent: getHeader(event, 'user-agent'),
          timestamp: new Date(),
          result: 'SUCCESS'
        }
      })
    } catch (logError) {
      console.error('记录审计日志失败:', logError)
      // 审计日志失败不影响主流程
    }

    // 发送通知（简化版）
    try {
      console.log(`发送预约通知给用户: ${user.email}`, {
        reservationId: reservation.id,
        title: reservation.title,
        startTime: reservation.startTime,
        roomName: reservation.room?.name
      })
    } catch (notifyError) {
      console.error('发送预约通知失败:', notifyError)
      // 通知失败不影响主流程
    }

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

  // 快捷预约允许当前时间或稍晚开始（提前2分钟以内）
  const twoMinutesFromNow = new Date(now.getTime() - 2 * 60 * 1000)
  if (start < twoMinutesFromNow) {
    return { isValid: false, error: '开始时间过早，请稍后再试' }
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

  // 会议室ID验证 (如果提供了roomId则需要验证)
  if (roomId && typeof roomId !== 'string') {
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
    const room = await prisma.meetingRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        status: true,
        capacity: true,
      }
    })

    if (!room) {
      return {
        isAvailable: false,
        reason: '会议室不存在'
      }
    }

    if (room.status !== 'AVAILABLE') {
      return {
        isAvailable: false,
        reason: '会议室当前不可用'
      }
    }

    if (room.status === 'MAINTENANCE') {
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
          in: ['CONFIRMED']
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
async function createReservation(data: any, event: any) {
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
      specialRequirements: `快速预约 - ${getClientIP(event)}`
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
 * 查找可用会议室
 */
async function findAvailableRoom(startTime: string, endTime: string, attendeeCount: number) {
  try {
    // 查询所有可用的会议室
    const availableRooms = await prisma.meetingRoom.findMany({
      where: {
        status: 'AVAILABLE',
        capacity: {
          gte: attendeeCount
        }
      },
      orderBy: {
        capacity: 'asc' // 优先选择容量合适的会议室
      },
      take: 1 // 只取第一个最合适的
    })

    // 查询时间段内有预约的会议室
    const bookedRooms = await prisma.reservation.findMany({
      where: {
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        },
        startTime: { lt: new Date(endTime) },
        endTime: { gt: new Date(startTime) }
      },
      select: {
        roomId: true
      }
    })

    // 获取被占用的会议室ID集合
    const bookedRoomIds = new Set(bookedRooms.map(r => r.roomId))

    // 过滤出可用的会议室
    const freeRooms = availableRooms.filter(room => !bookedRoomIds.has(room.id))

    return freeRooms[0] || null
  } catch (error) {
    console.error('查找可用会议室失败:', error)
    return null
  }
}

