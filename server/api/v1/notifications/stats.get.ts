import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权访问'
      })
    }

    const query = getQuery(event)
    const {
      period = '30', // 默认30天
      type,
      channel
    } = query

    const days = parseInt(period as string)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 构建查询条件
    const whereCondition: any = {
      date: {
        gte: startDate,
        lte: new Date()
      }
    }

    // 如果指定了用户ID，获取用户统计数据
    if (query.user !== 'system') {
      whereCondition.userId = user.sub
    }

    if (type) {
      whereCondition.type = type
    }

    if (channel) {
      whereCondition.channel = channel
    }

    // 获取统计数据
    const stats = await prisma.notificationStats.findMany({
      where: whereCondition,
      orderBy: {
        date: 'desc'
      }
    })

    // 计算总体统计
    const totalStats = stats.reduce((acc, stat) => ({
      totalSent: acc.totalSent + stat.totalSent,
      totalDelivered: acc.totalDelivered + stat.totalDelivered,
      totalRead: acc.totalRead + stat.totalRead,
      totalFailed: acc.totalFailed + stat.totalFailed,
      totalDeliveryTime: acc.totalDeliveryTime + (stat.avgDeliveryTime || 0) * stat.totalDelivered
    }), {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0,
      totalDeliveryTime: 0
    })

    // 计算平均送达时间
    const avgDeliveryTime = totalStats.totalDelivered > 0
      ? totalStats.totalDeliveryTime / totalStats.totalDelivered
      : 0

    // 按类型统计
    const typeStats = stats.reduce((acc: Record<string, any>, stat) => {
      if (!acc[stat.type]) {
        acc[stat.type] = {
          totalSent: 0,
          totalDelivered: 0,
          totalRead: 0,
          totalFailed: 0
        }
      }
      acc[stat.type].totalSent += stat.totalSent
      acc[stat.type].totalDelivered += stat.totalDelivered
      acc[stat.type].totalRead += stat.totalRead
      acc[stat.type].totalFailed += stat.totalFailed
      return acc
    }, {})

    // 按渠道统计
    const channelStats = stats.reduce((acc: Record<string, any>, stat) => {
      if (!acc[stat.channel]) {
        acc[stat.channel] = {
          totalSent: 0,
          totalDelivered: 0,
          totalRead: 0,
          totalFailed: 0
        }
      }
      acc[stat.channel].totalSent += stat.totalSent
      acc[stat.channel].totalDelivered += stat.totalDelivered
      acc[stat.channel].totalRead += stat.totalRead
      acc[stat.channel].totalFailed += stat.totalFailed
      return acc
    }, {})

    // 按日期统计（用于图表）
    const dailyStats = stats.reduce((acc: Record<string, any>, stat) => {
      const dateStr = stat.date.toISOString().split('T')[0]
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          totalSent: 0,
          totalDelivered: 0,
          totalRead: 0,
          totalFailed: 0
        }
      }
      acc[dateStr].totalSent += stat.totalSent
      acc[dateStr].totalDelivered += stat.totalDelivered
      acc[dateStr].totalRead += stat.totalRead
      acc[dateStr].totalFailed += stat.totalFailed
      return acc
    }, {})

    // 计算关键指标
    const deliveryRate = totalStats.totalSent > 0
      ? (totalStats.totalDelivered / totalStats.totalSent * 100).toFixed(2)
      : '0'

    const readRate = totalStats.totalDelivered > 0
      ? (totalStats.totalRead / totalStats.totalDelivered * 100).toFixed(2)
      : '0'

    const failureRate = totalStats.totalSent > 0
      ? (totalStats.totalFailed / totalStats.totalSent * 100).toFixed(2)
      : '0'

    // 获取最近的提醒活动
    const recentNotifications = await prisma.notification.findMany({
      where: {
        userId: query.user !== 'system' ? user.sub : undefined,
        createdAt: {
          gte: startDate
        },
        type: 'RECURRING_REMINDER'
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        reservation: {
          include: {
            room: true
          }
        }
      }
    })

    return createSuccessResponse({
      period: days,
      summary: {
        totalSent: totalStats.totalSent,
        totalDelivered: totalStats.totalDelivered,
        totalRead: totalStats.totalRead,
        totalFailed: totalStats.totalFailed,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        deliveryRate: parseFloat(deliveryRate),
        readRate: parseFloat(readRate),
        failureRate: parseFloat(failureRate)
      },
      typeStats: Object.entries(typeStats).map(([type, stats]: [string, any]) => ({
        type,
        ...stats,
        deliveryRate: stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent * 100).toFixed(2) : '0',
        readRate: stats.totalDelivered > 0 ? (stats.totalRead / stats.totalDelivered * 100).toFixed(2) : '0'
      })),
      channelStats: Object.entries(channelStats).map(([channel, stats]: [string, any]) => ({
        channel,
        ...stats,
        deliveryRate: stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent * 100).toFixed(2) : '0',
        readRate: stats.totalDelivered > 0 ? (stats.totalRead / stats.totalDelivered * 100).toFixed(2) : '0'
      })),
      dailyStats: Object.values(dailyStats).sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      recentNotifications: recentNotifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        content: notification.content,
        status: notification.status,
        priority: notification.priority,
        createdAt: notification.createdAt,
        sentAt: notification.sentAt,
        readAt: notification.readAt,
        reservation: notification.reservation ? {
          id: notification.reservation.id,
          title: notification.reservation.title,
          room: notification.reservation.room?.name,
          startTime: notification.reservation.startTime
        } : null
      }))
    })
  } catch (error) {
    console.error('Failed to get notification stats:', error)
    return createErrorResponse(50000, '获取通知统计失败', error.message)
  }
})