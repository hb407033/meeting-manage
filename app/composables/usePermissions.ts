import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

export const usePermissions = () => {
  const authStore = useAuthStore()

  /**
   * 检查用户是否有指定权限
   */
  const hasPermission = (permission: string): boolean => {
    return authStore.hasPermission(permission)
  }

  /**
   * 检查用户是否有指定角色
   */
  const hasRole = (role: string): boolean => {
    return authStore.hasRole(role)
  }

  /**
   * 检查用户是否有任一权限
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => authStore.hasPermission(permission))
  }

  /**
   * 检查用户是否有所有权限
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => authStore.hasPermission(permission))
  }

  /**
   * 检查是否可以访问资源
   */
  const canAccess = (resource: string, action?: string): boolean => {
    return authStore.canAccess(resource, action)
  }

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    // 暴露 store 中的状态
    userPermissions: computed(() => authStore.userPermissions),
    userRole: computed(() => authStore.userRole)
  }
}

// 导出独立的函数供直接使用
export const hasPermission = (permission: string): boolean => {
  const { hasPermission: hp } = usePermissions()
  return hp(permission)
}

export const hasRole = (role: string): boolean => {
  const { hasRole: hr } = usePermissions()
  return hr(role)
}

export const hasAnyPermission = (permissions: string[]): boolean => {
  const { hasAnyPermission: hap } = usePermissions()
  return hap(permissions)
}

export const hasAllPermissions = (permissions: string[]): boolean => {
  const { hasAllPermissions: hap } = usePermissions()
  return hap(permissions)
}

export const getUserPermissions = (): string[] => {
  const authStore = useAuthStore()
  return authStore.userPermissions
}

export const getUserRoles = (): string[] => {
  const authStore = useAuthStore()
  return [authStore.userRole].filter(Boolean)
}

// 导出权限缓存清理函数
export function clearUserPermissionCache(userId: string, organizationId?: string): Promise<void> {
  const authStore = useAuthStore()
  return authStore.clearUserPermissionCache(userId, organizationId)
}