import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '~~/server/middleware/permission'
import { clearUserPermissionCache } from '~/composables/usePermissions'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以移除用户角色
  await requireAdmin(event)

  try {
    const userId = getRouterParam(event, 'userId')
    const body = await readBody(event)
    const { roleId } = body

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户ID为必填字段'
      })
    }

    if (!roleId) {
      throw createError({
        statusCode: 400,
        statusMessage: '角色ID为必填字段'
      })
    }

    // 检查用户角色关联是否存在
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        roleId
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!userRole) {
      throw createError({
        statusCode: 404,
        statusMessage: '用户角色关联不存在'
      })
    }

    // 检查是否是系统内置角色
    if (userRole.role.isSystem) {
      throw createError({
        statusCode: 400,
        statusMessage: '不能移除系统内置角色'
      })
    }

    // 删除用户角色关联
    await prisma.userRole.delete({
      where: {
        id: userRole.id
      }
    })

    // 清除用户权限缓存
    clearUserPermissionCache(userId)

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        userId: event.context.user?.id,
        action: 'REMOVE_USER_ROLE',
        resourceType: 'USER_ROLE',
        resourceId: userRole.id,
        details: {
          targetUserId: userId,
          targetUserName: userRole.user.name,
          targetUserEmail: userRole.user.email,
          roleName: userRole.role.name,
          roleCode: userRole.role.code,
          reason: '管理员移除用户角色'
        },
        ipAddress: getClientIP(event),
        userAgent: event.node.req.headers['user-agent']
      }
    })

    return {
      code: 200,
      message: '用户角色移除成功',
      data: {
        userId,
        userName: userRole.user.name,
        removedRole: {
          id: userRole.role.id,
          name: userRole.role.name,
          code: userRole.role.code
        }
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('移除用户角色失败:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '移除用户角色失败'
    })
  }
})

/**
 * 获取客户端IP地址
 */
function getClientIP(event: any): string {
  return (
    event.node.req.headers['x-forwarded-for'] ||
    event.node.req.headers['x-real-ip'] ||
    event.node.req.connection?.remoteAddress ||
    event.node.req.socket?.remoteAddress ||
    '127.0.0.1'
  )
}