/**
 * 通知状态管理
 * 使用 Pinia 进行状态管理
 */

import { defineStore } from 'pinia'
import { authStateManager } from '~/utils/auth-state-manager'

import { getApiFetch } from '~/utils/api-fetch'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    notifications: [] as any[],
    unreadCount: 0,
    loading: false,
    error: null as string | null
  }),

  getters: {
    unreadNotifications: (state) => state.notifications.filter(n => !n.readAt),
    hasUnreadNotifications: (state) => state.unreadCount > 0
  },

  actions: {
    setLoading(loading: boolean) {
      this.loading = loading
    },

    setError(error: string | null) {
      this.error = error
    },

    // 获取通知列表
    async getNotifications(options: {
      type?: string
      status?: string
      page?: number
      limit?: number
      unreadOnly?: boolean
    } = {}) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const query = new URLSearchParams()

        if (options.type) query.append('type', options.type)
        if (options.status) query.append('status', options.status)
        if (options.page) query.append('page', options.page.toString())
        if (options.limit) query.append('limit', options.limit.toString())
        if (options.unreadOnly) query.append('unreadOnly', 'true')

        const response = await (apiFetch as any)(`/api/v1/notifications?${query.toString()}`)

        if (response.success) {
          this.notifications = response.data.notifications
          this.unreadCount = response.data.notifications.filter((n: any) => !n.readAt).length
          return response.data
        } else {
          throw new Error(response.message || '获取通知失败')
        }
      } catch (error: any) {
        this.setError(error.message || '获取通知失败')
        console.error('获取通知失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取未读数量
    async getUnreadCount() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/unread-count')

        if (response.success) {
          this.unreadCount = response.data.count
          return response.data.count
        } else {
          throw new Error(response.message || '获取未读数量失败')
        }
      } catch (error: any) {
        this.setError(error.message || '获取未读数量失败')
        console.error('获取未读数量失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 标记为已读
    async markAsRead(notificationId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)(`/api/v1/notifications/${notificationId}/read`, {
          method: 'POST'
        })

        if (response.success) {
          // 更新本地状态
          const notification = this.notifications.find(n => n.id === notificationId)
          if (notification) {
            notification.readAt = new Date().toISOString()
            this.unreadCount = Math.max(0, this.unreadCount - 1)
          }
          return response.data
        } else {
          throw new Error(response.message || '标记已读失败')
        }
      } catch (error: any) {
        this.setError(error.message || '标记已读失败')
        console.error('标记已读失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 标记全部为已读
    async markAllAsRead() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/mark-all-read', {
          method: 'POST'
        })

        if (response.success) {
          // 更新本地状态
          this.notifications.forEach(notification => {
            if (!notification.readAt) {
              notification.readAt = new Date().toISOString()
            }
          })
          this.unreadCount = 0
          return response.data
        } else {
          throw new Error(response.message || '标记全部已读失败')
        }
      } catch (error: any) {
        this.setError(error.message || '标记全部已读失败')
        console.error('标记全部已读失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 删除通知
    async deleteNotification(notificationId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)(`/api/v1/notifications/${notificationId}`, {
          method: 'DELETE'
        })

        if (response.success) {
          // 更新本地状态
          const index = this.notifications.findIndex(n => n.id === notificationId)
          if (index !== -1) {
            const notification = this.notifications[index]
            if (!notification.readAt) {
              this.unreadCount = Math.max(0, this.unreadCount - 1)
            }
            this.notifications.splice(index, 1)
          }
          return response.data
        } else {
          throw new Error(response.message || '删除通知失败')
        }
      } catch (error: any) {
        this.setError(error.message || '删除通知失败')
        console.error('删除通知失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 批量删除
    async deleteMultipleNotifications(notificationIds: string[]) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/batch-delete', {
          method: 'POST',
          body: { notificationIds }
        })

        if (response.success) {
          // 更新本地状态
          notificationIds.forEach(id => {
            const index = this.notifications.findIndex(n => n.id === id)
            if (index !== -1) {
              const notification = this.notifications[index]
              if (!notification.readAt) {
                this.unreadCount = Math.max(0, this.unreadCount - 1)
              }
              this.notifications.splice(index, 1)
            }
          })
          return response.data
        } else {
          throw new Error(response.message || '批量删除通知失败')
        }
      } catch (error: any) {
        this.setError(error.message || '批量删除通知失败')
        console.error('批量删除通知失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 创建通知
    async createNotification(notificationData: {
      title: string
      content: string
      type?: string
      priority?: string
      targetUsers?: string[]
      metadata?: any
    }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications', {
          method: 'POST',
          body: notificationData
        })

        if (response.success) {
          return response.data
        } else {
          throw new Error(response.message || '创建通知失败')
        }
      } catch (error: any) {
        this.setError(error.message || '创建通知失败')
        console.error('创建通知失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取通知偏好设置
    async getNotificationPreferences() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/preferences')

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取通知偏好失败')
        console.error('获取通知偏好失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 更新通知偏好设置
    async updateNotificationPreferences(preferences: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/preferences', {
          method: 'PUT',
          body: preferences
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '更新通知偏好失败')
        console.error('更新通知偏好失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 标记通知为已读（单个）
    async markNotificationsAsRead(notificationIds?: string[]) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/read', {
          method: 'POST',
          body: { notificationIds }
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '标记已读失败')
        console.error('标记已读失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 批量标记已读
    async markMultipleAsRead(notificationIds: string[]) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/read', {
          method: 'POST',
          body: { notificationIds }
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '批量标记已读失败')
        console.error('批量标记已读失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 预览通知
    async previewNotification(notificationData: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/notifications/preview', {
          method: 'POST',
          body: notificationData
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '预览通知失败')
        console.error('预览通知失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取通知统计
    async getNotificationStats(period: string = '7d') {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)(`/api/v1/notifications/stats?period=${period}`)

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取通知统计失败')
        console.error('获取通知统计失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    }
  }
})