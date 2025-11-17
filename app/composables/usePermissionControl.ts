import type { Ref } from 'vue'

interface PermissionControlOptions {
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean
  fallback?: 'hide' | 'disable' | 'deny'
  denyMessage?: string
  onDenied?: () => void
}

interface PermissionCheckResult {
  hasPermission: boolean
  isLoading: boolean
  error: string | null
}

interface UsePermissionControlReturn {
  canAccess: Ref<boolean>
  checkResult: Ref<PermissionCheckResult>
  checkPermissions: () => Promise<void>
  requirePermission: (permission: string) => boolean
  requireRole: (role: string) => boolean
  withPermission: (callback: () => void, permission?: string) => void
  permissionWrapper: {
    show: boolean
    disabled: boolean
    denied: boolean
  }
}

/**
 * 权限控制composable
 * 用于在组件中方便地集成权限检查
 */
export function usePermissionControl(
  options: PermissionControlOptions = {}
): UsePermissionControlReturn {
  const {
    permissions = [],
    roles = [],
    requireAll = false,
    fallback = 'hide',
    denyMessage,
    onDenied
  } = options

  const currentUser = useState('currentUser', () => null)
  const { hasPermission, hasRole, hasAnyPermission, hasAnyRole } = usePermissions()

  // 响应式数据
  const canAccess = ref(false)
  const checkResult = ref<PermissionCheckResult>({
    hasPermission: false,
    isLoading: false,
    error: null
  })

  // 权限包装器状态
  const permissionWrapper = computed(() => ({
    show: fallback === 'hide' ? canAccess.value : true,
    disabled: fallback === 'disable' ? !canAccess.value : false,
    denied: fallback === 'deny' ? !canAccess.value : false
  }))

  /**
   * 检查权限
   */
  const checkPermissions = async () => {
    if (!currentUser.value) {
      checkResult.value = {
        hasPermission: false,
        isLoading: false,
        error: '用户未登录'
      }
      canAccess.value = false
      return
    }

    checkResult.value = {
      ...checkResult.value,
      isLoading: true,
      error: null
    }

    try {
      const userId = currentUser.value.id

      // 检查角色权限
      let roleResult = true
      if (roles.length > 0) {
        if (requireAll) {
          roleResult = await Promise.all(
            roles.map(role => hasRole(userId, role))
          ).then(results => results.every(Boolean))
        } else {
          roleResult = await hasAnyRole(userId, roles)
        }
      }

      // 检查功能权限
      let permissionResult = true
      if (permissions.length > 0) {
        if (requireAll) {
          permissionResult = await Promise.all(
            permissions.map(permission => hasPermission(userId, permission))
          ).then(results => results.every(Boolean))
        } else {
          permissionResult = await hasAnyPermission(userId, permissions)
        }
      }

      const finalResult = roleResult && permissionResult

      checkResult.value = {
        hasPermission: finalResult,
        isLoading: false,
        error: null
      }

      canAccess.value = finalResult

      // 如果没有权限且定义了回调，则执行回调
      if (!finalResult && onDenied) {
        onDenied()
      }

    } catch (error) {
      console.error('权限检查失败:', error)
      checkResult.value = {
        hasPermission: false,
        isLoading: false,
        error: '权限检查失败'
      }
      canAccess.value = false
    }
  }

  /**
   * 检查单个权限
   */
  const requirePermission = (permission: string): boolean => {
    if (!currentUser.value) return false
    // 这里可以使用缓存的结果或重新检查
    return checkResult.value.hasPermission
  }

  /**
   * 检查单个角色
   */
  const requireRole = (role: string): boolean => {
    if (!currentUser.value) return false
    // 这里可以使用缓存的结果或重新检查
    return checkResult.value.hasPermission
  }

  /**
   * 带权限检查的回调执行
   */
  const withPermission = (callback: () => void, permission?: string) => {
    if (canAccess.value || (permission && requirePermission(permission))) {
      callback()
    } else {
      if (onDenied) {
        onDenied()
      }
    }
  }

  // 初始化权限检查
  onMounted(() => {
    checkPermissions()
  })

  // 监听用户变化
  watch(() => currentUser.value?.id, () => {
    checkPermissions()
  })

  // 监听权限选项变化
  watch([() => permissions, () => roles, () => requireAll], () => {
    checkPermissions()
  }, { deep: true })

  return {
    canAccess,
    checkResult,
    checkPermissions,
    requirePermission,
    requireRole,
    withPermission,
    permissionWrapper
  }
}

/**
 * 权限指令助手
 */
export function createPermissionDirective(options: PermissionControlOptions = {}) {
  return {
    mounted(el: HTMLElement, binding: any) {
      const permission = binding.value
      if (typeof permission === 'string') {
        // 单个权限检查
        // 这里可以集成到实际的权限检查逻辑中
      } else if (Array.isArray(permission)) {
        // 多个权限检查
        // 这里可以集成到实际的权限检查逻辑中
      }
    },
    updated(el: HTMLElement, binding: any) {
      // 更新时重新检查权限
    }
  }
}

