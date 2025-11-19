import { auditLogger } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  try {
    // 获取查询参数
    const query = getQuery(event)
    const {
      page = '1',
      limit = '25',
      search,
      result,
      riskLevel
    } = query

    // 参数验证
    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 25))
    const offset = (pageNum - 1) * limitNum

    // 获取数据库实例
    const db = new (await import('~~/server/services/database')).DatabaseService()

    // 构建查询条件
    const where: any = {}

    if (result) {
      where.result = result
    }
    if (riskLevel) {
      where.riskLevel = riskLevel
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