import { ref, computed } from 'vue'
import { useNotificationsStore } from '~/stores/notifications'

const notificationsStore = useNotificationsStore()

export interface NotificationPreference {
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

export interface Notification {
  id: string
  userId: string
  type: string
  channel: string
  title: string
  content: string
  data?: any
  status: string
  priority: string
  scheduledAt?: string
  sentAt?: string
  readAt?: string
  retryCount: number
  maxRetries: number
  errorMessage?: string
  metadata?: any
  reservationId?: string
  recurringReservationId?: string
  templateId?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export function useNotifications() {
  // 状态
  const loading = ref(false)
  const notifications = ref<Notification[]>([])
  const preferences = ref<NotificationPreference | null>(null)
  const reminderSettings = ref<ReminderSettings | null>(null)
  const unreadCount = ref(0)

  // 计算属性
  const unreadNotifications = computed(() => {
    return notifications.value.filter(n => !n.readAt)
  })

  const notificationsByType = computed(() => {
    const grouped: Record<string, Notification[]> = {}
    notifications.value.forEach(notification => {
      if (!grouped[notification.type]) {
        grouped[notification.type] = []
      }
      grouped[notification.type].push(notification)
    })
    return grouped
  })

  const recentNotifications = computed(() => {
    return notifications.value
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  })

  // 方法
  const fetchNotifications = async (options: {
    type?: string
    status?: string
    page?: number
    limit?: number
    unreadOnly?: boolean
  } = {}) => {
    try {
      loading.value = true
      const query = new URLSearchParams()

      if (options.type) query.append('type', options.type)
      if (options.status) query.append('status', options.status)
      if (options.page) query.append('page', options.page.toString())
      if (options.limit) query.append('limit', options.limit.toString())
      if (options.unreadOnly) query.append('unreadOnly', 'true')

      const response = await notificationsStore.getNotifications(options)

      if (response.success) {
        notifications.value = response.data.notifications
        unreadCount.value = response.data.notifications.filter((n: Notification) => !n.readAt).length
        return response.data
      } else {
        throw new Error(response.message || '获取通知失败')
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchPreferences = async () => {
    try {
      const response = await notificationsStore.getNotificationPreferences()

      if (response.success && response.data) {
        preferences.value = response.data.notificationPreference
        reminderSettings.value = response.data.reminderSettings
        return response.data
      } else {
        throw new Error(response.message || '获取通知偏好失败')
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
      throw error
    }
  }

  const updatePreferences = async (data: Partial<NotificationPreference & ReminderSettings>) => {
    try {
      const response = await notificationsStore.updateNotificationPreferences(data)

      if (response.success) {
        // 更新本地状态
        if (response.data.notificationPreference) {
          preferences.value = { ...preferences.value, ...response.data.notificationPreference }
        }
        if (response.data.reminderSettings) {
          reminderSettings.value = { ...reminderSettings.value, ...response.data.reminderSettings }
        }
        return response.data
      } else {
        throw new Error(response.message || '更新通知偏好失败')
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
      throw error
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await notificationsStore.markNotificationsAsRead([notificationId])

      if (response.success) {
        // 更新本地状态
        const notification = notifications.value.find(n => n.id === notificationId)
        if (notification) {
          notification.readAt = new Date().toISOString()
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        return response.data
      } else {
        throw new Error(response.message || '标记通知失败')
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      throw error
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = unreadNotifications.value.map(n => n.id)
      if (unreadIds.length === 0) return

      const response = await notificationsStore.markMultipleAsRead(unreadIds)

      if (response.success) {
        // 更新本地状态
        notifications.value.forEach(notification => {
          if (unreadIds.includes(notification.id)) {
            notification.readAt = new Date().toISOString()
          }
        })
        unreadCount.value = 0
        return response.data
      } else {
        throw new Error(response.message || '标记所有通知失败')
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      throw error
    }
  }

  const generateReminderPreview = async (data: {
    recurringReservationId: string
    startDate: string
    endDate: string
    reminderMinutes?: number
  }) => {
    try {
      const response = await notificationsStore.previewNotification(data)

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.message || '生成提醒预览失败')
      }
    } catch (error) {
      console.error('Failed to generate reminder preview:', error)
      throw error
    }
  }

  const getNotificationStats = async (period: number = 30) => {
    try {
      const response = await notificationsStore.getNotificationStats(`${period}d`)

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.message || '获取通知统计失败')
      }
    } catch (error) {
      console.error('Failed to get notification stats:', error)
      throw error
    }
  }

  const refreshNotifications = async () => {
    await fetchNotifications()
  }

  const refreshPreferences = async () => {
    await fetchPreferences()
  }

  // 格式化方法
  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const getNotificationIcon = (type: string, status: string) => {
    const baseIcons: Record<string, string> = {
      'RESERVATION_REMINDER': 'pi pi-calendar',
      'RESERVATION_CONFIRMED': 'pi pi-check-circle',
      'RESERVATION_CANCELLED': 'pi pi-times-circle',
      'RESERVATION_MODIFIED': 'pi pi-pencil',
      'RECURRING_REMINDER': 'pi pi-refresh',
      'SYSTEM_ANNOUNCEMENT': 'pi pi-info-circle',
      'MAINTENANCE_NOTICE': 'pi pi-exclamation-triangle',
      'SECURITY_ALERT': 'pi pi-shield',
      'REMINDER_PREVIEW': 'pi pi-eye'
    }

    const icon = baseIcons[type] || 'pi pi-bell'
    const colorClass = status === 'FAILED' ? 'text-red-500' : status === 'READ' ? 'text-green-500' : 'text-blue-500'

    return `${icon} ${colorClass}`
  }

  const getNotificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'RESERVATION_REMINDER': '预约提醒',
      'RESERVATION_CONFIRMED': '预约确认',
      'RESERVATION_CANCELLED': '预约取消',
      'RESERVATION_MODIFIED': '预约修改',
      'RECURRING_REMINDER': '周期性预约提醒',
      'SYSTEM_ANNOUNCEMENT': '系统公告',
      'MAINTENANCE_NOTICE': '维护通知',
      'SECURITY_ALERT': '安全告警',
      'REMINDER_PREVIEW': '提醒预览'
    }
    return labels[type] || type
  }

  return {
    // 状态
    loading: readonly(loading),
    notifications: readonly(notifications),
    preferences: readonly(preferences),
    reminderSettings: readonly(reminderSettings),
    unreadCount: readonly(unreadCount),

    // 计算属性
    unreadNotifications,
    notificationsByType,
    recentNotifications,

    // 方法
    fetchNotifications,
    fetchPreferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    generateReminderPreview,
    getNotificationStats,
    refreshNotifications,
    refreshPreferences,

    // 格式化方法
    formatNotificationTime,
    getNotificationIcon,
    getNotificationTypeLabel
  }
}