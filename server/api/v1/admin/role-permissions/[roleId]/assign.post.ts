import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '~~/server/middleware/permission'
import { clearUserPermissionCache } from '~/composables/usePermissions'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以分配角色权限
  await requireAdmin(event)

  try {
    const roleId = getRouterParam(event, 'roleId')
    const body = await readBody(event)
    const { permissionIds } = body

    if (!roleId) {
      throw createError({
        statusCode: 400,
        statusMessage: '角色ID为必填字段'
      })
    }

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '权限ID列表不能为空'
      })
    }

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true
      }
    })

    if (!role) {
      throw createError({
        statusCode: 404,
        statusMessage: '角色不存在'
      })
    }

    // 验证所有权限是否存在
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        isActive: true
      }
    })

    if (permissions.length !== permissionIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: '部分权限不存在或已停用'
      })
    }

    // 使用事务更新角色权限
    await prisma.$transaction(async (tx) => {
      // 删除现有权限关联
      await tx.rolePermission.deleteMany({
        where: { roleId }
      })

      // 创建新的权限关联
      const rolePermissions = permissionIds.map((permissionId: string) => ({
        roleId,
        permissionId
      }))

      await tx.rolePermission.createMany({
        data: rolePermissions
      })
    })

    // 清除相关用户的权限缓存
    // 查找所有拥有该角色的用户
    const usersWithRole = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true }
    })

    for (const userRole of usersWithRole) {
      clearUserPermissionCache(userRole.userId)
    }

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        userId: event.context.user?.id,
        action: 'ASSIGN_ROLE_PERMISSIONS',
        resourceType: 'ROLE_PERMISSION',
        resourceId: roleId,
        details: {
          roleName: role.name,
          roleCode: role.code,
          permissionCount: permissionIds.length,
          affectedUsers: usersWithRole.length
        },
        ipAddress: getClientIP(event),
        userAgent: event.node.req.headers['user-agent']
      }
    })

    return {
      code: 200,
      message: '角色权限分配成功',
      data: {
        roleId,
        roleName: role.name,
        assignedPermissions: permissions.length,
        affectedUsers: usersWithRole.length
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('分配角色权限失败:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '分配角色权限失败'
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