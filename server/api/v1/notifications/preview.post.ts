import { notificationService } from '~~/server/services/notification-service'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import { z } from 'zod'

const previewSchema = z.object({
  recurringReservationId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reminderMinutes: z.number().min(1).max(1440).default(15)
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
    const validatedData = previewSchema.parse(body)

    // 获取周期性预约信息
    const recurringReservation = await prisma.recurringReservation.findUnique({
      where: { id: validatedData.recurringReservationId },
      include: {
        organizer: true,
        room: true
      }
    })

    if (!recurringReservation) {
      return createErrorResponse(40400, '周期性预约不存在')
    }

    // 检查权限
    if (recurringReservation.organizerId !== user.sub) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足'
      })
    }

    // 获取用户提醒设置
    const reminderSettings = await notificationService.getUserReminderSettings(user.sub)
    const reminderMinutes = validatedData.reminderMinutes || reminderSettings?.defaultReminderMinutes || 15

    // 生成预览数据
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)
    const previewData = await generateReminderPreview(
      recurringReservation,
      startDate,
      endDate,
      reminderMinutes
    )

    return createSuccessResponse({
      recurringReservation: {
        id: recurringReservation.id,
        title: recurringReservation.title,
        description: recurringReservation.description,
        room: recurringReservation.room,
        startTime: startDate,
        endTime: endDate
      },
      reminderSettings: {
        reminderMinutes,
        enabledTypes: reminderSettings?.enabledTypes || [],
        quietHoursEnabled: reminderSettings?.quietHoursEnabled || false,
        quietHoursStart: reminderSettings?.quietHoursStart || '22:00',
        quietHoursEnd: reminderSettings?.quietHoursEnd || '08:00'
      },
      preview: previewData
    })
  } catch (error) {
    console.error('Failed to generate reminder preview:', error)
    return createErrorResponse(50000, '生成提醒预览失败', error.message)
  }
})

/**
 * 生成提醒预览数据
 */
async function generateReminderPreview(
  recurringReservation: any,
  startDate: Date,
  endDate: Date,
  reminderMinutes: number
) {
  const occurrences = []
  const reminders = []
  let currentDate = new Date(startDate)

  // 使用现有的周期性预约引擎生成预约实例
  const recurringEngine = await import('~~/server/services/recurring-reservation-engine')
  const engine = recurringEngine.recurringReservationEngine

  try {
    // 生成指定时间范围内的预约实例
    const generatedOccurrences = await engine.generateOccurrences(
      recurringReservation.id,
      startDate,
      endDate
    )

    for (const occurrence of generatedOccurrences) {
      occurrences.push({
        id: occurrence.id,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        room: occurrence.room
      })

      // 生成对应的提醒时间
      const reminderTime = new Date(occurrence.startTime)
      reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes)

      if (reminderTime > new Date()) {
        reminders.push({
          reservationId: occurrence.id,
          reminderTime,
          meetingTime: occurrence.startTime,
          title: recurringReservation.title,
          room: occurrence.room?.name || '待定'
        })
      }
    }
  } catch (error) {
    console.error('Error generating occurrences for preview:', error)
  }

  // 生成统计信息
  const stats = {
    totalOccurrences: occurrences.length,
    totalReminders: reminders.length,
    nextReminder: reminders.length > 0 ? reminders[0].reminderTime : null,
    nextMeeting: occurrences.length > 0 ? occurrences[0].startTime : null,
    reminderFrequency: calculateReminderFrequency(reminders),
    quietHoursAffected: countQuietHoursAffected(reminders)
  }

  return {
    occurrences,
    reminders,
    stats
  }
}

/**
 * 计算提醒频率
 */
function calculateReminderFrequency(reminders: any[]) {
  const frequency: Record<string, number> = {}

  reminders.forEach(reminder => {
    const dayOfWeek = reminder.reminderTime.toLocaleDateString('zh-CN', { weekday: 'long' })
    frequency[dayOfWeek] = (frequency[dayOfWeek] || 0) + 1
  })

  return frequency
}

/**
 * 计算受免打扰时间影响的提醒数量
 */
function countQuietHoursAffected(reminders: any[], quietHoursStart = '22:00', quietHoursEnd = '08:00') {
  return reminders.filter(reminder => {
    const hour = reminder.reminderTime.getHours()
    const minute = reminder.reminderTime.getMinutes()
    const currentTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

    // 简单的免打扰时间检查
    if (quietHoursStart <= quietHoursEnd) {
      return currentTime >= quietHoursStart && currentTime < quietHoursEnd
    } else {
      // 跨天情况
      return currentTime >= quietHoursStart || currentTime < quietHoursEnd
    }
  }).length
}