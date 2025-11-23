/**
 * 会议室可用性查询API
 * GET /api/v1/rooms/availability
 *
 * 查询会议室的可用性状态和今日预约情况
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

    // 检查查看权限
    const hasPermission = await checkUserPermission(user, 'room', 'read')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const date = query.date as string
    const location = query.location as string
    const capacity = parseInt(query.capacity as string) || undefined
    const includeBookings = query.includeBookings === 'true'

    // 设置查询日期（默认为今天）
    const queryDate = date ? new Date(date) : new Date()
    const dayStart = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    // 构建会议室查询条件
    const roomWhere: any = {
      status: 'AVAILABLE'
    }

    if (location) {
      roomWhere.location = location
    }

    if (capacity) {
      roomWhere.capacity = {
        gte: capacity
      }
    }

    // 获取会议室列表
    const rooms = await prisma.meetingRoom.findMany({
      where: roomWhere,
      select: {
        id: true,
        name: true,
        location: true,
        capacity: true,
        equipment: true,
        status: true
      },
      orderBy: [
        { location: 'asc' },
        { name: 'asc' }
      ]
    })

    // 获取每个会议室的预约情况
    const roomsWithAvailability = await Promise.all(
      rooms.map(async (room) => {
        // 查询当天的预约
        const todayBookings = includeBookings
          ? await prisma.reservation.findMany({
              where: {
                roomId: room.id,
                startTime: {
                  gte: dayStart
                },
                endTime: {
                  lt: dayEnd
                },
                status: {
                  in: ['CONFIRMED']
                }
              },
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                status: true
              },
              orderBy: {
                startTime: 'asc'
              }
            })
          : []

        // 检查当前时间段是否可用
        const now = new Date()
        const currentBooking = todayBookings.find(booking =>
          new Date(booking.startTime) <= now && new Date(booking.endTime) > now
        )

        // 计算可用时间段
        const availableTimeSlots = calculateAvailableTimeSlots(todayBookings, dayStart, dayEnd)

        return {
          ...room,
          currentStatus: room.status,
          statusText: getStatusText(room.status),
          todayBookings: todayBookings.map(booking => ({
            ...booking,
            formattedTime: {
              start: new Date(booking.startTime).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              end: new Date(booking.endTime).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          })),
          isCurrentlyAvailable: !currentBooking,
          currentBooking: currentBooking ? {
            id: currentBooking.id,
            title: currentBooking.title,
            endTime: currentBooking.endTime
          } : null,
          availableTimeSlots,
          totalBookingsToday: todayBookings.length,
          availableHours: calculateAvailableHours(availableTimeSlots),
          utilizationRate: calculateUtilizationRate(todayBookings, dayStart, dayEnd)
        }
      })
    )

    // 按位置分组统计
    const locationStats = roomsWithAvailability.reduce((stats, room) => {
      if (!stats[room.location]) {
        stats[room.location] = {
          location: room.location,
          totalRooms: 0,
          availableRooms: 0,
          occupiedRooms: 0,
          utilizationRate: 0
        }
      }

      stats[room.location].totalRooms++

      if (room.status === 'AVAILABLE') {
        stats[room.location].availableRooms++
      } else if (room.status === 'OCCUPIED') {
        stats[room.location].occupiedRooms++
      }

      stats[room.location].utilizationRate += room.utilizationRate || 0

      return stats
    }, {} as Record<string, any>)

    // 计算平均利用率
    Object.values(locationStats).forEach((stat: any) => {
      stat.utilizationRate = stat.totalRooms > 0
        ? Math.round(stat.utilizationRate / stat.totalRooms)
        : 0
    })

    return {
      success: true,
      data: roomsWithAvailability,
      summary: {
        totalRooms: roomsWithAvailability.length,
        availableRooms: roomsWithAvailability.filter(r => r.status === 'AVAILABLE').length,
        occupiedRooms: roomsWithAvailability.filter(r => r.status === 'OCCUPIED').length,
        averageUtilizationRate: Math.round(
          roomsWithAvailability.reduce((sum, r) => sum + (r.utilizationRate || 0), 0) / roomsWithAvailability.length
        ),
        date: queryDate.toISOString().split('T')[0]
      },
      locationStats: Object.values(locationStats),
      filters: {
        date: queryDate.toISOString().split('T')[0],
        location,
        capacity,
        includeBookings
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('查询会议室可用性失败:', error)

    // 如果是已知的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 未知错误
    throw createError({
      statusCode: 500,
      statusMessage: '查询会议室可用性失败'
    })
  }
})

/**
 * 计算可用时间段
 */
function calculateAvailableTimeSlots(bookings: any[], dayStart: Date, dayEnd: Date) {
  const slots = []
  let currentTime = new Date(dayStart)

  // 按开始时间排序预约
  const sortedBookings = bookings.sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  for (const booking of sortedBookings) {
    const bookingStart = new Date(booking.startTime)
    const bookingEnd = new Date(booking.endTime)

    // 如果当前时间在预约开始之前，且间隔超过30分钟，则添加可用时间段
    if (currentTime < bookingStart) {
      const duration = (bookingStart.getTime() - currentTime.getTime()) / (1000 * 60) // 分钟
      if (duration >= 30) { // 30分钟以上的空闲时间才显示
        slots.push({
          start: new Date(currentTime),
          end: new Date(bookingStart),
          duration: Math.round(duration)
        })
      }
    }

    // 更新当前时间为预约结束时间
    if (bookingEnd > currentTime) {
      currentTime = new Date(bookingEnd)
    }
  }

  // 检查最后一个预约之后的时间
  if (currentTime < dayEnd) {
    const duration = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60)
    if (duration >= 30) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(dayEnd),
        duration: Math.round(duration)
      })
    }
  }

  return slots
}

/**
 * 计算可用小时数
 */
function calculateAvailableHours(slots: any[]): number {
  return slots.reduce((total, slot) => total + slot.duration / 60, 0)
}

/**
 * 计算利用率
 */
function calculateUtilizationRate(bookings: any[], dayStart: Date, dayEnd: Date): number {
  if (bookings.length === 0) return 0

  const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60)
  const bookedMinutes = bookings.reduce((total, booking) => {
    const start = Math.max(new Date(booking.startTime).getTime(), dayStart.getTime())
    const end = Math.min(new Date(booking.endTime).getTime(), dayEnd.getTime())
    return total + (end - start) / (1000 * 60)
  }, 0)

  return Math.round((bookedMinutes / totalMinutes) * 100)
}

/**
 * 获取状态文本
 */
function getStatusText(status: string): string {
  const statusMap = {
    'AVAILABLE': '可用',
    'OCCUPIED': '使用中',
    'MAINTENANCE': '维护中',
    'RESERVED': '已预订'
  }
  return statusMap[status as keyof typeof statusMap] || status
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