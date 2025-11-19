import { auditLogger } from '~~/server/utils/audit'
import { getCurrentUser, hasPermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户权限
    const user = await getCurrentUser(event)
    if (!user || !await hasPermission(event, 'audit:read')) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，需要审计日志查看权限'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const {
      page = '1',
      limit = '50',
      userId,
      action,
      resourceType,
      resourceId,
      result,
      riskLevel,
      startDate,
      endDate,
      ipAddress,
      search
    } = query

    // 参数验证
    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50))
    const offset = (pageNum - 1) * limitNum

    // 构建查询条件
    const where: any = {}

    if (userId) where.userId = userId
    if (action) where.action = { contains: action as string }
    if (resourceType) where.resourceType = resourceType
    if (resourceId) where.resourceId = resourceId
    if (result) where.result = result
    if (riskLevel) where.riskLevel = riskLevel
    if (ipAddress) where.ipAddress = ipAddress

    // 时间范围过滤
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate as string)
      if (endDate) where.timestamp.lte = new Date(endDate as string)
    }

    // 搜索功能（搜索多个字段）
    if (search) {
      where.OR = [
        { action: { contains: search as string } },
        { resourceType: { contains: search as string } },
        { resourceId: { contains: search as string } },
        { ipAddress: { contains: search as string } }
      ]
    }

    // 获取数据库实例
    const db = new (await import('~~/server/services/database')).DatabaseService()

    // 并行查询总数和数据
    const [total, logs] = await Promise.all([
      db.getClient().auditLog.count({ where }),
      db.getClient().auditLog.findMany({
        where,
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
        skip: offset,
        take: limitNum
      })
    ])

    // 计算分页信息
    const totalPages = Math.ceil(total / limitNum)
    const hasNext = pageNum < totalPages
    const hasPrev = pageNum > 1

    // 记录审计日志
    await auditLogger.logAdminAction(
      user.id,
      'query',
      'audit_logs',
      undefined,
      {
        query: {
          page: pageNum,
          limit: limitNum,
          filters: { userId, action, resourceType, result, riskLevel, startDate, endDate, ipAddress, search }
        },
        resultCount: logs.length,
        total
      },
      getClientIP(event),
      getHeader(event, 'user-agent')
    )

    return createSuccessResponse({
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        userName: log.user?.name,
        userEmail: log.user?.email,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        result: log.result,
        riskLevel: log.riskLevel,
        timestamp: log.timestamp
      })),
      pagination: {
        currentPage: pageNum,
        pageSize: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    })

  } catch (error) {
    console.error('Failed to query audit logs:', error)

    // 如果是已知错误，直接抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // 未知错误返回通用错误信息
    throw createError({
      statusCode: 500,
      statusMessage: '查询审计日志失败'
    })
  }
})