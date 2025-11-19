import prisma from '~~/server/services/database'
import { requireAdmin } from '~~/server/middleware/permission'



export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以创建角色
  await requireAdmin(event)

  try {
    const body = await readBody(event)
    const { name, code, description, level, permissionIds } = body

    // 验证必填字段
    if (!name || !code) {
      throw createError({
        statusCode: 400,
        statusMessage: '角色名称和代码为必填字段'
      })
    }

    // 检查角色代码是否已存在
    const existingRole = await prisma.role.findFirst({
      where: {
        OR: [
          { code },
          { name }
        ]
      }
    })

    if (existingRole) {
      throw createError({
        statusCode: 409,
        statusMessage: '角色名称或代码已存在'
      })
    }

    // 使用事务创建角色和权限关联
    const result = await prisma.$transaction(async (tx) => {
      // 创建角色
      const role = await tx.role.create({
        data: {
          name,
          code,
          description: description || null,
          level: level || 0,
          isActive: true
        }
      })

      // 如果指定了权限，创建角色权限关联
      if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
        const rolePermissions = permissionIds.map((permissionId: string) => ({
          roleId: role.id,
          permissionId
        }))

        await tx.rolePermission.createMany({
          data: rolePermissions
        })
      }

      return role
    })

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        userId: event.context.user?.id,
        action: 'CREATE_ROLE',
        resourceType: 'ROLE',
        resourceId: result.id,
        details: {
          name: result.name,
          code: result.code,
          level: result.level,
          permissionCount: permissionIds?.length || 0
        },
        ipAddress: getClientIP(event),
        userAgent: event.node.req.headers['user-agent']
      }
    })

    return {
      code: 201,
      message: '角色创建成功',
      data: result,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('创建角色失败:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '创建角色失败'
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