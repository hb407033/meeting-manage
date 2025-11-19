import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { getRequiredCurrentUser } from '~~/server/utils/auth'
import Prisma from '~~/server/services/database'

interface AvailabilityRequest {
  roomIds: string[]
  startTime: string // ISO datetime
  endTime: string   // ISO datetime
  includeUnavailable?: boolean
}

interface AvailabilityCacheKey {
  roomIds: string[]
  startTime: string
  endTime: string
}

interface AvailabilityResponse {
  [roomId: string]: {
    roomId: string
    roomName: string
    status: 'available' | 'unavailable' | 'maintenance'
    availableSlots?: Array<{
      startTime: string
      endTime: string
      duration: number // minutes
    }>
    reservations?: Array<{
      id: string
      title: string
      startTime: string
      endTime: string
      organizerName?: string
      status: string
    }>
    maintenanceSlots?: Array<{
      id: string
      startTime: string
      endTime: string
      reason?: string
    }>
  }
}

/**
 * 计算会议室在指定时间段内的可用时间段，按30分钟切分
 */
function calculateAvailableSlots(
  queryStartTime: Date,
  queryEndTime: Date,
  reservations: any[],
  roomStatus: string,
  operatingHours?: { start: string; end: string }
): Array<{ startTime: string; endTime: string; duration: number }> {
  const availableSlots: Array<{ startTime: string; endTime: string; duration: number }> = []

  // 如果会议室状态不是可用，返回空数组
  if (roomStatus !== 'AVAILABLE') {
    return availableSlots
  }

  // 过滤出有效预约（非已取消且与查询时间有重叠）
  const validReservations = reservations
    .filter(r => r.status !== 'CANCELED')
    .map(r => ({
      startTime: new Date(r.startTime),
      endTime: new Date(r.endTime)
    }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // 确定24小时制的开始和结束时间
  let dayStart = new Date(queryStartTime)
  dayStart.setHours(0, 0, 0, 0)

  let dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  // 应用营业时间限制
  if (operatingHours) {
    const [startHour, startMinute] = operatingHours.start.split(':').map(Number)
    const [endHour, endMinute] = operatingHours.end.split(':').map(Number)

    dayStart.setHours(startHour, startMinute, 0, 0)
    dayEnd.setHours(endHour, endMinute, 59, 999)
  }

  // 确保查询时间在营业时间内
  const effectiveStart = new Date(Math.max(queryStartTime.getTime(), dayStart.getTime()))
  const effectiveEnd = new Date(Math.min(queryEndTime.getTime(), dayEnd.getTime()))

  // 按30分钟切分时间段
  const SLOT_DURATION = 30 * 60 * 1000 // 30分钟的毫秒数
  let currentTime = new Date(effectiveStart)

  while (currentTime < effectiveEnd) {
    const slotEndTime = new Date(Math.min(currentTime.getTime() + SLOT_DURATION, effectiveEnd.getTime()))

    // 检查当前时间段是否与任何预约重叠
    const isOverlapping = validReservations.some(reservation =>
      (currentTime < reservation.endTime) && (slotEndTime > reservation.startTime)
    )

    // 如果没有重叠，则添加到可用时间段
    if (!isOverlapping && slotEndTime > currentTime) {
      const duration = Math.floor((slotEndTime.getTime() - currentTime.getTime()) / (1000 * 60))

      availableSlots.push({
        startTime: currentTime.toISOString(),
        endTime: slotEndTime.toISOString(),
        duration
      })
    }

    // 移动到下一个30分钟时间段
    currentTime = new Date(currentTime.getTime() + SLOT_DURATION)
  }

  return availableSlots
}

export default defineEventHandler(async (event) => {
  const startTimeOverall = Date.now()

  try {
    // 验证用户会话
    const user = await getRequiredCurrentUser(event)

    // 获取请求体
    const body = await readBody(event) as AvailabilityRequest

    // 临时简化：移除缓存功能，先实现基本查询
    // const cacheParams: AvailabilityCacheKey = {
    //   roomIds: body.roomIds,
    //   startTime: body.startTime,
    //   endTime: body.endTime
    // }

    // 尝试从缓存获取数据
    // const cachedData = await availabilityCacheService.getAvailability(cacheParams)
    // if (cachedData) {
    //   const cacheTime = Date.now() - startTimeOverall
    //   console.log(`📦 Cache hit! Total response time: ${cacheTime}ms`)
    //   return createSuccessResponse(cachedData)
    // }

    // 验证请求参数
    if (!body.roomIds || !Array.isArray(body.roomIds) || body.roomIds.length === 0) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, 'roomIds 参数是必需的')
    }

    if (!body.startTime || !body.endTime) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, 'startTime 和 endTime 参数是必需的')
    }

    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '时间格式无效')
    }

    if (startTime >= endTime) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '开始时间必须早于结束时间')
    }

    // 查询时间范围限制（最多查询30天）
    const maxQueryRange = 30 * 24 * 60 * 60 * 1000 // 30天
    if (endTime.getTime() - startTime.getTime() > maxQueryRange) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '查询时间范围不能超过30天')
    }

    // TODO: 实现缓存服务
    // 暂时跳过缓存，直接查询数据库
    // const cacheParams: AvailabilityCacheKey = {
    //   roomIds: body.roomIds,
    //   startTime: body.startTime,
    //   endTime: body.endTime
    // }
    //
    // // 尝试从缓存获取数据
    // const cachedData = await availabilityCacheService.getAvailability(cacheParams)
    // if (cachedData) {
    //   const cacheTime = Date.now() - startTimeOverall
    //   console.log(`📦 Cache hit! Total response time: ${cacheTime}ms`)
    //   return createSuccessResponse(cachedData)
    // }

    // 查询会议室信息
    const rooms = await Prisma.meetingRoom.findMany({
      where: {
        id: { in: body.roomIds },
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        status: true,
        capacity: true
      }
    })

    if (rooms.length === 0) {
      return createErrorResponse(API_CODES.NOT_FOUND, '未找到有效的会议室')
    }

    // 查询指定时间段内的所有预约
    const reservations = await Prisma.reservation.findMany({
      where: {
        roomId: { in: body.roomIds },
        status: {
          notIn: ['CANCELED']
        },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ]
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

    // 按会议室分组预约
    const reservationsByRoom: Record<string, any[]> = {}
    reservations.forEach(reservation => {
      if (!reservationsByRoom[reservation.roomId]) {
        reservationsByRoom[reservation.roomId] = []
      }
      reservationsByRoom[reservation.roomId].push(reservation)
    })

    // 构建响应数据
    const response: AvailabilityResponse = {}

    for (const room of rooms) {
      const roomReservations = reservationsByRoom[room.id] || []

      // 计算可用时间段
      const availableSlots = calculateAvailableSlots(
        startTime,
        endTime,
        roomReservations,
        room.status,
        room.operatingHours
      )

      response[room.id] = {
        roomId: room.id,
        roomName: room.name,
        status: room.status === 'AVAILABLE' && availableSlots.length > 0 ? 'available' :
               room.status === 'MAINTENANCE' ? 'maintenance' : 'unavailable',
        availableSlots,
        reservations: roomReservations.map(reservation => ({
          id: reservation.id,
          title: reservation.title,
          startTime: reservation.startTime.toISOString(),
          endTime: reservation.endTime.toISOString(),
          organizerName: reservation.organizer.name,
          status: reservation.status
        })),
        maintenanceSlots: room.status === 'MAINTENANCE' ? [{
          id: `maintenance-${room.id}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          reason: '会议室维护中'
        }] : []
      }
    }

    // 记录性能指标
    const totalTime = Date.now() - startTimeOverall
    console.log(`🚀 Availability query completed in ${totalTime}ms for ${body.roomIds.length} rooms`)

    // 性能警告
    if (totalTime > 200) {
      console.warn(`⚠️ Slow availability query: ${totalTime}ms (target: < 200ms)`)
    }

    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Availability query error:', error)

    if (error instanceof Error) {
      return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, error.message)
    }

    return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, '查询可用性失败')
  }
})