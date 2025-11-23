/**
 * 使用率趋势统计API
 * GET /api/v1/statistics/usage-trend
 *
 * 返回指定时间段内的会议室使用率趋势数据
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
    const period = parseInt(query.period as string) || 7 // 默认7天

    // 验证参数
    if (![7, 30, 90].includes(period)) {
      return createErrorResponse('INVALID_PARAMETER', '时间段参数无效，支持7、30、90天')
    }

    // 计算趋势数据
    const trendData = await calculateUsageTrend(period)

    return createSuccessResponse(trendData, '使用率趋势数据获取成功')

  } catch (error) {
    console.error('获取使用率趋势失败:', error)
    return createErrorResponse('INTERNAL_ERROR', '获取使用率趋势数据失败')
  }
})

/**
 * 计算使用率趋势数据
 */
async function calculateUsageTrend(period: number) {
  const now = new Date()
  const startDate = new Date(now.getTime() - period * 24 * 60 * 60 * 1000)

  try {
    // 获取指定时间段内的每日使用率数据
    const dailyUsage = await Prisma.$queryRaw`
      SELECT
        DATE(startTime) as date,
        COUNT(DISTINCT roomId) as roomsUsed,
        COUNT(*) as totalBookings,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedBookings,
        SUM(EXTRACT(EPOCH FROM (endTime - startTime))/3600) as totalHours
      FROM Reservation
      WHERE startTime >= ${startDate}
        AND startTime < ${now}
        AND status IN ('CONFIRMED', 'COMPLETED')
      GROUP BY DATE(startTime)
      ORDER BY date ASC
    ` as Array<{
      date: Date
      roomsUsed: bigint
      totalBookings: bigint
      completedBookings: bigint
      totalHours: bigint
    }>

    // 获取总会议室数
    const totalRooms = await Prisma.meetingRoom.count({
      where: {
        status: 'AVAILABLE'
      }
    })

    // 如果没有会议室，返回空数据
    if (totalRooms === 0) {
      return {
        period,
        totalRooms: 0,
        data: [],
        statistics: {
          averageUsage: 0,
          peakUsage: 0,
          totalMeetings: 0,
          averageDuration: 0
        }
      }
    }

    // 处理数据并计算使用率
    const processedData = []
    let totalUsage = 0
    let totalMeetings = 0
    let peakUsage = 0

    // 填充缺失的日期，确保连续性
    const dateMap = new Map()
    dailyUsage.forEach(item => {
      dateMap.set(item.date.toISOString().split('T')[0], item)
    })

    // 生成连续的日期范围
    for (let i = 0; i < period; i++) {
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = currentDate.toISOString().split('T')[0]
      const dayData = dateMap.get(dateStr)

      let usage = 0
      let meetings = 0
      let hours = 0

      if (dayData) {
        usage = Math.min(Math.round((Number(dayData.roomsUsed) / totalRooms) * 100), 100)
        meetings = Number(dayData.totalBookings)
        hours = Number(dayData.totalHours)
      }

      processedData.push({
        date: dateStr,
        usage,
        meetings,
        hours: Math.round(hours * 10) / 10 // 保留1位小数
      })

      totalUsage += usage
      totalMeetings += meetings
      peakUsage = Math.max(peakUsage, usage)
    }

    // 计算统计数据
    const averageUsage = Math.round(totalUsage / period)
    const averageDuration = totalMeetings > 0
      ? Math.round((processedData.reduce((sum, item) => sum + item.hours, 0) / totalMeetings) * 10) / 10
      : 0

    return {
      period,
      totalRooms,
      data: processedData,
      statistics: {
        averageUsage,
        peakUsage,
        totalMeetings,
        averageDuration
      }
    }

  } catch (error) {
    console.error('计算使用率趋势失败:', error)
    // 返回默认数据
    return {
      period,
      totalRooms: 0,
      data: [],
      statistics: {
        averageUsage: 0,
        peakUsage: 0,
        totalMeetings: 0,
        averageDuration: 0
      },
      error: '计算趋势数据时出现错误'
    }
  }
}