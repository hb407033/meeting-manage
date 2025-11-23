/**
 * 管理后台状态管理
 * 使用 Pinia 进行状态管理
 */

import { defineStore } from 'pinia'
import { authStateManager } from '~/utils/auth-state-manager'

// 获取 $apiFetch 的辅助函数
function getApiFetch() {
  try {
    const nuxtApp = useNuxtApp()
    if (nuxtApp && nuxtApp.$apiFetch) {
      return nuxtApp.$apiFetch as typeof $fetch
    }

    // 如果无法获取 $apiFetch，则使用带认证的 $fetch 作为后备
    return $fetch.create({
      onRequest({ request, options }) {
        // 只对API请求添加认证头
        if (typeof request === 'string' && request.startsWith('/api/')) {
          // 使用 AuthStateManager 统一管理token
          const state = authStateManager.getState()
          const token = state.accessToken

          if (token) {
            options.headers = {
              ...options.headers,
              Authorization: `Bearer ${token}`
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('获取 $apiFetch 失败:', error)
    // 返回基本的 $fetch 作为后备
    return $fetch
  }
}

// 管理相关接口定义
export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId?: string
  details?: string
  ipAddress: string
  userAgent: string
  timestamp: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  success: boolean
}

export interface SystemAlert {
  id: string
  type: 'ERROR' | 'WARNING' | 'INFO'
  title: string
  message: string
  details?: any
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
  updatedAt: string
}

export interface AdminStats {
  totalUsers: number
  totalRooms: number
  totalReservations: number
  activeReservations: number
  cancelledReservations: number
  systemHealth: 'GOOD' | 'WARNING' | 'ERROR'
  lastSyncTime: string
}

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  actions: string[]
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  permissions?: string[]
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface AuditLogQuery {
  page?: number
  limit?: number
  userId?: string
  action?: string
  resource?: string
  severity?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface AdminListResponse<T> {
  items: T[]
  pagination: PaginationMeta
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    auditLogs: [] as AuditLog[],
    alerts: [] as SystemAlert[],
    stats: null as AdminStats | null,
    users: [] as User[],
    roles: [] as Role[],
    permissions: [] as Permission[],
    loading: false,
    auditLogsLoading: false,
    alertsLoading: false,
    error: null as string | null,
    auditLogsError: null as string | null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    } as PaginationMeta,
    auditLogsPagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    } as PaginationMeta
  }),

  getters: {
    // 获取未解决的警告
    unresolvedAlerts: (state) => state.alerts.filter(alert => !alert.isResolved),

    // 获取严重警告
    criticalAlerts: (state) => state.alerts.filter(alert =>
      !alert.isResolved && alert.severity === 'CRITICAL'
    ),

    // 获取最近的审计日志
    recentAuditLogs: (state) => state.auditLogs.slice(0, 10),

    // 获取用户统计
    activeUsersCount: (state) => state.users.filter(user => user.isActive).length,

    // 获取系统健康状态
    systemHealthStatus: (state) => state.stats?.systemHealth || 'ERROR'
  },

  actions: {
    // 设置加载状态
    setLoading(loading: boolean) {
      this.loading = loading
    },

    // 设置审计日志加载状态
    setAuditLogsLoading(loading: boolean) {
      this.auditLogsLoading = loading
    },

    // 设置错误信息
    setError(error: string | null) {
      this.error = error
    },

    // 设置审计日志错误信息
    setAuditLogsError(error: string | null) {
      this.auditLogsError = error
    },

    // 获取审计日志列表
    async getAuditLogs(params: AuditLogQuery = {}) {
      this.setAuditLogsLoading(true)
      this.setAuditLogsError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: {
            items: AuditLog[]
            pagination: PaginationMeta
          }
        }>('/api/v1/admin/audit-logs', {
          method: 'GET',
          query: {
            page: params.page || this.auditLogsPagination.page,
            limit: params.limit || this.auditLogsPagination.limit,
            ...params
          }
        })

        if (response.success && response.data) {
          this.auditLogs = response.data.items
          this.auditLogsPagination = response.data.pagination
        }

        return response.data
      } catch (error: any) {
        this.setAuditLogsError(error.message || '获取审计日志失败')
        console.error('获取审计日志失败:', error)
        return {
          items: [],
          pagination: this.auditLogsPagination
        }
      } finally {
        this.setAuditLogsLoading(false)
      }
    },

    // 获取系统警告列表
    async getAlerts() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: SystemAlert[]
        }>('/api/v1/admin/alerts')

        if (response.success) {
          this.alerts = response.data
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取系统警告失败')
        console.error('获取系统警告失败:', error)
        return []
      } finally {
        this.setLoading(false)
      }
    },

    // 导出审计日志
    async exportAuditLogs(params: AuditLogQuery = {}) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch.raw('/api/v1/admin/audit-logs/export', {
          method: 'POST',
          body: params
        })

        if (!response.ok) {
          throw new Error(`导出失败: ${response.statusText}`)
        }

        const csvContent = response._data as string

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit-logs-export-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        window.URL.revokeObjectURL(url)

        return {
          success: true,
          filename: link.download,
          size: csvContent.length
        }

      } catch (error: any) {
        this.setError(error.message || '导出审计日志失败')
        console.error('导出审计日志失败:', error)
        return {
          success: false,
          error: error.message
        }
      } finally {
        this.setLoading(false)
      }
    },

    // 获取系统统计信息
    async getSystemStats() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: AdminStats
        }>('/api/v1/admin/stats')

        if (response.success) {
          this.stats = response.data
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取系统统计失败')
        console.error('获取系统统计失败:', error)
        return null
      } finally {
        this.setLoading(false)
      }
    },

    // 获取用户列表
    async getUsers(params: {
      page?: number
      limit?: number
      search?: string
      role?: string
      isActive?: boolean
    } = {}) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: {
            items: User[]
            pagination: PaginationMeta
          }
        }>('/api/v1/admin/users', {
          method: 'GET',
          query: {
            page: params.page || this.pagination.page,
            limit: params.limit || this.pagination.limit,
            ...params
          }
        })

        if (response.success && response.data) {
          this.users = response.data.items
          this.pagination = response.data.pagination
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取用户列表失败')
        console.error('获取用户列表失败:', error)
        return {
          items: [],
          pagination: this.pagination
        }
      } finally {
        this.setLoading(false)
      }
    },

    // 更新用户状态
    async updateUserStatus(userId: string, isActive: boolean) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: User
        }>(`/api/v1/admin/users/${userId}/status`, {
          method: 'PUT',
          body: { isActive }
        })

        if (response.success) {
          // 更新本地状态
          const index = this.users.findIndex(user => user.id === userId)
          if (index !== -1) {
            this.users[index] = response.data
          }
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '更新用户状态失败')
        console.error('更新用户状态失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取角色列表
    async getRoles() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: Role[]
        }>('/api/v1/admin/roles')

        if (response.success) {
          this.roles = response.data
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取角色列表失败')
        console.error('获取角色列表失败:', error)
        return []
      } finally {
        this.setLoading(false)
      }
    },

    // 获取权限列表
    async getPermissions() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: Permission[]
        }>('/api/v1/admin/permissions')

        if (response.success) {
          this.permissions = response.data
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取权限列表失败')
        console.error('获取权限列表失败:', error)
        return []
      } finally {
        this.setLoading(false)
      }
    },

    // 分配用户角色
    async assignUserRole(userId: string, roleId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: User
        }>(`/api/v1/admin/users/${userId}/role`, {
          method: 'PUT',
          body: { roleId }
        })

        if (response.success) {
          // 更新本地状态
          const index = this.users.findIndex(user => user.id === userId)
          if (index !== -1) {
            this.users[index] = response.data
          }
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '分配用户角色失败')
        console.error('分配用户角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 解决警告
    async resolveAlert(alertId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: SystemAlert
        }>(`/api/v1/admin/alerts/${alertId}/resolve`, {
          method: 'PUT'
        })

        if (response.success) {
          // 更新本地状态
          const index = this.alerts.findIndex(alert => alert.id === alertId)
          if (index !== -1) {
            this.alerts[index] = response.data
          }
        }

        return response.data
      } catch (error: any) {
        this.setError(error.message || '解决警告失败')
        console.error('解决警告失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 清除用户权限缓存
    async clearUserPermissionCache(userId: string, organizationId?: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        await apiFetch('/api/v1/admin/permissions/clear-cache', {
          method: 'POST',
          body: {
            userId,
            organizationId
          }
        })

        console.log(`权限缓存已清除: 用户 ${userId}`)
      } catch (error: any) {
        this.setError(error.message || '清除权限缓存失败')
        console.error('清除权限缓存失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 清理审计日志
    async cleanupAuditLogs(params: {
      olderThanDays: number
      riskLevel?: string
      dryRun?: boolean
    }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: {
            deletedCount: number
            totalCount: number
          }
        }>('/api/v1/admin/audit-logs/cleanup', {
          method: 'DELETE',
          body: params
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '清理审计日志失败')
        console.error('清理审计日志失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取组织统计数据
    async getOrganizationStats() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: {
            statistics: any
          }
        }>('/api/v1/admin/organizations')

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取组织统计数据失败')
        console.error('获取组织统计数据失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 创建权限
    async createPermission(permissionData: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: Permission
        }>('/api/v1/admin/permissions', {
          method: 'POST',
          body: permissionData
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '创建权限失败')
        console.error('创建权限失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 更新权限
    async updatePermission(permissionId: string, permissionData: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: Permission
        }>(`/api/v1/admin/permissions/${permissionId}`, {
          method: 'PUT',
          body: permissionData
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '更新权限失败')
        console.error('更新权限失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 删除权限
    async deletePermission(permissionId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch(`/api/v1/admin/permissions/${permissionId}`, {
          method: 'DELETE'
        })

        return true
      } catch (error: any) {
        this.setError(error.message || '删除权限失败')
        console.error('删除权限失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 创建角色
    async createRole(roleData: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: Role
        }>('/api/v1/admin/roles', {
          method: 'POST',
          body: roleData
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '创建角色失败')
        console.error('创建角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 更新角色
    async updateRole(roleId: string, roleData: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: Role
        }>(`/api/v1/admin/roles/${roleId}`, {
          method: 'PUT',
          body: roleData
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '更新角色失败')
        console.error('更新角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 删除角色
    async deleteRole(roleId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch(`/api/v1/admin/roles/${roleId}`, {
          method: 'DELETE'
        })

        return true
      } catch (error: any) {
        this.setError(error.message || '删除角色失败')
        console.error('删除角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 分配权限到角色
    async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: Role
        }>(`/api/v1/admin/roles/${roleId}/permissions`, {
          method: 'POST',
          body: { permissionIds }
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '分配权限到角色失败')
        console.error('分配权限到角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取过滤的用户列表
    async getFilteredUsers(params: {
      organizationId?: string
      search?: string
    } = {}) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: User[]
        }>('/api/v1/users/filtered', {
          query: params
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取用户列表失败')
        console.error('获取用户列表失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取组织列表
    async getOrganizations() {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: any[]
        }>('/api/v1/organizations')

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取组织列表失败')
        console.error('获取组织列表失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 分配角色给用户
    async assignRoleToUser(userId: string, roleId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: User
        }>(`/api/v1/admin/users/${userId}/role`, {
          method: 'PUT',
          body: { roleId }
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '分配角色给用户失败')
        console.error('分配角色给用户失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 移除用户角色
    async removeUserRole(userId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: User
        }>(`/api/v1/admin/users/${userId}/role`, {
          method: 'DELETE'
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '移除用户角色失败')
        console.error('移除用户角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 批量分配角色
    async batchAssignRoles(assignments: Array<{ userId: string; roleId: string }>) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: any[]
        }>('/api/v1/admin/users/batch-assign-roles', {
          method: 'POST',
          body: { assignments }
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '批量分配角色失败')
        console.error('批量分配角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取用户角色
    async getUserRoles(userId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          success: boolean
          data: any[]
        }>(`/api/v1/admin/user-roles/${userId}`)

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取用户角色失败')
        console.error('获取用户角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 批量分配用户角色
    async batchAssignUserRoles(params: {
      userId: string
      assignments: Array<{
        userId: string
        roleId: string
        expiresAt?: string
        reason?: string
      }>
      reason?: string
    }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<{
          code: number
          success: boolean
          data: any
        }>('/api/v1/admin/user-roles/assign-batch', {
          method: 'POST',
          body: params
        })

        return response
      } catch (error: any) {
        this.setError(error.message || '批量分配用户角色失败')
        console.error('批量分配用户角色失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    }
  }
})