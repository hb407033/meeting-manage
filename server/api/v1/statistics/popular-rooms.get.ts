/**
 * 热门会议室统计API
 * GET /api/v1/statistics/popular-rooms
 *
 * 返回指定时间段内的热门会议室排行数据
 */
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import { getCurrentUser } from '~~/server/utils/auth'
import Prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 获取认证用户信息
    const user = await getCurrentUser(event)
    if (!user) {
      return createErrorResponse('UNAUTHORIZED', '未授权访问')
    }

    // 获取查询参数
    const query = getQuery(event)
    const timeRange = (query.timeRange as string) || 'today' // 默认今日
    const limit = Math.min(parseInt(query.limit as string) || 10, 20) // 最多20个

    // 验证参数
    if (!['today', 'week', 'month'].includes(timeRange)) {
      return createErrorResponse('INVALID_PARAMETER', '时间范围参数无效，支持today、week、month')
    }

    // 计算热门会议室数据
    const popularRooms = await calculatePopularRooms(timeRange, limit)

    return createSuccessResponse(popularRooms, '热门会议室数据获取成功')

  } catch (error) {
    console.error('获取热门会议室失败:', error)
    return createErrorResponse('INTERNAL_ERROR', '获取热门会议室数据失败')
  }
})

/**
 * 计算热门会议室数据
 */
async function calculatePopularRooms(timeRange: string, limit: number) {
  const now = new Date()
  let startDate: Date

  // 根据时间范围计算开始日期
  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  try {
    // 获取会议室预约统计
    const roomStats = await Prisma.reservation.groupBy({
      by: ['roomId'],
      where: {
        startTime: {
          gte: startDate
        },
        endTime: {
          lte: now
        },
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        }
      },
      _count: {
        id: true
      },
      _sum: {
        duration: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: limit
    })

    // 如果没有数据，返回空数组
    if (roomStats.length === 0) {
      return {
        timeRange,
        data: [],
        summary: {
          totalBookings: 0,
          averageUsageRate: 0,
          peakHours: 'N/A'
        }
      }
    }

    // 获取会议室详细信息
    const roomIds = roomStats.map(stat => stat.roomId)
    const roomDetails = await Prisma.meetingRoom.findMany({
      where: {
        id: {
          in: roomIds
        }
      },
      select: {
        id: true,
        name: true,
        location: true,
        capacity: true,
        status: true,
        equipment: true
      }
    })

    // 获取每个会议室的总使用时长
    const roomUsageHours = await Prisma.reservation.groupBy({
      by: ['roomId'],
      where: {
        roomId: {
          in: roomIds
        },
        startTime: {
          gte: startDate
        },
        endTime: {
          lte: now
        },
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        }
      },
      _sum: {
        duration: true
      }
    })

    // 创建使用时长映射
    const usageMap = new Map()
    roomUsageHours.forEach(usage => {
      usageMap.set(usage.roomId, Number(usage._sum.duration) || 0)
    })

    // 合并数据并计算使用率
    const popularRoomsData = roomStats.map((stat, index) => {
      const room = roomDetails.find(r => r.id === stat.roomId)
      const totalHours = usageMap.get(stat.roomId) || 0

      // 计算使用率（基于时间段）
      let usageRate = 0
      if (timeRange === 'today') {
        // 今日使用率：基于8小时工作时间计算
        const workHours = 8
        usageRate = Math.min(Math.round((totalHours / (workHours * 60)) * 100), 100)
      } else if (timeRange === 'week') {
        // 本周使用率：基于5天工作时间计算
        const workHours = 5 * 8
        usageRate = Math.min(Math.round((totalHours / (workHours * 60)) * 100), 100)
      } else if (timeRange === 'month') {
        // 本月使用率：基于22天工作时间计算
        const workHours = 22 * 8
        usageRate = Math.min(Math.round((totalHours / (workHours * 60)) * 100), 100)
      }

      return {
        id: stat.roomId,
        name: room?.name || '未知会议室',
        location: room?.location || '',
        capacity: room?.capacity || 0,
        status: room?.status || 'UNKNOWN',
        bookings: stat._count.id,
        totalHours: Math.round(totalHours / 60 * 10) / 10, // 转换为小时，保留1位小数
        usageRate,
        equipment: room?.equipment || [],
        rank: index + 1
      }
    })

    // 计算汇总数据
    const totalBookings = popularRoomsData.reduce((sum, room) => sum + room.bookings, 0)
    const averageUsageRate = Math.round(
      popularRoomsData.reduce((sum, room) => sum + room.usageRate, 0) / popularRoomsData.length
    )

    // 分析高峰时段
    const peakHours = await analyzePeakHours(startDate, now)

    return {
      timeRange,
      data: popularRoomsData,
      summary: {
        totalBookings,
        averageUsageRate,
        peakHours
      }
    }

  } catch (error) {
    console.error('计算热门会议室失败:', error)
    return {
      timeRange,
      data: [],
      summary: {
        totalBookings: 0,
        averageUsageRate: 0,
        peakHours: 'N/A'
      },
      error: '计算热门会议室数据时出现错误'
    }
  }
}

/**
 * 分析高峰时段
 */
async function analyzePeakHours(startDate: Date, endDate: Date) {
  try {
    const hourlyStats = await Prisma.$queryRaw`
      SELECT
        EXTRACT(HOUR FROM startTime) as hour,
        COUNT(*) as bookings
      FROM Reservation
      WHERE startTime >= ${startDate}
        AND startTime < ${endDate}
        AND status IN ('CONFIRMED', 'COMPLETED')
      GROUP BY EXTRACT(HOUR FROM startTime)
      ORDER BY bookings DESC
      LIMIT 1
    ` as Array<{
      hour: number
      bookings: bigint
    }>

    if (hourlyStats.length > 0) {
      const peakHour = Number(hourlyStats[0].hour)
      return `${peakHour.toString().padStart(2, '0')}:00-${(peakHour + 2).toString().padStart(2, '0')}:00`
    }

    return 'N/A'
  } catch (error) {
    console.error('分析高峰时段失败:', error)
    return 'N/A'
  }
}