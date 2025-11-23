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

    const query = getQuery(event)
    const {
      type,
      status,
      page = '1',
      limit = '20',
      unreadOnly = 'false'
    } = query

    const options = {
      type: type as string,
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      unreadOnly: unreadOnly === 'true'
    }

    const result = await notificationService.getUserNotifications(user.sub, options)

    return createSuccessResponse(result)
  } catch (error) {
    console.error('Failed to get notifications:', error)
    return createErrorResponse(50000, '获取通知失败', error.message)
  }
})