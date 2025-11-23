/**
 * 系统统计信息API
 * GET /api/v1/statistics/system
 *
 * 返回系统整体的会议室使用统计数据
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

    // 计算统计数据
    const statistics = await calculateSystemStatistics()

    return createSuccessResponse(statistics, '统计数据获取成功')

  } catch (error) {
    console.error('获取系统统计失败:', error)
    return createErrorResponse('INTERNAL_ERROR', '获取统计数据失败')
  }
})

/**
 * 计算系统统计数据
 */
async function calculateSystemStatistics() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  try {
    // 首先检查是否有会议室数据
    const totalRooms = await Prisma.meetingRoom.count()

    // 如果没有会议室，返回基本统计数据
    if (totalRooms === 0) {
      return {
        totalRooms: 0,
        availableRooms: 0,
        todayReservations: 0,
        confirmedReservations: 0,
        completedReservations: 0,
        cancelledReservations: 0,
        usageRate: 0,
        successRate: 0,
        weeklyStats: [],
        monthlyStats: {
          totalBookings: 0,
          totalHours: 0,
          averageDuration: 0
        },
        popularRooms: [],
        lastUpdated: new Date().toISOString()
      }
    }

    // 并行执行多个查询
    const [
      availableRooms,
      todayReservations,
      confirmedReservations,
      completedReservations,
      cancelledReservations,
      weeklyStats,
      monthlyStats
    ] = await Promise.all([
      // 当前可用会议室数
      Prisma.meetingRoom.count({
        where: {
          status: 'AVAILABLE'
        }
      }),

      // 今日预约数
      Prisma.reservation.count({
        where: {
          startTime: {
            gte: todayStart
          },
          endTime: {
            lt: todayEnd
          },
          status: {
            in: ['CONFIRMED', 'COMPLETED']
          }
        }
      }),

      // 已确认的预约
      Prisma.reservation.count({
        where: {
          status: 'CONFIRMED'
        }
      }),

      // 已完成的预约（本月）
      Prisma.reservation.count({
        where: {
          status: 'COMPLETED',
          endTime: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        }
      }),

      // 已取消的预约（本月）
      Prisma.reservation.count({
        where: {
          status: 'CANCELED',
          endTime: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        }
      }),

      // 本周统计数据
      getWeeklyStats(),

      // 本月统计数据
      getMonthlyStats()
    ])

    // 计算使用率
    const totalReservations = confirmedReservations + completedReservations + cancelledReservations
    const usageRate = totalRooms > 0 ? Math.round((confirmedReservations / totalRooms) * 100) : 0

    // 计算成功率
    const successRate = totalReservations > 0
      ? Math.round((completedReservations / totalReservations) * 100)
      : 0

    // 获取热门会议室
    const popularRooms = await getPopularRooms()

    return {
      totalRooms,
      availableRooms,
      todayReservations,
      confirmedReservations,
      completedReservations,
      cancelledReservations,
      usageRate,
      successRate,
      weeklyStats,
      monthlyStats,
      popularRooms,
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('计算统计数据失败:', error)
    // 返回默认统计数据，避免整个API失败
    return {
      totalRooms: 0,
      availableRooms: 0,
      todayReservations: 0,
      confirmedReservations: 0,
      completedReservations: 0,
      cancelledReservations: 0,
      usageRate: 0,
      successRate: 0,
      weeklyStats: [],
      monthlyStats: {
        totalBookings: 0,
        totalHours: 0,
        averageDuration: 0
      },
      popularRooms: [],
      lastUpdated: new Date().toISOString(),
      error: '计算统计数据时出现错误'
    }
  }
}

/**
 * 获取本周统计数据
 */
async function getWeeklyStats() {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  try {
    const dailyStats = await Prisma.$queryRaw`
      SELECT
        DATE(startTime) as date,
        COUNT(*) as reservations,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'CANCELED' THEN 1 END) as cancelled
      FROM Reservation
      WHERE startTime >= ${weekStart}
      GROUP BY DATE(startTime)
      ORDER BY date DESC
      LIMIT 7
    ` as Array<{
      date: Date
      reservations: bigint
      completed: bigint
      cancelled: bigint
    }>

    return dailyStats.map(stat => ({
      date: stat.date.toISOString().split('T')[0],
      reservations: Number(stat.reservations),
      completed: Number(stat.completed),
      cancelled: Number(stat.cancelled)
    }))
  } catch (error) {
    console.error('获取周统计数据失败:', error)
    return []
  }
}

/**
 * 获取本月统计数据
 */
async function getMonthlyStats() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  try {
    const totalBookings = await Prisma.reservation.count({
      where: {
        startTime: {
          gte: monthStart
        },
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        }
      }
    })

    return {
      totalBookings,
      totalHours: 0,
      averageDuration: 0
    }
  } catch (error) {
    console.error('获取月统计数据失败:', error)
    return {
      totalBookings: 0,
      totalHours: 0,
      averageDuration: 0
    }
  }
}

/**
 * 获取热门会议室
 */
async function getPopularRooms() {
  try {
    const popularRooms = await Prisma.reservation.groupBy({
      by: ['roomId'],
      where: {
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        },
        startTime: {
          gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000) // 最近30天
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    })

    // 获取会议室详细信息
    const roomIds = popularRooms.map(item => item.roomId)
    const rooms = await Prisma.meetingRoom.findMany({
      where: {
        id: {
          in: roomIds
        }
      },
      select: {
        id: true,
        name: true,
        location: true,
        capacity: true
      }
    })

    // 合并数据
    return popularRooms.map(item => {
      const room = rooms.find(r => r.id === item.roomId)
      return {
        id: item.roomId,
        name: room?.name || '未知会议室',
        location: room?.location || '',
        capacity: room?.capacity || 0,
        bookings: item._count.id
      }
    })
  } catch (error) {
    console.error('获取热门会议室失败:', error)
    return []
  }
}