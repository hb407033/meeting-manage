import { requireAdmin } from '~~/server/middleware/permission'
import { clearUserPermissionCache } from '~~/server/services/permission-cache'

/**
 * 清除用户权限缓存
 * POST /api/v1/admin/permissions/clear-cache
 */
export default defineEventHandler(async (event) => {
  // 权限检查：只有管理员可以清除权限缓存
  await requireAdmin(event)

  try {
    const body = await readBody(event)
    const { userId, organizationId } = body

    // 验证必填字段
    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户ID为必填字段'
      })
    }

    // 清除用户权限缓存
    await clearUserPermissionCache(userId, organizationId)

    return {
      code: 200,
      message: `用户 ${userId} 的权限缓存已清除`,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('清除权限缓存失败:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '清除权限缓存失败'
    })
  }
})