/**
 * 路由权限守卫助手
 */
export function createRouteGuard(permissions: string[] = [], roles: string[] = []) {
  return async (to: any, from: any, next: any) => {
    const { hasPermission, hasRole, hasAnyPermission, hasAnyRole } = usePermissions()
    const { user, isAuthenticated, hasRole: authHasRole } = useAuth()

    if (!isAuthenticated.value || !user.value) {
      return next('/auth/login')
    }

    const userId = user.value.id

    try {
      let hasRequiredPermission = true

      // 检查角色
      if (roles.length > 0) {
        // 使用 useAuth 中的角色检查
        hasRequiredPermission = roles.some(role => authHasRole(role))
        // 或者使用权限系统中的角色检查
        // hasRequiredPermission = await hasAnyRole(userId, roles)
      }

      // 检查权限
      if (hasRequiredPermission && permissions.length > 0) {
        hasRequiredPermission = await hasAnyPermission(userId, permissions)
      }

      if (hasRequiredPermission) {
        next()
      } else {
        next({
          path: '/permission-denied',
          query: {
            required: permissions.join(','),
            roles: roles.join(','),
            redirect: to.path
          }
        })
      }
    } catch (error) {
      console.error('路由权限检查失败:', error)
      next('/error')
    }
  }
}

/**
 * 权限装饰器（如果使用TypeScript装饰器）
 */
export function RequirePermission(permission: string | string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const { hasPermission, hasAnyPermission } = usePermissions()
      const { user, isAuthenticated } = useAuth()

      if (!isAuthenticated.value || !user.value) {
        throw new Error('用户未登录')
      }

      const currentUser = user.value

      try {
        let hasRequiredPermission = true

        if (Array.isArray(permission)) {
          hasRequiredPermission = await hasAnyPermission(currentUser.id, permission)
        } else {
          hasRequiredPermission = await hasPermission(currentUser.id, permission)
        }

        if (hasRequiredPermission) {
          return originalMethod.apply(this, args)
        } else {
          throw new Error(`权限不足: 需要权限 ${Array.isArray(permission) ? permission.join(', ') : permission}`)
        }
      } catch (error) {
        console.error('方法权限检查失败:', error)
        throw error
      }
    }

    return descriptor
  }
}

/**
 * 权限配置常量
 */
export const PERMISSION_CONFIG = {
  // 页面级权限
  PAGE_PERMISSIONS: {
    DASHBOARD: 'dashboard:read',
    USER_MANAGEMENT: 'user:manage',
    ROLE_MANAGEMENT: 'role:manage',
    PERMISSION_MANAGEMENT: 'permission:manage',
    ROOM_MANAGEMENT: 'room:manage',
    RESERVATION_MANAGEMENT: 'reservation:manage',
    AUDIT_LOG: 'audit:read',
    SYSTEM_SETTINGS: 'system:manage'
  },

  // 功能级权限
  ACTION_PERMISSIONS: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    APPROVE: 'approve',
    EXPORT: 'export',
    IMPORT: 'import',
    ASSIGN: 'assign'
  },

  // 数据级权限
  DATA_PERMISSIONS: {
    ALL_ORG_DATA: 'data:all_org',
    ORG_DATA: 'data:org',
    TEAM_DATA: 'data:team',
    OWN_DATA: 'data:own'
  },

  // 默认回退策略
  FALLBACK_STRATEGIES: {
    HIDE: 'hide',
    DISABLE: 'disable',
    DENY: 'deny'
  }
} as const

/**
 * 常用权限组合
 */
export const PERMISSION_COMBINATIONS = {
  // 用户管理相关权限
  USER_MANAGEMENT: [
    'user:read',
    'user:create',
    'user:update',
    'user:delete',
    'user:assign'
  ],

  // 角色管理相关权限
  ROLE_MANAGEMENT: [
    'role:read',
    'role:create',
    'role:update',
    'role:delete',
    'role:assign'
  ],

  // 权限管理相关权限
  PERMISSION_MANAGEMENT: [
    'permission:read',
    'permission:create',
    'permission:update',
    'permission:delete',
    'permission:assign'
  ],

  // 会议室管理相关权限
  ROOM_MANAGEMENT: [
    'room:read',
    'room:create',
    'room:update',
    'room:delete',
    'room:manage'
  ],

  // 预约管理相关权限
  RESERVATION_MANAGEMENT: [
    'reservation:read',
    'reservation:create',
    'reservation:update',
    'reservation:delete',
    'reservation:approve'
  ],

  // 系统管理权限（管理员专用）
  SYSTEM_ADMIN: [
    'admin:access',
    'system:manage',
    'audit:read',
    'config:manage'
  ]
} as const