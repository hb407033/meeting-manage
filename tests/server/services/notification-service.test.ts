import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NotificationService } from '~/server/services/notification-service'
import prisma from '~/server/services/database'

describe('NotificationService', () => {
  let service: NotificationService
  let testUserId: string

  beforeEach(async () => {
    service = NotificationService.getInstance()
    testUserId = 'test-user-123'

    // 创建测试用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword'
      }
    })
  })

  afterEach(async () => {
    // 清理测试数据
    await prisma.notification.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
  })

  describe('createNotification', () => {
    it('should create a basic notification', async () => {
      const notificationData = {
        userId: testUserId,
        type: 'RESERVATION_REMINDER' as const,
        channel: 'SYSTEM' as const,
        title: 'Test Notification',
        content: 'Test content'
      }

      const result = await service.createNotification(notificationData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.type).toBe('RESERVATION_REMINDER')
      expect(result.channel).toBe('SYSTEM')
      expect(result.title).toBe('Test Notification')
      expect(result.content).toBe('Test content')
    })

    it('should respect user notification preferences', async () => {
      // 创建禁用系统通知的用户偏好
      await prisma.userNotificationPreference.create({
        data: {
          userId: testUserId,
          emailEnabled: true,
          systemEnabled: false,
          reminderMinutes: 15
        }
      })

      const notificationData = {
        userId: testUserId,
        type: 'RESERVATION_REMINDER' as const,
        channel: 'SYSTEM' as const,
        title: 'Test Notification',
        content: 'Test content'
      }

      const result = await service.createNotification(notificationData)

      expect(result.skipped).toBe(true)
      expect(result.reason).toBe('User preference disabled')
    })

    it('should schedule notifications with future time', async () => {
      const futureTime = new Date()
      futureTime.setMinutes(futureTime.getMinutes() + 60)

      const notificationData = {
        userId: testUserId,
        type: 'RESERVATION_REMINDER' as const,
        channel: 'SYSTEM' as const,
        title: 'Scheduled Notification',
        content: 'Scheduled content',
        scheduledAt: futureTime
      }

      const result = await service.createNotification(notificationData)

      expect(result).toBeDefined()
      expect(result.scheduledAt).toEqual(futureTime)
    })
  })

  describe('getUserNotificationPreference', () => {
    it('should return null for non-existent preferences', async () => {
      const preference = await service.getUserNotificationPreference('non-existent-user')
      expect(preference).toBeNull()
    })

    it('should return existing preferences', async () => {
      // 创建用户偏好
      const createdPreference = await prisma.userNotificationPreference.create({
        data: {
          userId: testUserId,
          emailEnabled: false,
          systemEnabled: true,
          reminderMinutes: 30
        }
      })

      const preference = await service.getUserNotificationPreference(testUserId)

      expect(preference).toBeDefined()
      expect(preference?.userId).toBe(testUserId)
      expect(preference?.emailEnabled).toBe(false)
      expect(preference?.systemEnabled).toBe(true)
      expect(preference?.reminderMinutes).toBe(30)
    })
  })

  describe('updateUserNotificationPreference', () => {
    it('should create new preferences if not exist', async () => {
      const updateData = {
        emailEnabled: false,
        reminderMinutes: 45
      }

      const preference = await service.updateUserNotificationPreference(testUserId, updateData)

      expect(preference).toBeDefined()
      expect(preference.emailEnabled).toBe(false)
      expect(preference.reminderMinutes).toBe(45)
    })

    it('should update existing preferences', async () => {
      // 创建初始偏好
      await prisma.userNotificationPreference.create({
        data: {
          userId: testUserId,
          emailEnabled: true,
          systemEnabled: true,
          reminderMinutes: 15
        }
      })

      const updateData = {
        emailEnabled: false,
        reminderMinutes: 60
      }

      const preference = await service.updateUserNotificationPreference(testUserId, updateData)

      expect(preference.emailEnabled).toBe(false)
      expect(preference.reminderMinutes).toBe(60)
      expect(preference.systemEnabled).toBe(true) // 保持原有值
    })
  })

  describe('getUserNotifications', () => {
    beforeEach(async () => {
      // 创建测试通知
      await prisma.notification.createMany({
        data: [
          {
            userId: testUserId,
            type: 'RESERVATION_REMINDER',
            channel: 'SYSTEM',
            title: 'Notification 1',
            content: 'Content 1',
            status: 'SENT'
          },
          {
            userId: testUserId,
            type: 'RESERVATION_CONFIRMED',
            channel: 'EMAIL',
            title: 'Notification 2',
            content: 'Content 2',
            status: 'DELIVERED',
            readAt: new Date()
          }
        ]
      })
    })

    it('should return user notifications', async () => {
      const result = await service.getUserNotifications(testUserId)

      expect(result.notifications).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('should filter by type', async () => {
      const result = await service.getUserNotifications(testUserId, {
        type: 'RESERVATION_REMINDER'
      })

      expect(result.notifications).toHaveLength(1)
      expect(result.notifications[0].type).toBe('RESERVATION_REMINDER')
    })

    it('should filter by unread status', async () => {
      const result = await service.getUserNotifications(testUserId, {
        unreadOnly: true
      })

      expect(result.notifications).toHaveLength(1)
      expect(result.notifications[0].readAt).toBeNull()
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: testUserId,
          type: 'RESERVATION_REMINDER',
          channel: 'SYSTEM',
          title: 'Test Notification',
          content: 'Test content',
          status: 'DELIVERED'
        }
      })

      const result = await service.markNotificationAsRead(notification.id, testUserId)

      expect(result).toBe(true)

      // 验证通知已被标记为已读
      const updatedNotification = await prisma.notification.findUnique({
        where: { id: notification.id }
      })

      expect(updatedNotification?.readAt).toBeDefined()
    })

    it('should return false for non-existent notification', async () => {
      const result = await service.markNotificationAsRead('non-existent-id', testUserId)
      expect(result).toBe(false)
    })
  })

  describe('markNotificationsAsRead', () => {
    beforeEach(async () => {
      // 创建未读通知
      await prisma.notification.createMany({
        data: [
          {
            userId: testUserId,
            type: 'RESERVATION_REMINDER',
            channel: 'SYSTEM',
            title: 'Unread 1',
            content: 'Content 1',
            status: 'DELIVERED'
          },
          {
            userId: testUserId,
            type: 'RESERVATION_CONFIRMED',
            channel: 'SYSTEM',
            title: 'Unread 2',
            content: 'Content 2',
            status: 'DELIVERED'
          },
          {
            userId: testUserId,
            type: 'RESERVATION_CANCELLED',
            channel: 'SYSTEM',
            title: 'Read 1',
            content: 'Content 3',
            status: 'DELIVERED',
            readAt: new Date()
          }
        ]
      })
    })

    it('should mark multiple notifications as read', async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId: testUserId, readAt: null }
      })

      const notificationIds = notifications.map(n => n.id)
      expect(notificationIds).toHaveLength(2)

      const markedCount = await service.markNotificationsAsRead(notificationIds, testUserId)

      expect(markedCount).toBe(2)

      // 验证所有通知都已标记为已读
      const unreadNotifications = await prisma.notification.count({
        where: { userId: testUserId, readAt: null }
      })

      expect(unreadNotifications).toBe(0)
    })
  })
})