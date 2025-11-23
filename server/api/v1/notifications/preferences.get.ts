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

    const [notificationPreference, reminderSettings] = await Promise.all([
      notificationService.getUserNotificationPreference(user.sub),
      notificationService.getUserReminderSettings(user.sub)
    ])

    return createSuccessResponse({
      notificationPreference,
      reminderSettings
    })
  } catch (error) {
    console.error('Failed to get user notification preferences:', error)
    return createErrorResponse(50000, '获取通知偏好失败', error.message)
  }
})