import { notificationService } from '~~/server/services/notification-service'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import { z } from 'zod'

const updatePreferencesSchema = z.object({
  // 通知偏好设置
  emailEnabled: z.boolean().optional(),
  systemEnabled: z.boolean().optional(),
  reminderMinutes: z.number().min(1).max(1440).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().optional(),
  preferredChannels: z.any().optional(),
  categoryPreferences: z.any().optional(),

  // 提醒设置
  defaultReminderMinutes: z.number().min(1).max(1440).optional(),
  enabledTypes: z.array(z.string()).optional(),
  customReminders: z.array(z.any()).optional(),
  workingDaysOnly: z.boolean().optional(),
  skipWeekends: z.boolean().optional(),
  holidayHandling: z.enum(['SKIP', 'BEFORE', 'AFTER', 'NORMAL']).optional(),
  maxRemindersPerDay: z.number().min(1).max(100).optional(),
  batchReminders: z.boolean().optional(),
  batchDelayMinutes: z.number().min(1).max(60).optional()
})

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
    const validatedData = updatePreferencesSchema.parse(body)

    // 分离通知偏好和提醒设置
    const notificationPreferenceData: any = {}
    const reminderSettingsData: any = {}

    Object.keys(validatedData).forEach(key => {
      if ([
        'emailEnabled', 'systemEnabled', 'reminderMinutes', 'quietHoursEnabled',
        'quietHoursStart', 'quietHoursEnd', 'timezone', 'preferredChannels', 'categoryPreferences'
      ].includes(key)) {
        notificationPreferenceData[key] = validatedData[key]
      } else {
        reminderSettingsData[key] = validatedData[key]
      }
    })

    const results = await Promise.allSettled([
      Object.keys(notificationPreferenceData).length > 0
        ? notificationService.updateUserNotificationPreference(user.sub, notificationPreferenceData)
        : Promise.resolve(null),
      Object.keys(reminderSettingsData).length > 0
        ? notificationService.updateUserReminderSettings(user.sub, reminderSettingsData)
        : Promise.resolve(null)
    ])

    const [notificationPreferenceResult, reminderSettingsResult] = results

    return createSuccessResponse({
      success: true,
      notificationPreference: notificationPreferenceResult.status === 'fulfilled' ? notificationPreferenceResult.value : null,
      reminderSettings: reminderSettingsResult.status === 'fulfilled' ? reminderSettingsResult.value : null,
      errors: [
        ...(notificationPreferenceResult.status === 'rejected' ? [notificationPreferenceResult.reason.message] : []),
        ...(reminderSettingsResult.status === 'rejected' ? [reminderSettingsResult.reason.message] : [])
      ]
    })
  } catch (error) {
    console.error('Failed to update notification preferences:', error)
    return createErrorResponse(40000, '更新通知偏好失败', error.message)
  }
})