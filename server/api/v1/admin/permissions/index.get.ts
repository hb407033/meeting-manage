import prisma from '~~/server/services/database'
import { requireAdmin } from '~~/server/middleware/permission'



export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以查看权限列表
  await requireAdmin(event)

  try {
    const permissions = await prisma.permission.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { module: 'asc' },
        { resource: 'asc' },
        { action: 'asc' }
      ]
    })

    return {
      code: 200,
      message: 'success',
      data: permissions,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取权限列表失败:', error)

    throw createError({
      statusCode: 500,
      statusMessage: '获取权限列表失败'
    })
  }
})