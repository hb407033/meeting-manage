import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '~~/server/middleware/permission'
import { clearUserPermissionCache } from '~/composables/usePermissions'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以分配用户角色
  await requireAdmin(event)

  try {
    const body = await readBody(event)
    const { userId, roleId, expiresAt } = body

    // 验证必填字段
    if (!userId || !roleId) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户ID和角色ID为必填字段'
      })
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: '用户不存在'
      })
    }

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      throw createError({
        statusCode: 404,
        statusMessage: '角色不存在'
      })
    }

    // 检查是否已经分配了该角色
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId,
        roleId
      }
    })

    if (existingUserRole) {
      throw createError({
        statusCode: 409,
        statusMessage: '用户已分配该角色'
      })
    }

    // 创建用户角色分配
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy: event.context.user?.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        role: true
      }
    })

    // 清除用户权限缓存
    clearUserPermissionCache(userId)

    return {
      code: 201,
      message: '角色分配成功',
      data: userRole,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('分配用户角色失败:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '分配用户角色失败'
    })
  }
})