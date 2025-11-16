import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '~~/server/middleware/permission'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以查看用户角色
  await requireAdmin(event)

  try {
    const userId = getRouterParam(event, 'userId')

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户ID为必填字段'
      })
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        organization: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        isActive: true,
        createdAt: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: '用户不存在'
      })
    }

    // 获取用户的角色分配
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    resource: true,
                    action: true,
                    module: true
                  }
                }
              }
            }
          }
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { assignedAt: 'desc' }
      ]
    })

    // 格式化返回数据
    const formattedUserRoles = userRoles.map(userRole => ({
      id: userRole.id,
      assignedAt: userRole.assignedAt,
      expiresAt: userRole.expiresAt,
      assignedBy: userRole.assignedByUser,
      role: {
        id: userRole.role.id,
        name: userRole.role.name,
        code: userRole.role.code!,
        level: userRole.role.level,
        isSystem: userRole.role.isSystem,
        permissionCount: userRole.role.permissions.length,
        permissions: userRole.role.permissions.map(rp => rp.permission)
      },
      isExpired: userRole.expiresAt ? userRole.expiresAt < new Date() : false
    }))

    // 统计信息
    const stats = {
      totalRoles: formattedUserRoles.length,
      activeRoles: formattedUserRoles.filter(ur => !ur.isExpired).length,
      expiredRoles: formattedUserRoles.filter(ur => ur.isExpired).length,
      totalPermissions: formattedUserRoles.reduce((sum, ur) => sum + ur.role.permissionCount, 0)
    }

    return {
      code: 200,
      message: 'success',
      data: {
        user,
        roles: formattedUserRoles,
        statistics: stats
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取用户角色失败:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '获取用户角色失败'
    })
  }
})