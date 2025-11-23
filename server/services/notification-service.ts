import prisma from './database'
import { cacheService } from './redis'
import { auditLogger } from '~~/server/utils/audit'

export interface NotificationData {
  userId: string
  type: 'RESERVATION_REMINDER' | 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELLED' | 'RESERVATION_MODIFIED' | 'RECURRING_REMINDER' | 'SYSTEM_ANNOUNCEMENT' | 'MAINTENANCE_NOTICE' | 'SECURITY_ALERT' | 'REMINDER_PREVIEW'
  channel: 'EMAIL' | 'SYSTEM' | 'WEBSOCKET' | 'SMS' | 'PUSH'
  title: string
  content: string
  data?: any
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  scheduledAt?: Date
  reservationId?: string
  recurringReservationId?: string
  templateId?: string
  createdBy?: string
}

export interface ReminderSettings {
  defaultReminderMinutes: number
  enabledTypes: string[]
  customReminders: Array<{
    type: string
    minutes: number
    enabled: boolean
  }>
  workingDaysOnly: boolean
  skipWeekends: boolean
  holidayHandling: 'SKIP' | 'BEFORE' | 'AFTER' | 'NORMAL'
  maxRemindersPerDay: number
  batchReminders: boolean
  batchDelayMinutes: number
}

export interface UserNotificationPreference {
  userId: string
  emailEnabled: boolean
  systemEnabled: boolean
  reminderMinutes: number
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  timezone: string
  preferredChannels: any
  categoryPreferences: any
}

/**
 * 通知服务
 * 负责管理所有类型的通知，包括周期性预约提醒
 */
export class NotificationService {
  private static instance: NotificationService
  private reminderQueue: Map<string, NodeJS.Timeout> = new Map()
  private processingReminders = false

  private constructor() {
    this.startReminderProcessor()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * 创建通知
   */
  async createNotification(data: NotificationData): Promise<any> {
    try {
      // 检查用户通知偏好
      const userPreference = await this.getUserNotificationPreference(data.userId)
      if (!this.shouldSendNotification(data, userPreference)) {
        return { skipped: true, reason: 'User preference disabled' }
      }

      // 创建通知记录
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          channel: data.channel,
          title: data.title,
          content: data.content,
          data: data.data,
          priority: data.priority || 'NORMAL',
          scheduledAt: data.scheduledAt,
          reservationId: data.reservationId,
          recurringReservationId: data.recurringReservationId,
          templateId: data.templateId,
          createdBy: data.createdBy,
        },
      })

      // 如果是定时通知，加入队列
      if (data.scheduledAt && data.scheduledAt > new Date()) {
        await this.scheduleNotification(notification.id, data.scheduledAt)
      } else {
        // 立即发送
        await this.sendNotification(notification.id)
      }

      await auditLogger.logDataAccess(
        data.userId,
        'notification',
        notification.id,
        'create',
        {
          type: data.type,
          channel: data.channel,
          title: data.title
        }
      )

