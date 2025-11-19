import { alertService } from '~~/server/services/alert-service'
import { hasPermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户权限
    const user = await getServerSession(event)
    if (!user || !await hasPermission(user.id, 'audit:manage')) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，需要告警管理权限'
      })
    }

    // 获取告警ID
    const alertId = getRouterParam(event, 'alertId')
    if (!alertId) {
      throw createError({
        statusCode: 400,
        statusMessage: '告警ID不能为空'
      })
    }

    // 获取请求体
    const body = await readBody(event)
    const { resolution } = body

    // 解决告警
    const success = await alertService.resolveAlert(alertId, user.id, resolution)

    if (!success) {
      throw createError({
        statusCode: 404,
        statusMessage: '告警不存在'
      })
    }

    return createSuccessResponse({
      message: '告警解决成功',
      alertId,
      resolvedBy: user.id,
      resolvedAt: new Date(),
      resolution
    })

  } catch (error) {
    console.error('Failed to resolve alert:', error)

    // 如果是已知错误，直接抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // 未知错误返回通用错误信息
    throw createError({
      statusCode: 500,
      statusMessage: '解决告警失败'
    })
  }
})