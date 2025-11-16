import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '~~/server/middleware/permission'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以创建权限
  await requireAdmin(event)

  try {
    const body = await readBody(event)
    const { name, code, resource, action, description, module } = body

    // 验证必填字段
    if (!name || !code) {
      throw createError({
        statusCode: 400,
        statusMessage: '权限名称和代码为必填字段'
      })
    }

    // 检查权限代码是否已存在
    const existingPermission = await prisma.permission.findFirst({
      where: {
        OR: [
          { code },
          { name }
        ]
      }
    })

    if (existingPermission) {
      throw createError({
        statusCode: 409,
        statusMessage: '权限名称或代码已存在'
      })
    }

    const permission = await prisma.permission.create({
      data: {
        name,
        code,
        resource: resource || null,
        action: action || null,
        description: description || null,
        module: module || null,
        isActive: true
      }
    })

    return {
      code: 201,
      message: '权限创建成功',
      data: permission,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('创建权限失败:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '创建权限失败'
    })
  }
})