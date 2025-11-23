import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '~~/server/api/middleware/auth'
import prisma from '~~/server/services/database'

/**
 * 从事件中获取当前用户信息
 * 这是一个便捷函数，用于从请求事件中提取用户信息
 */
export async function getCurrentUser(event: any): Promise<AuthenticatedRequest['user'] | null> {
  try {
    // 首先检查是否有Authorization头 - 使用现代H3方法
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    // 使用authMiddleware但设置为required=false
    const auth = await authMiddleware(event, { required: false })
    return auth.user || null
  } catch (error) {
    // 如果认证失败，返回 null 而不是抛出错误
    console.warn('认证失败:', error.message)
    return null
  }
}

/**
 * 获取已认证的用户（必须登录）
 * 如果用户未登录，会抛出错误
 */
export async function getRequiredCurrentUser(event: any): Promise<AuthenticatedRequest['user']> {
  const auth = await authMiddleware(event, { required: true })

  if (!auth.user) {
    throw new Error('用户未登录')
  }

  return auth.user
}

/**
 * 检查用户是否已登录
 */
export async function isAuthenticated(event: any): Promise<boolean> {
  const user = await getCurrentUser(event)
  return user !== null
}

/**
 * 检查用户是否为管理员
 */
export async function isAdmin(event: any): Promise<boolean> {
  const user = await getCurrentUser(event)
  return user?.role === 'ADMIN' || false
}

/**
 * 检查用户是否有特定角色（简单版本，基于user.role字段）
 */
export async function hasSimpleRole(event: any, role: string): Promise<boolean> {
  const user = await getCurrentUser(event)
  return user?.role === role || false
}

/**
 * 检查用户是否有任一指定角色
 */
export async function hasAnyRole(event: any, roles: string[]): Promise<boolean> {
  const user = await getCurrentUser(event)
  if (!user) return false
  return roles.includes(user.role)
}

/**
 * 获取当前用户ID
 */
export async function getCurrentUserId(event: any): Promise<string | null> {
  const user = await getCurrentUser(event)
  return user?.id || null
}

/**
 * 检查用户是否有指定权限（服务端实现）
 * @param event H3事件对象
 * @param permission 权限代码
 * @returns 是否有权限
 */
export async function hasPermission(event: any, permission: string): Promise<boolean> {
  const user = await getCurrentUser(event)
  if (!user) return false

  try {
    // 直接查询数据库检查权限
    
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })

    // 检查用户是否有指定权限
    for (const userRole of userRoles) {
      // 管理员拥有所有权限
      if (userRole.role.level >= 100) {
        return true
      }

      // 检查具体权限
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.permission.isActive && rolePermission.permission.code === permission) {
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('权限检查失败:', error)
    return false
  }
}

/**
 * 检查用户是否有指定角色（服务端实现）
 * @param event H3事件对象
 * @param role 角色代码
 * @returns 是否有角色
 */
export async function hasRole(event: any, role: string): Promise<boolean> {
  const user = await getCurrentUser(event)
  if (!user) return false

  try {
    // 直接查询数据库检查角色
    
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: true
      }
    })

    // 检查用户是否有指定角色
    return userRoles.some((userRole: any) =>
      userRole.role.code === role
    )
  } catch (error) {
    console.error('角色检查失败:', error)
    return false
  }
}

/**
 * 检查用户是否有任一权限（服务端实现）
 * @param event H3事件对象
 * @param permissions 权限代码数组
 * @returns 是否有任一权限
 */
export async function hasAnyPermission(event: any, permissions: string[]): Promise<boolean> {
  const user = await getCurrentUser(event)
  if (!user || permissions.length === 0) return false

  try {
    // 直接查询数据库检查权限
    
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })

    // 收集用户所有权限
    const userPermissions = new Set<string>()

    for (const userRole of userRoles) {
      // 管理员拥有所有权限
      if (userRole.role.level >= 100) {
        return true
      }

      // 收集具体权限
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.permission.isActive && rolePermission.permission.code) {
          userPermissions.add(rolePermission.permission.code)
        }
      }
    }

    // 检查是否有任一指定权限
    return permissions.some(permission => userPermissions.has(permission))
  } catch (error) {
    console.error('权限检查失败:', error)
    return false
  }
}