      return notification
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }

  /**
   * 批量创建周期性预约提醒
   */
  async createRecurringReminders(recurringReservationId: string, occurrences: any[]): Promise<any[]> {
    try {
      const recurringReservation = await prisma.recurringReservation.findUnique({
        where: { id: recurringReservationId },
        include: {
          organizer: {
            include: {
              notificationPreference: true,
              reminderSetting: true
            }
          }
        }
      })

      if (!recurringReservation) {
        throw new Error('Recurring reservation not found')
      }

      const notifications = []
      const reminderSetting = recurringReservation.organizer.reminderSetting

      for (const occurrence of occurrences) {
        const reminderTime = new Date(occurrence.startTime)
        reminderTime.setMinutes(reminderTime.getMinutes() - (reminderSetting?.defaultReminderMinutes || 15))

        // 只创建未来的提醒
        if (reminderTime > new Date()) {
          const notification = await this.createNotification({
            userId: recurringReservation.organizerId,
            type: 'RECURRING_REMINDER',
            channel: 'SYSTEM',
            title: '周期性会议提醒',
            content: `您的周期性会议"${recurringReservation.title}"将在${reminderSetting?.defaultReminderMinutes || 15}分钟后开始`,
            data: {
              reservationId: occurrence.id,
              recurringReservationId,
              startTime: occurrence.startTime,
              endTime: occurrence.endTime,
              roomName: occurrence.room?.name
            },
            priority: 'NORMAL',
            scheduledAt: reminderTime,
            reservationId: occurrence.id,
            recurringReservationId,
            createdBy: 'system'
          })

          notifications.push(notification)

          // 同时创建邮件提醒
          if (recurringReservation.organizer.notificationPreference?.emailEnabled) {
            await this.createNotification({
              userId: recurringReservation.organizerId,
              type: 'RECURRING_REMINDER',
              channel: 'EMAIL',
              title: '周期性会议提醒',
              content: this.generateEmailReminderContent(recurringReservation, occurrence),
              data: {
                reservationId: occurrence.id,
                recurringReservationId,
                startTime: occurrence.startTime,
                endTime: occurrence.endTime,
                roomName: occurrence.room?.name
              },
              priority: 'NORMAL',
              scheduledAt: reminderTime,
              reservationId: occurrence.id,
              recurringReservationId,
              createdBy: 'system'
            })
          }
        }
      }

      // 缓存提醒数量
      await cacheService.set(
        `reminders:${recurringReservationId}:count`,
        notifications.length,
        { ttl: 3600 }
      )

      return notifications
    } catch (error) {
      console.error('Failed to create recurring reminders:', error)
      throw error
    }
  }

  /**
   * 获取用户通知偏好
   */
  async getUserNotificationPreference(userId: string): Promise<UserNotificationPreference | null> {
    try {
      const cached = await cacheService.get(`user:notification_preference:${userId}`)
      if (cached) {
        return JSON.parse(cached)
      }

      const preference = await prisma.userNotificationPreference.findUnique({
        where: { userId }
      })

      if (preference) {
        await cacheService.set(
          `user:notification_preference:${userId}`,
          JSON.stringify(preference),
          { ttl: 1800 }
        )
      }

      return preference
    } catch (error) {
      console.error('Failed to get user notification preference:', error)
      return null
    }
  }

  /**
   * 获取用户提醒设置
   */
  async getUserReminderSettings(userId: string): Promise<ReminderSettings | null> {
    try {
      const cached = await cacheService.get(`user:reminder_settings:${userId}`)
      if (cached) {
        return JSON.parse(cached)
      }

      const settings = await prisma.reminderSetting.findUnique({
        where: { userId }
      })

      if (settings) {
        await cacheService.set(
          `user:reminder_settings:${userId}`,
          JSON.stringify(settings),
          { ttl: 1800 }
        )
      }

      return settings
    } catch (error) {
      console.error('Failed to get user reminder settings:', error)
      return null
    }
  }

  /**
   * 更新用户通知偏好
   */
  async updateUserNotificationPreference(userId: string, data: Partial<UserNotificationPreference>): Promise<UserNotificationPreference> {
    try {
      const preference = await prisma.userNotificationPreference.upsert({
        where: { userId },
        update: {
          ...data,
          updatedAt: new Date()
        },
        create: {
          userId,
          ...data,
          emailEnabled: data.emailEnabled ?? true,
          systemEnabled: data.systemEnabled ?? true,
          reminderMinutes: data.reminderMinutes ?? 15,
          quietHoursEnabled: data.quietHoursEnabled ?? false,
          quietHoursStart: data.quietHoursStart ?? '22:00',
          quietHoursEnd: data.quietHoursEnd ?? '08:00',
          timezone: data.timezone ?? 'Asia/Shanghai'
        }
      })

      // 清除缓存
      await cacheService.del(`user:notification_preference:${userId}`)

      await auditLogger.logDataAccess(
        userId,
        'user_notification_preference',
        preference.id,
        'update',
        data
      )

      return preference
    } catch (error) {
      console.error('Failed to update user notification preference:', error)
      throw error
    }
  }

  /**
   * 更新用户提醒设置
   */
  async updateUserReminderSettings(userId: string, data: Partial<ReminderSettings>): Promise<ReminderSettings> {
    try {
      const settings = await prisma.reminderSetting.upsert({
        where: { userId },
        update: {
          ...data,
          updatedAt: new Date()
        },
        create: {
          userId,
          ...data,
          defaultReminderMinutes: data.defaultReminderMinutes ?? 15,
          enabledTypes: data.enabledTypes ?? [],
          customReminders: data.customReminders ?? [],
          workingDaysOnly: data.workingDaysOnly ?? false,
          skipWeekends: data.skipWeekends ?? false,
          holidayHandling: data.holidayHandling ?? 'SKIP',
          maxRemindersPerDay: data.maxRemindersPerDay ?? 10,
          batchReminders: data.batchReminders ?? true,
          batchDelayMinutes: data.batchDelayMinutes ?? 5
        }
      })

      // 清除缓存
      await cacheService.del(`user:reminder_settings:${userId}`)

      await auditLogger.logDataAccess(
        userId,
        'reminder_setting',
        settings.id,
        'update',
        data
      )

      return settings
    } catch (error) {
      console.error('Failed to update user reminder settings:', error)
      throw error
    }
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(userId: string, options: {
    type?: string
    status?: string
    page?: number
    limit?: number
    unreadOnly?: boolean
  } = {}) {
    try {
      const where: any = { userId }

      if (options.type) where.type = options.type
      if (options.status) where.status = options.status
      if (options.unreadOnly) where.readAt = null

      const page = options.page || 1
      const limit = options.limit || 20
      const skip = (page - 1) * limit

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            reservation: {
              include: {
                room: true
              }
            },
            recurringReservation: true
          }
        }),
        prisma.notification.count({ where })
      ])

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Failed to get user notifications:', error)
      throw error
    }
  }

  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          readAt: new Date()
        }
      })

      if (result.count > 0) {
        await auditLogger.logDataAccess(
          userId,
          'notification',
          notificationId,
          'read'
        )
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      return false
    }
  }

  /**
   * 批量标记通知为已读
   */
  async markNotificationsAsRead(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      })

      await auditLogger.log(
        {
          userId,
          action: 'notifications_batch_read',
          resourceType: 'notification',
          details: { count: result.count }
        }
      )

      return result.count
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
      return 0
    }
  }

  /**
   * 生成邮件提醒内容
   */
  private generateEmailReminderContent(recurringReservation: any, occurrence: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">会议提醒</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">${recurringReservation.title}</h3>

          <div style="margin: 15px 0;">
            <strong>时间：</strong>${new Date(occurrence.startTime).toLocaleString('zh-CN')} - ${new Date(occurrence.endTime).toLocaleString('zh-CN')}
          </div>

          <div style="margin: 15px 0;">
            <strong>地点：</strong>${occurrence.room?.name || '待定'}
          </div>

          ${recurringReservation.description ? `
          <div style="margin: 15px 0;">
            <strong>描述：</strong>${recurringReservation.description}
          </div>
          ` : ''}
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          这是一个周期性会议的自动提醒。如需调整提醒设置，请访问会议室管理系统。
        </p>
      </div>
    `
  }

  /**
   * 判断是否应该发送通知
   */
  private shouldSendNotification(data: NotificationData, preference: UserNotificationPreference | null): boolean {
    if (!preference) {
      return true // 没有设置时默认发送
    }

    // 检查渠道是否启用
    if (data.channel === 'EMAIL' && !preference.emailEnabled) {
      return false
    }

    if (data.channel === 'SYSTEM' && !preference.systemEnabled) {
      return false
    }

    // 检查免打扰时间
    if (preference.quietHoursEnabled) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      if (this.isTimeInRange(currentTime, preference.quietHoursStart, preference.quietHoursEnd)) {
        return false
      }
    }

    return true
  }

  /**
   * 检查时间是否在指定范围内
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    const currentMinutes = this.timeToMinutes(current)
    const startMinutes = this.timeToMinutes(start)
    const endMinutes = this.timeToMinutes(end)

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // 跨天情况，如 22:00 - 08:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
  }

  /**
   * 时间转换为分钟数
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * 定时发送通知
   */
  private async scheduleNotification(notificationId: string, scheduledAt: Date): Promise<void> {
    const delay = scheduledAt.getTime() - Date.now()

    if (delay <= 0) {
      await this.sendNotification(notificationId)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        await this.sendNotification(notificationId)
      } catch (error) {
        console.error(`Failed to send scheduled notification ${notificationId}:`, error)
      }
    }, delay)

    this.reminderQueue.set(notificationId, timeoutId)
  }

  /**
   * 发送通知
   */
  private async sendNotification(notificationId: string): Promise<void> {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENDING',
          sentAt: new Date()
        }
      })

      // 根据渠道发送通知
      switch (notification.channel) {
        case 'EMAIL':
          await this.sendEmailNotification(notification)
          break
        case 'SYSTEM':
          await this.sendSystemNotification(notification)
          break
        case 'WEBSOCKET':
          await this.sendWebSocketNotification(notification)
          break
        default:
          console.warn(`Unsupported notification channel: ${notification.channel}`)
      }

      // 更新状态为已发送
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      })

      // 更新统计
      await this.updateNotificationStats(notification)

    } catch (error) {
      console.error(`Failed to send notification ${notificationId}:`, error)

      // 更新状态为失败
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          retryCount: { increment: 1 }
        }
      })
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    // TODO: 实现邮件发送逻辑
    console.log(`Sending email notification to ${notification.userId}:`, notification.title)
  }

  /**
   * 发送系统内通知
   */
  private async sendSystemNotification(notification: any): Promise<void> {
    // 系统内通知已经在数据库中，前端可以通过API获取
    console.log(`System notification created for ${notification.userId}:`, notification.title)
  }

  /**
   * 发送WebSocket通知
   */
  private async sendWebSocketNotification(notification: any): Promise<void> {
    // TODO: 实现WebSocket发送逻辑
    console.log(`WebSocket notification to ${notification.userId}:`, notification.title)
  }

  /**
   * 更新通知统计
   */
  private async updateNotificationStats(notification: any): Promise<void> {
    try {
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]

      await prisma.notificationStats.upsert({
        where: {
          userId_date_type_channel: {
            userId: notification.userId,
            date: new Date(dateStr),
            type: notification.type,
            channel: notification.channel
          }
        },
        update: {
          totalSent: { increment: 1 },
          totalDelivered: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          userId: notification.userId,
          date: new Date(dateStr),
          type: notification.type,
          channel: notification.channel,
          totalSent: 1,
          totalDelivered: 1
        }
      })
    } catch (error) {
      console.error('Failed to update notification stats:', error)
    }
  }

  /**
   * 启动提醒处理器
   */
  private startReminderProcessor(): void {
    // 每分钟检查一次待发送的提醒
    setInterval(async () => {
      if (this.processingReminders) return

      this.processingReminders = true
      try {
        await this.processScheduledNotifications()
      } catch (error) {
        console.error('Error in reminder processor:', error)
      } finally {
        this.processingReminders = false
      }
    }, 60 * 1000)
  }

  /**
   * 处理定时通知
   */
  private async processScheduledNotifications(): Promise<void> {
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          lte: new Date()
        }
      },
      take: 50 // 限制批次大小
    })

    for (const notification of pendingNotifications) {
      try {
        await this.sendNotification(notification.id)
      } catch (error) {
        console.error(`Failed to process notification ${notification.id}:`, error)
      }
    }
  }
}

// 导出单例实例
export const notificationService = NotificationService.getInstance()

// 导出便捷函数
export const createNotification = notificationService.createNotification.bind(notificationService)
export const createRecurringReminders = notificationService.createRecurringReminders.bind(notificationService)
export const getUserNotifications = notificationService.getUserNotifications.bind(notificationService)
export const markNotificationAsRead = notificationService.markNotificationAsRead.bind(notificationService)
export const updateUserNotificationPreference = notificationService.updateUserNotificationPreference.bind(notificationService)
export const updateUserReminderSettings = notificationService.updateUserReminderSettings.bind(notificationService)