import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 批准权限申请
 * POST /api/v1/admin/permission-requests/[id]/approve
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
    const hasPermission = await checkPermission(event, 'request:approve')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，无法审批权限申请'
      })
    }

    const body = await readBody(event)
    const { reason, comment } = body

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

    // 开始事务
    const result = await prisma.$transaction(async (tx) => {
      // 更新申请状态
      const updatedRequest = await tx.permissionRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: currentUser.id,
          reviewedAt: new Date(),
          reviewReason: reason,
          reviewComment: comment
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

      // 分配权限给申请用户
      if (permissionRequest.permissions && permissionRequest.permissions.length > 0) {
        // 为申请权限创建角色（或分配到现有角色）
        const tempRoleName = `临时权限_${Date.now()}`
        const tempRole = await tx.role.create({
          data: {
            name: tempRoleName,
            code: `temp_${Date.now()}`,
            description: `权限申请批准 (${permissionRequest.reason})`,
            level: 30, // 中等权限级别
            isSystem: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // 分配权限到临时角色
        const permissions = await tx.permission.findMany({
          where: {
            code: { in: permissionRequest.permissions }
          }
        })

        await tx.rolePermission.createMany({
          data: permissions.map(permission => ({
            roleId: tempRole.id,
            permissionId: permission.id,
            assignedBy: currentUser.id,
            assignedAt: new Date()
          }))
        })

        // 分配临时角色给用户
        await tx.userRole.create({
          data: {
            userId: permissionRequest.requestedBy,
            roleId: tempRole.id,
            assignedBy: currentUser.id,
            assignedAt: new Date(),
            expiresAt: permissionRequest.expiresAt,
            reason: `权限申请批准: ${permissionRequest.reason}`
          }
        })
      }

      // 分配角色给申请用户
      if (permissionRequest.roles && permissionRequest.roles.length > 0) {
        const roles = await tx.role.findMany({
          where: {
            code: { in: permissionRequest.roles },
            isActive: true
          }
        })

        for (const role of roles) {
          // 检查用户是否已经有这个角色
          const existingUserRole = await tx.userRole.findFirst({
            where: {
              userId: permissionRequest.requestedBy,
              roleId: role.id
            }
          })

          if (!existingUserRole) {
            await tx.userRole.create({
              data: {
                userId: permissionRequest.requestedBy,
                roleId: role.id,
                assignedBy: currentUser.id,
                assignedAt: new Date(),
                expiresAt: permissionRequest.expiresAt,
                reason: `权限申请批准: ${permissionRequest.reason}`
              }
            })
          }
        }
      }

      // 创建审计日志
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'permission:request:approve',
          resourceType: 'PermissionRequest',
          resourceId: requestId,
          details: {
            requestDetails: {
              permissions: permissionRequest.permissions,
              roles: permissionRequest.roles,
              requesterId: permissionRequest.requestedBy,
              requesterName: permissionRequest.requester.name
            },
            approvalDetails: {
              approvedBy: currentUser.id,
              approvedByName: currentUser.name,
              reason,
              comment
            }
          },
          ipAddress: getClientIP(event) || 'unknown',
          userAgent: getHeader(event, 'user-agent') || 'unknown',
          timestamp: new Date()
        }
      })

      return updatedRequest
    })

    // 清除用户权限缓存
    await clearUserPermissionCache(permissionRequest.requestedBy)

    // 发送通知给申请者
    // await sendNotification(permissionRequest.requester.email, 'permission_request_approved', {
    //   request: result,
    //   approver: currentUser
    // })

    return {
      code: 200,
      message: '权限申请批准成功',
      data: result
    }

  } catch (error) {
    console.error('批准权限申请失败:', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '批准权限申请失败'
    })
  }
})