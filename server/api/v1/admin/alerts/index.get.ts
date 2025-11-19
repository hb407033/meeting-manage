import { alertService, type Alert } from '~~/server/services/alert-service'
import { hasPermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户权限
    const user = await getServerSession(event)
    if (!user || !await hasPermission(user.id, 'audit:read')) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，需要告警查看权限'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const {
      type,
      severity,
      acknowledged,
      resolved,
      page = '1',
      limit = '50'
    } = query

    // 参数验证
    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50))

    // 构建过滤器
    const filter: any = {}
    if (type) filter.type = type
    if (severity) filter.severity = severity
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true'
    if (resolved !== undefined) filter.resolved = resolved === 'true'

    // 获取告警列表
    const alerts = alertService.getActiveAlerts(filter)
    const stats = alertService.getAlertStats()

    // 分页处理
    const startIndex = (pageNum - 1) * limitNum
    const paginatedAlerts = alerts.slice(startIndex, startIndex + limitNum)

    // 计算分页信息
    const totalPages = Math.ceil(alerts.length / limitNum)
    const hasNext = pageNum < totalPages
    const hasPrev = pageNum > 1

    return createSuccessResponse({
      alerts: paginatedAlerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        source: alert.source,
        timestamp: alert.timestamp,
        acknowledged: alert.acknowledged,
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt,
        resolved: alert.resolved,
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt,
        details: alert.details
      })),
      pagination: {
        currentPage: pageNum,
        pageSize: limitNum,
        total: alerts.length,
        totalPages,
        hasNext,
        hasPrev
      },
      stats
    })

  } catch (error) {
    console.error('Failed to get alerts:', error)

    // 如果是已知错误，直接抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // 未知错误返回通用错误信息
    throw createError({
      statusCode: 500,
      statusMessage: '获取告警列表失败'
    })
  }
})