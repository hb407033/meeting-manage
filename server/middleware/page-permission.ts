import type { NitroRouteConfig } from 'nitropack'
import { getCurrentUser } from '~~/server/utils/auth'

/**
 * 页面权限中间件
 * 用于检查用户是否有权限访问特定页面
 */
export default defineEventHandler(async (event) => {
  // 跳过API路由和静态资源
  const url = getRequestURL(event)
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/_nuxt/') ||
      url.pathname.includes('.') ||
      url.pathname === '/') {
    return
  }

  // 检查路由是否需要权限验证
  const routeConfig = getRoutePermissionConfig(url.pathname)
  if (!routeConfig) {
    return
  }

  try {
    // 获取当前用户
    const user = await getCurrentUser(event)
    if (!user) {
      // 用户未登录，重定向到登录页
      return sendRedirect(event, '/auth/login?redirect=' + encodeURIComponent(url.pathname))
    }

    // 管理员跳过权限检查
    if (user.isAdmin) {
      return
    }

    const { hasPermission, hasRole, hasAnyPermission, hasAnyRole } = usePermissions()

    // 检查所需权限
    if (routeConfig.permissions && routeConfig.permissions.length > 0) {
      const hasRequiredPermission = routeConfig.requireAll
        ? await Promise.all(
            routeConfig.permissions.map(permission =>
              hasPermission(user.id, permission)
            )
          ).then(results => results.every(Boolean))
        : await hasAnyPermission(user.id, routeConfig.permissions)

      if (!hasRequiredPermission) {
        return handlePermissionDenied(event, {
          user,
          requiredPermissions: routeConfig.permissions,
          redirectPath: url.pathname
        })
      }
    }

    // 检查所需角色
    if (routeConfig.roles && routeConfig.roles.length > 0) {
      const hasRequiredRole = routeConfig.requireAll
        ? await Promise.all(
            routeConfig.roles.map(role =>
              hasRole(user.id, role)
            )
          ).then(results => results.every(Boolean))
        : await hasAnyRole(user.id, routeConfig.roles)

      if (!hasRequiredRole) {
        return handlePermissionDenied(event, {
          user,
          requiredRoles: routeConfig.roles,
          redirectPath: url.pathname
        })
      }
    }

    // 权限检查通过，将用户信息添加到事件上下文
    event.context.user = user
    event.context.permissions = routeConfig.permissions || []
    event.context.roles = routeConfig.roles || []

  } catch (error) {
    console.error('权限检查失败:', error)

    // 权限检查出错时，重定向到错误页面
    return sendRedirect(event, '/error?code=permission_check_failed')
  }
})

/**
 * 获取路由权限配置
 */
function getRoutePermissionConfig(pathname: string): RoutePermissionConfig | null {
  const routeConfigs: Record<string, RoutePermissionConfig> = {
    // 管理员路由
    '/admin': {
      permissions: ['admin:access'],
      roles: ['ADMIN'],
      requireAll: false
    },
    '/admin/permissions': {
      permissions: ['permission:read'],
      roles: ['ADMIN'],
      requireAll: false
    },
    '/admin/roles': {
      permissions: ['role:read'],
      roles: ['ADMIN'],
      requireAll: false
    },
    '/admin/users': {
      permissions: ['user:read'],
      roles: ['ADMIN'],
      requireAll: false
    },
    '/admin/organizations': {
      permissions: ['organization:read'],
      roles: ['ADMIN', 'MANAGER'],
      requireAll: false
    },
    '/admin/audit': {
      permissions: ['audit:read'],
      roles: ['ADMIN'],
      requireAll: false
    },

    // 业务路由
    '/rooms': {
      permissions: ['room:read'],
      requireAll: false
    },
    '/rooms/create': {
      permissions: ['room:create'],
      roles: ['ADMIN', 'MANAGER'],
      requireAll: false
    },
    '/reservations': {
      permissions: ['reservation:read'],
      requireAll: false
    },
    '/reservations/create': {
      permissions: ['reservation:create'],
      requireAll: false
    },
    '/profile': {
      permissions: ['profile:read'],
      requireAll: false
    },

    // 用户管理路由
    '/users': {
      permissions: ['user:read'],
      roles: ['ADMIN', 'MANAGER'],
      requireAll: false
    },
    '/users/create': {
      permissions: ['user:create'],
      roles: ['ADMIN'],
      requireAll: false
    }
  }

  // 精确匹配
  if (routeConfigs[pathname]) {
    return routeConfigs[pathname]
  }

  // 模糊匹配
  for (const [route, config] of Object.entries(routeConfigs)) {
    if (pathname.startsWith(route) && route !== '/') {
      return config
    }
  }

  return null
}

/**
 * 处理权限拒绝情况
 */
async function handlePermissionDenied(
  event: any,
  options: PermissionDeniedOptions
) {
  const { user, requiredPermissions, requiredRoles, redirectPath } = options

  // 记录权限拒绝日志
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'permission:denied',
        resourceType: 'Page',
        resourceId: redirectPath,
        details: {
          requiredPermissions,
          requiredRoles,
          timestamp: new Date().toISOString()
        },
        ipAddress: getClientIP(event) || 'unknown',
        userAgent: getHeader(event, 'user-agent') || 'unknown',
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('记录权限拒绝日志失败:', error)
  }

  // 构建重定向URL
  const queryParams = new URLSearchParams()
  if (requiredPermissions?.length) {
    queryParams.set('required', requiredPermissions.join(','))
  }
  if (requiredRoles?.length) {
    queryParams.set('roles', requiredRoles.join(','))
  }
  if (redirectPath) {
    queryParams.set('redirect', redirectPath)
  }

  const deniedUrl = '/permission-denied' + (queryParams.toString() ? '?' + queryParams.toString() : '')

  // 如果是API请求，返回403状态码
  if (getRequestURL(event).pathname.startsWith('/api/')) {
    throw createError({
      statusCode: 403,
      statusMessage: '权限不足'
    })
  }

  // 页面请求重定向到权限拒绝页面
  return sendRedirect(event, deniedUrl)
}

/**
 * 权限配置接口
 */
interface RoutePermissionConfig {
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean // 是否需要所有权限/角色，默认false（满足任一即可）
}

/**
 * 权限拒绝选项
 */
interface PermissionDeniedOptions {
  user: any
  requiredPermissions?: string[]
  requiredRoles?: string[]
  redirectPath?: string
}