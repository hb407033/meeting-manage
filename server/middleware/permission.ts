import { hasPermission, hasRole, hasAnyPermission } from '~~/server/utils/auth'

export interface PermissionMiddlewareOptions {
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean // 是否需要所有权限/角色
  skipOnNoAuth?: boolean // 用户未认证时是否跳过检查
}

/**
 * 权限检查中间件工厂函数 - 保留向后兼容性
 * @param options 权限配置选项
 * @returns 中间件函数
 */
export function createPermissionMiddleware(options: PermissionMiddlewareOptions = {}) {
  return async function permissionMiddleware(event: any) {
    return checkPermissions(event, options)
  }
}

/**
 * 核心权限检查函数
 */
async function checkPermissions(event: any, options: PermissionMiddlewareOptions = {}) {
  const { permissions = [], roles = [], requireAll = false, skipOnNoAuth = false } = options
  debugger
  // 获取当前用户
  const user = event.context.user

  // 如果没有用户信息
  if (!user) {
    if (skipOnNoAuth) {
      return
    }
    throw createError({
      statusCode: 401,
      statusMessage: '未认证，请先登录'
    })
  }

  const userId = user.id
  let hasAccess = false

  try {
    // 检查角色权限
    if (roles.length > 0) {
      if (requireAll) {
        // 需要所有角色
        for (const role of roles) {
          const roleResult = await hasRole(event, role)
          if (!roleResult) {
            hasAccess = false
            break
          }
          hasAccess = true
        }
      } else {
        // 需要任一角色 - 先检查具体角色
        for (const role of roles) {
          const roleResult = await hasRole(event, role)
          if (roleResult) {
            hasAccess = true
            break
          }
        }
      }
    }

    // 检查具体权限
    if (permissions.length > 0) {
      if (requireAll) {
        // 需要所有权限
        for (const permission of permissions) {
          const permResult = await hasPermission(event, permission)
          if (!permResult) {
            hasAccess = false
            break
          }
          hasAccess = true
        }
      } else {
        // 需要任一权限
        hasAccess = await hasAnyPermission(event, permissions)
      }
    }

    // 如果没有配置权限或角色，默认拒绝访问
    if (permissions.length === 0 && roles.length === 0) {
      hasAccess = false
    }

  } catch (error) {
    console.error('权限检查失败:', error)
    hasAccess = false
  }

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: '权限不足，无法访问此资源'
    })
  }
}

/**
 * Nuxt 4 约定的默认中间件导出
 * 通过查询参数或路由配置来指定权限要求
 *
 * 重要：此中间件只会在明确指定权限要求时进行检查
 * 如果没有权限配置，中间件会自动跳过检查
 *
 * 使用方式：
 * 1. 通过路由配置: /api/protected?permissions=user:read,admin:access
 * 2. 通过路由配置: /api/protected?roles=ADMIN,MANAGER
 * 3. 通过路由配置: /api/protected?requireAll=true
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // 从查询参数中解析权限配置
  const options: PermissionMiddlewareOptions = {}

  if (query.permissions) {
    options.permissions = Array.isArray(query.permissions)
      ? query.permissions as string[]
      : (query.permissions as string).split(',')
  }

  if (query.roles) {
    options.roles = Array.isArray(query.roles)
      ? query.roles as string[]
      : (query.roles as string).split(',')
  }

  if (query.requireAll === 'true' || query.requireAll === true) {
    options.requireAll = true
  }

  if (query.skipOnNoAuth === 'true' || query.skipOnNoAuth === true) {
    options.skipOnNoAuth = true
  }

  // 关键修复：只有当明确配置了权限要求时才进行检查
  // 这样可以避免对首页等公共页面进行不必要的权限检查
  if (options.permissions && options.permissions.length > 0) {
    await checkPermissions(event, options)
  } else if (options.roles && options.roles.length > 0) {
    await checkPermissions(event, options)
  } else {
    // 没有权限配置，跳过检查 - 允许访问公共页面
    return
  }
})

/**
 * 便捷的权限中间件创建函数 - 保留向后兼容性
 */
export const requirePermission = (permission: string) =>
  createPermissionMiddleware({ permissions: [permission] })

export const requirePermissions = (permissions: string[], requireAll = false) =>
  createPermissionMiddleware({ permissions, requireAll })

export const requireRole = (role: string) =>
  createPermissionMiddleware({ roles: [role] })

export const requireRoles = (roles: string[], requireAll = false) =>
  createPermissionMiddleware({ roles, requireAll })

export const requireAny = (permissions: string[], roles: string[]) =>
  createPermissionMiddleware({ permissions, roles, requireAll: false })

export const requireAllOptions = (permissions: string[], roles: string[]) =>
  createPermissionMiddleware({ permissions, roles, requireAll: true })

/**
 * 管理员权限中间件
 */
export const requireAdmin = createPermissionMiddleware({
  roles: ['ADMIN']
})

/**
 * 部门经理或管理员权限中间件
 */
export const requireManagerOrAdmin = createPermissionMiddleware({
  roles: ['MANAGER', 'ADMIN'],
  requireAll: false
})

/**
 * 资源所有者或管理员权限中间件
 * @param getResourceUserId 获取资源所有者ID的函数
 */
export function requireOwnerOrAdmin(getResourceId: (event: any) => Promise<string>) {
  return async function ownerOrAdminMiddleware(event: any) {
    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '未认证，请先登录'
      })
    }

    // 检查是否是管理员
    const isAdmin = await hasRole({ context: { user } }, 'ADMIN')
    if (isAdmin) {
      return
    }

    // 获取资源ID并检查所有权
    try {
      const resourceId = await getResourceId(event)
      // 这里需要根据具体业务逻辑检查资源所有权
      // 暂时简化处理
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，只能访问自己的资源'
      })
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      throw createError({
        statusCode: 403,
        statusMessage: '权限检查失败'
      })
    }
  }
}

/**
 * 权限辅助函数 - 用于在API路由中手动检查权限
 */
export async function checkEventPermissions(
  event: any,
  options: PermissionMiddlewareOptions
): Promise<boolean> {
  try {
    await checkPermissions(event, options)
    return true
  } catch (error) {
    return false
  }
}

/**
 * 为特定权限创建专用的 Nuxt 中间件文件
 */
export const createPermissionFile = (
  name: string,
  options: PermissionMiddlewareOptions
) => {
  return `
// ${name} - 自动生成的权限中间件
import { checkPermissions } from '~~/server/middleware/permission'

export default defineEventHandler(async (event) => {
  await checkPermissions(event, ${JSON.stringify(options)})
})
`
}