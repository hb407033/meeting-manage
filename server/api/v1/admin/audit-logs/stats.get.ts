import { auditLogger } from '~~/server/utils/audit'
import { hasPermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户权限
    const user = await getServerSession(event)
    if (!user || !await hasPermission(user.id, 'audit:read')) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，需要审计日志查看权限'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const { days = '30' } = query

    // 参数验证
    const daysNum = Math.min(365, Math.max(1, parseInt(days as string) || 30))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)

    // 获取数据库实例
    const db = new (await import ('~~/server/services/database')).DatabaseService()

    // 并行查询各种统计数据
    const [
      totalLogs,
      resultStats,
      riskLevelStats,
      actionStats,
      resourceStats,
      userStats,
      recentHighRiskLogs,
      dailyStats
    ] = await Promise.all([
      // 总日志数
      db.getClient().auditLog.count({
        where: {
          timestamp: {
            gte: startDate
          }
        }
      }),

      // 操作结果统计
      db.getClient().auditLog.groupBy({
        by: ['result'],
        where: {
          timestamp: {
            gte: startDate
          }
        },
        _count: true
      }),

      // 风险级别统计
      db.getClient().auditLog.groupBy({
        by: ['riskLevel'],
        where: {
          timestamp: {
            gte: startDate
          }
        },
        _count: true
      }),

      // 操作类型统计（前10）
      db.getClient().auditLog.groupBy({
        by: ['action'],
        where: {
          timestamp: {
            gte: startDate
          }
        },
        _count: true,
        orderBy: {
          _count: {
            action: 'desc'
          }
        },
        take: 10
      }),

      // 资源类型统计
      db.getClient().auditLog.groupBy({
        by: ['resourceType'],
        where: {
          timestamp: {
            gte: startDate
          }
        },
        _count: true
      }),

      // 活跃用户统计（前10）
      db.getClient().auditLog.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: startDate
          },
          userId: {
            not: null
          }
        },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc'
          }
        },
        take: 10
      }),

      // 最近的高风险操作
      db.getClient().auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate
          },
          riskLevel: {
            in: ['HIGH', 'CRITICAL']
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 20
      }),

      // 每日统计（最近30天）
      db.getClient().$queryRaw`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as count,
          SUM(CASE WHEN result = 'SUCCESS' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN result = 'FAILURE' THEN 1 ELSE 0 END) as failure,
          SUM(CASE WHEN riskLevel = 'HIGH' OR riskLevel = 'CRITICAL' THEN 1 ELSE 0 END) as highRisk
        FROM audit_logs
        WHERE timestamp >= ${startDate}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        LIMIT 30
      ` as Array<{
        date: Date
        count: bigint
        success: bigint
        failure: bigint
        highRisk: bigint
      }>
    ])

    // 获取用户详细信息
    const userIds = userStats.map(stat => stat.userId).filter(Boolean)
    const users = userIds.length > 0 ? await db.getClient().user.findMany({
      where: {
        id: {
          in: userIds as string[]
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    }) : []

    // 构建用户映射
    const userMap = users.reduce((map, user) => {
      map[user.id] = user
      return map
    }, {} as Record<string, any>)

    // 处理统计数据格式
    const resultDistribution = resultStats.reduce((acc, stat) => {
      acc[stat.result] = Number(stat._count)
      return acc
    }, {} as Record<string, number>)

    const riskLevelDistribution = riskLevelStats.reduce((acc, stat) => {
      acc[stat.riskLevel] = Number(stat._count)
      return acc
    }, {} as Record<string, number>)

    const actionDistribution = actionStats.map(stat => ({
      action: stat.action,
      count: Number(stat._count)
    }))

    const resourceDistribution = resourceStats.map(stat => ({
      resourceType: stat.resourceType,
      count: Number(stat._count)
    }))

    const userActivityStats = userStats.map(stat => ({
      userId: stat.userId,
      count: Number(stat._count),
      user: stat.userId ? userMap[stat.userId] : null
    }))

    const recentHighRiskActivities = recentHighRiskLogs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      riskLevel: log.riskLevel,
      result: log.result,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress,
      user: log.user
    }))

    const dailyActivityStats = dailyStats.map(stat => ({
      date: stat.date,
      total: Number(stat.count),
      success: Number(stat.success),
      failure: Number(stat.failure),
      highRisk: Number(stat.highRisk)
    }))

    // 记录审计日志
    await auditLogger.logAdminAction(
      user.id,
      'stats',
      'audit_logs',
      undefined,
      {
        period: daysNum,
        totalLogs,
        queryType: 'statistics'
      },
      getClientIP(event),
      getHeader(event, 'user-agent')
    )

    return createSuccessResponse({
      summary: {
        totalLogs,
        periodDays: daysNum,
        startDate,
        endDate: new Date()
      },
      distributions: {
        result: resultDistribution,
        riskLevel: riskLevelDistribution,
        actions: actionDistribution,
        resources: resourceDistribution
      },
      userActivity: userActivityStats,
      recentHighRiskActivities,
      dailyActivity: dailyActivityStats,
      trends: {
        // 简单的趋势计算（最近7天 vs 前7天）
        recentWeekAverage: dailyActivityStats.slice(0, 7).reduce((sum, day) => sum + day.total, 0) / Math.min(7, dailyActivityStats.length),
        previousWeekAverage: dailyActivityStats.slice(7, 14).reduce((sum, day) => sum + day.total, 0) / Math.min(7, dailyActivityStats.slice(7, 14).length)
      }
    })

  } catch (error) {
    console.error('Failed to get audit log stats:', error)

    // 如果是已知错误，直接抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // 未知错误返回通用错误信息
    throw createError({
      statusCode: 500,
      statusMessage: '获取审计日志统计失败'
    })
  }
})