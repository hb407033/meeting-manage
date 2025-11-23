import { notificationService } from '~~/server/services/notification-service'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权访问'
      })
    }

    const body = await readBody(event)
    const { notificationIds, notificationId } = body

    let result

    if (notificationIds && Array.isArray(notificationIds)) {
      // 批量标记为已读
      result = await notificationService.markNotificationsAsRead(notificationIds, user.sub)
    } else if (notificationId) {
      // 单个标记为已读
      result = await notificationService.markNotificationAsRead(notificationId, user.sub)
    } else {
      return createErrorResponse(40000, '参数错误', '需要提供notificationId或notificationIds')
    }

    return createSuccessResponse({
      success: true,
      markedCount: typeof result === 'number' ? result : (result ? 1 : 0)
    })
  } catch (error) {
    console.error('Failed to mark notifications as read:', error)
    return createErrorResponse(50000, '标记通知失败', error.message)
  }
})