import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '~~/server/middleware/permission'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以查看角色列表
  await requireAdmin(event)

  try {
    const roles = await prisma.role.findMany({
      where: {
        isActive: true
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        level: 'desc'
      }
    })

    const rolesWithStats = roles.map(role => ({
      ...role,
      permissionCount: role.permissions.length,
      userCount: role.userRoles.length,
      permissions: role.permissions.map(rp => rp.permission)
    }))

    return {
      code: 200,
      message: 'success',
      data: rolesWithStats,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)

    throw createError({
      statusCode: 500,
      statusMessage: '获取角色列表失败'
    })
  }
})