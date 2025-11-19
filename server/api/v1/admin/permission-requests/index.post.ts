import prisma from '~~/server/services/database'



/**
 * 创建权限申请
 * POST /api/v1/admin/permission-requests
 */
export default defineEventHandler(async (event) => {
  try {
    // 权限检查
    const hasPermission = await checkPermission(event, 'request:create')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，无法创建权限申请'
      })
    }

    const body = await readBody(event)
    const {
      permissions,
      roles,
      reason,
      duration,
      urgency = 'normal',
      attachments = [],
      userAgent,
      currentPath
    } = body

    // 参数验证
    if (!reason || reason.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '申请原因不能为空'
      })
    }

    if ((!permissions || permissions.length === 0) && (!roles || roles.length === 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: '必须申请至少一个权限或角色'
      })
    }

    const currentUser = event.context.user

    // 检查是否已经存在相同权限的待审批申请
    const existingRequest = await prisma.permissionRequest.findFirst({
      where: {
        requestedBy: currentUser.id,
        status: 'pending',
        OR: [
          { permissions: { hasSome: permissions || [] } },
          { roles: { hasSome: roles || [] } }
        ]
      }
    })

    if (existingRequest) {
      throw createError({
        statusCode: 409,
        statusMessage: '您已有相同权限的待审批申请，请勿重复提交'
      })
    }

    // 计算到期时间
    let expiresAt: Date | null = null
    if (duration && duration !== 'permanent') {
      const now = new Date()
      switch (duration) {
        case '1_week':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case '1_month':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          break
        case '3_months':
          expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
          break
        case '6_months':
          expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
          break
      }
    }

    // 创建权限申请
    const permissionRequest = await prisma.permissionRequest.create({
      data: {
        requestedBy: currentUser.id,
        permissions: permissions || [],
        roles: roles || [],
        reason: reason.trim(),
        duration,
        urgency,
        attachments: attachments || [],
        userAgent,
        requestPath: currentPath,
        expiresAt,
        status: 'pending',
        requestedAt: new Date()
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'permission:request:create',
        resourceType: 'PermissionRequest',
        resourceId: permissionRequest.id,
        details: {
          permissions,
          roles,
          reason,
          urgency,
          requestPath: currentPath
        },
        ipAddress: getClientIP(event) || 'unknown',
        userAgent,
        timestamp: new Date()
      }
    })

    // 如果有配置通知系统，可以发送通知给相关管理员
    // await notifyAdministrators('new_permission_request', permissionRequest)

    return {
      code: 201,
      message: '权限申请创建成功',
      data: permissionRequest
    }

  } catch (error) {
    console.error('创建权限申请失败:', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '创建权限申请失败'
    })
  }
})

/**
 * 获取权限申请列表
 * GET /api/v1/admin/permission-requests
 */
export const GET = defineEventHandler(async (event) => {
  try {
    // 权限检查
    const hasPermission = await checkPermission(event, 'request:read')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，无法查看权限申请'
      })
    }

    const query = getQuery(event)
    const {
      page = 1,
      limit = 20,
      status,
      urgency,
      requestedBy,
      startDate,
      endDate,
      search
    } = query

    // 构建查询条件
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (urgency && urgency !== 'all') {
      where.urgency = urgency
    }

    if (requestedBy) {
      where.requestedBy = requestedBy
    }

    if (startDate || endDate) {
      where.requestedAt = {}
      if (startDate) {
        where.requestedAt.gte = new Date(startDate as string)
      }
      if (endDate) {
        where.requestedAt.lte = new Date(endDate as string)
      }
    }

    if (search) {
      where.OR = [
        { reason: { contains: search as string, mode: 'insensitive' } },
        { requester: { name: { contains: search as string, mode: 'insensitive' } } },
        { requester: { email: { contains: search as string, mode: 'insensitive' } } }
      ]
    }

    // 计算分页
    const skip = (Number(page) - 1) * Number(limit)

    // 查询权限申请
    const [requests, total] = await Promise.all([
      prisma.permissionRequest.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          requestedAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.permissionRequest.count({ where })
    ])

    return {
      code: 200,
      message: '获取权限申请列表成功',
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }

  } catch (error) {
    console.error('获取权限申请列表失败:', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '获取权限申请列表失败'
    })
  }
})