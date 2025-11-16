import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

export interface UserPermission {
  id: string
  code: string
  name: string
  resource: string | null
  action: string | null
  module: string | null
}

export interface UserRole {
  id: string
  name: string
  code: string
  level: number
  permissions: UserPermission[]
}

// 权限缓存管理
class PermissionCache {
  private cache = new Map<string, { permissions: Set<string>, roles: Set<string>, timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

  async getUserPermissions(userId: string): Promise<{ permissions: Set<string>, roles: Set<string> }> {
    const cached = this.cache.get(userId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { permissions: cached.permissions, roles: cached.roles }
    }

    // 从数据库获取用户权限
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
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

    const permissions = new Set<string>()
    const roles = new Set<string>()

    for (const userRole of userRoles) {
      roles.add(userRole.role.code)

      // 添加角色级别的权限（如果角色层级更高，继承所有权限）
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.permission.isActive) {
          permissions.add(rolePermission.permission.code!)
        }
      }

      // 如果是管理员，添加所有权限
      if (userRole.role.level >= 100) {
        const allPermissions = await prisma.permission.findMany({
          where: { isActive: true }
        })
        allPermissions.forEach(p => {
          if (p.code) permissions.add(p.code)
        })
      }
    }

    const result = { permissions, roles }
    this.cache.set(userId, { ...result, timestamp: Date.now() })

    return result
  }

  invalidateUser(userId: string): void {
    this.cache.delete(userId)
  }

  clearCache(): void {
    this.cache.clear()
  }
}

const permissionCache = new PermissionCache()

/**
 * 检查用户是否有指定权限
 * @param userId 用户ID
 * @param permission 权限代码
 * @returns 是否有权限
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  if (!userId) return false

  try {
    const { permissions } = await permissionCache.getUserPermissions(userId)
    return permissions.has(permission)
  } catch (error) {
    console.error('权限检查失败:', error)
    return false
  }
}

/**
 * 检查用户是否有指定角色
 * @param userId 用户ID
 * @param role 角色代码
 * @returns 是否有角色
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  if (!userId) return false

  try {
    const { roles } = await permissionCache.getUserPermissions(userId)
    return roles.has(role)
  } catch (error) {
    console.error('角色检查失败:', error)
    return false
  }
}

/**
 * 检查用户是否有任一权限
 * @param userId 用户ID
 * @param permissions 权限代码数组
 * @returns 是否有任一权限
 */
export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  if (!userId || permissions.length === 0) return false

  try {
    const userPermissions = await permissionCache.getUserPermissions(userId)
    return permissions.some(permission => userPermissions.permissions.has(permission))
  } catch (error) {
    console.error('权限检查失败:', error)
    return false
  }
}

/**
 * 检查用户是否有所有权限
 * @param userId 用户ID
 * @param permissions 权限代码数组
 * @returns 是否有所有权限
 */
export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  if (!userId || permissions.length === 0) return false

  try {
    const userPermissions = await permissionCache.getUserPermissions(userId)
    return permissions.every(permission => userPermissions.permissions.has(permission))
  } catch (error) {
    console.error('权限检查失败:', error)
    return false
  }
}

/**
 * 获取用户所有权限
 * @param userId 用户ID
 * @returns 权限列表
 */
export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  if (!userId) return []

  try {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
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

    const permissionMap = new Map<string, UserPermission>()

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        const permission = rolePermission.permission
        if (permission.isActive && permission.code) {
          permissionMap.set(permission.code, {
            id: permission.id,
            code: permission.code,
            name: permission.name,
            resource: permission.resource,
            action: permission.action,
            module: permission.module
          })
        }
      }
    }

    return Array.from(permissionMap.values())
  } catch (error) {
    console.error('获取用户权限失败:', error)
    return []
  }
}

/**
 * 获取用户所有角色
 * @param userId 用户ID
 * @returns 角色列表
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  if (!userId) return []

  try {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
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

    return userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      code: ur.role.code!,
      level: ur.role.level,
      permissions: ur.role.permissions
        .filter(rp => rp.permission.isActive)
        .map(rp => ({
          id: rp.permission.id,
          code: rp.permission.code!,
          name: rp.permission.name,
          resource: rp.permission.resource,
          action: rp.permission.action,
          module: rp.permission.module
        }))
    }))
  } catch (error) {
    console.error('获取用户角色失败:', error)
    return []
  }
}

/**
 * 清除用户权限缓存
 * @param userId 用户ID
 */
export function clearUserPermissionCache(userId?: string): void {
  if (userId) {
    permissionCache.invalidateUser(userId)
  } else {
    permissionCache.clearCache()
  }
}

/**
 * 检查资源访问权限（基于数据隔离）
 * @param userId 用户ID
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 * @returns 是否有访问权限
 */
export async function canAccessResource(
  userId: string,
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  // 管理员可以访问所有资源
  if (await hasRole(userId, 'ADMIN')) {
    return true
  }

  // 部门经理可以访问部门内资源
  if (await hasRole(userId, 'MANAGER')) {
    // 这里需要根据具体业务逻辑实现
    // 比如检查资源是否属于用户所在部门
    return true
  }

  // 普通用户只能访问自己的资源
  if (await hasRole(userId, 'USER')) {
    if (resourceId) {
      // 检查资源是否属于当前用户
      return true // 这里需要根据具体业务逻辑实现
    }
  }

  return false
}