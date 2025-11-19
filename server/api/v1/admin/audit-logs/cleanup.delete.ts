import { auditService } from '~~/server/services/audit-service'
import { auditLogger } from '~~/server/utils/audit'
import { hasPermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户权限
    const user = await getServerSession(event)
    if (!user || !await hasPermission(user.id, 'audit:cleanup')) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，需要审计日志清理权限'
      })
    }

    // 获取请求体
    const body = await readBody(event)
    const {
      olderThanDays = 365, // 默认清理365天前的数据
      riskLevel, // 可选：只清理特定风险级别的日志
      dryRun = false // 是否为试运行
    } = body

    // 参数验证
    if (olderThanDays < 30) {
      throw createError({
        statusCode: 400,
        statusMessage: '清理天数不能少于30天，以确保保留足够的审计记录'
      })
    }

    if (olderThanDays > 2555) { // 7年
      throw createError({
        statusCode: 400,
        statusMessage: '清理天数不能超过7年'
      })
    }

    // 获取数据库实例
    const db = new (await import('~~/server/services/database')).DatabaseService()

    // 计算清理日期
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // 构建清理条件
    const where: any = {
      timestamp: {
        lt: cutoffDate
      }
    }

    // 按风险级别过滤
    if (riskLevel && riskLevel !== 'ALL') {
      where.riskLevel = riskLevel
    }

    // 重要：不允许清理高风险和关键级别的日志
    if (!riskLevel) {
      where.riskLevel = {
        notIn: ['HIGH', 'CRITICAL']
      }
    }

    // 先查询要删除的记录数量
    const logsToDelete = await db.getClient().auditLog.count({
      where
    })

    if (logsToDelete === 0) {
      return createSuccessResponse({
        message: '没有找到需要清理的审计日志',
        deletedCount: 0,
        cutoffDate,
        dryRun
      })
    }

    // 如果是试运行，只返回要删除的统计信息
    if (dryRun) {
      // 获取详细的统计信息
      const stats = await db.getClient().auditLog.groupBy({
        by: ['riskLevel', 'result'],
        where,
        _count: true
      })

      return createSuccessResponse({
        message: '试运行模式：以下审计日志将被清理',
        deletedCount: logsToDelete,
        cutoffDate,
        dryRun: true,
        statistics: stats.map(stat => ({
          riskLevel: stat.riskLevel,
          result: stat.result,
          count: Number(stat._count)
        }))
      })
    }

    // 实际删除操作
    const deleteResult = await db.getClient().auditLog.deleteMany({
      where
    })

    const deletedCount = deleteResult.count

    // 记录审计日志
    await auditLogger.logAdminAction(
      user.id,
      'cleanup',
      'audit_logs',
      undefined,
      {
        deletedCount,
        cutoffDate,
        filters: { olderThanDays, riskLevel },
        duration: olderThanDays
      },
      getClientIP(event),
      getHeader(event, 'user-agent')
    )

    return createSuccessResponse({
      message: `成功清理 ${deletedCount} 条审计日志`,
      deletedCount,
      cutoffDate,
      dryRun: false
    })

  } catch (error) {
    console.error('Failed to cleanup audit logs:', error)

    // 如果是已知错误，直接抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // 未知错误返回通用错误信息
    throw createError({
      statusCode: 500,
      statusMessage: '清理审计日志失败'
    })
  }
})