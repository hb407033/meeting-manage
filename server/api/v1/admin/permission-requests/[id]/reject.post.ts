import prisma from '~~/server/services/database'



/**
 * 拒绝权限申请
 * POST /api/v1/admin/permission-requests/[id]/reject
 */
export default defineEventHandler(async (event) => {
  try {
    const requestId = getRouterParam(event, 'id')
    if (!requestId) {
      throw createError({
        statusCode: 400,
        statusMessage: '申请ID不能为空'
      })
    }

    // 权限检查
    const hasPermission = await checkPermission(event, 'request:reject')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，无法拒绝权限申请'
      })
    }

    const body = await readBody(event)
    const { reason } = body

    if (!reason || reason.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '拒绝原因不能为空'
      })
    }

    const currentUser = event.context.user

    // 查找权限申请
    const permissionRequest = await prisma.permissionRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: true
      }
    })

    if (!permissionRequest) {
      throw createError({
        statusCode: 404,
        statusMessage: '权限申请不存在'
      })
    }

    if (permissionRequest.status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: '该申请已经被处理过了'
      })
    }

    // 更新申请状态
    const updatedRequest = await prisma.permissionRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedBy: currentUser.id,
        reviewedAt: new Date(),
        reviewReason: reason.trim()
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'permission:request:reject',
        resourceType: 'PermissionRequest',
        resourceId: requestId,
        details: {
          requestDetails: {
            permissions: permissionRequest.permissions,
            roles: permissionRequest.roles,
            requesterId: permissionRequest.requestedBy,
            requesterName: permissionRequest.requester.name
          },
          rejectionDetails: {
            rejectedBy: currentUser.id,
            rejectedByName: currentUser.name,
            reason: reason.trim()
          }
        },
        ipAddress: getClientIP(event) || 'unknown',
        userAgent: getHeader(event, 'user-agent') || 'unknown',
        timestamp: new Date()
      }
    })

    // 发送通知给申请者
    // await sendNotification(permissionRequest.requester.email, 'permission_request_rejected', {
    //   request: updatedRequest,
    //   rejector: currentUser
    // })

    return {
      code: 200,
      message: '权限申请拒绝成功',
      data: updatedRequest
    }

  } catch (error) {
    console.error('拒绝权限申请失败:', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '拒绝权限申请失败'
    })
  }
})