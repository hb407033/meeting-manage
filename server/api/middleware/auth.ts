import { verifyAccessToken, extractUserFromToken } from '~~/server/utils/jwt'
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '~~/server/utils/response'
import prisma from '~~/server/services/database'

export interface AuthenticatedRequest {
  user?: {
    id: string
    email: string
    role: string        // 主要角色，向后兼容
    roles?: string[]    // 完整角色列表
    permissions?: string[]
  }
  headers: {
    authorization?: string
  }
}

export interface AuthOptions {
  required?: boolean
  roles?: string[]
  permissions?: string[]
  checkLockStatus?: boolean
}

/**
 * 认证中间件
 */
export async function authMiddleware(
  event: any,
  options: AuthOptions = { required: true, checkLockStatus: true }
): Promise<AuthenticatedRequest> {
  const { required = true, roles = [], permissions = [], checkLockStatus = true } = options

  // 获取Authorization头 - 使用现代H3方法
  const authHeader = getHeader(event, 'authorization')
  const result: AuthenticatedRequest = {
    headers: {
      authorization: authHeader
    }
  }

  // 检查Authorization头
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 如果不需要认证，直接返回
    if (!required) {
      return result
    }
    throw unauthorizedResponse('Missing or invalid authorization header')
  }

  // 提取token
  const token = authHeader.substring(7)

  try {
    // 验证token
    const payload = verifyAccessToken(token)

    // 从数据库获取用户信息（确保用户仍然存在且活跃）
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        lockedUntil: true,
        lastLoginAt: true,
        // 获取用户角色信息
        userRoles: {
          include: {
            role: {
              select: {
                name: true,
                code: true,
                level: true
              }
            }
          }
        }
      }
    })

    if (!user || !user.isActive) {
      throw unauthorizedResponse('User not found or inactive')
    }

    // 检查账户锁定状态
    if (checkLockStatus && user.lockedUntil && new Date() < user.lockedUntil) {
      throw forbiddenResponse('Account has been locked due to multiple failed login attempts')
    }

    // 确定用户角色和权限 - 支持多角色
    let userRoles: string[] = []
    let userPermissions: Set<string> = new Set()
    let primaryRole = 'USER' // 主要角色，用于向后兼容

    if (user.userRoles && user.userRoles.length > 0) {
      // 收集所有角色（Role模型没有isActive字段，默认所有角色都是激活的）
      userRoles = user.userRoles.map((ur: any) => ur.role?.code || 'USER')

      // 确定主要角色（按级别排序后的最高级角色，用于向后兼容）
      const sortedRoles = user.userRoles
        .sort((a: any, b: any) => (b.role?.level || 0) - (a.role?.level || 0))

      if (sortedRoles.length > 0) {
        primaryRole = sortedRoles[0].role?.code || 'USER'
      }

      // 聚合所有角色的权限
      const allPermissions: string[] = []

      for (const userRole of user.userRoles) {
        const roleCode = userRole.role?.code
        if (!roleCode) continue

        // 根据每个角色分配权限
        if (roleCode === 'ADMIN') {
          // 管理员拥有所有权限
          const adminPermissions = [
            'user:read', 'user:create', 'user:update', 'user:delete',
            'role:read', 'role:create', 'role:update', 'role:delete', 'role:assign',
            'room:read', 'room:create', 'room:update', 'room:delete', 'room:manage-status',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel', 'reservation:approve', 'reservation:read-others',
            'analytics:read', 'analytics:export',
            'system:read', 'system:update', 'audit:read',
            'device:manage', 'device:read-data'
          ]
          allPermissions.push(...adminPermissions)
        } else if (roleCode === 'MANAGER') {
          // 部门经理拥有部门内权限
          const managerPermissions = [
            'user:read', 'user:create', 'user:update',
            'room:read', 'room:create', 'room:update', 'room:manage-status',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel', 'reservation:approve', 'reservation:read-others',
            'analytics:read', 'analytics:export',
            'device:read-data'
          ]
          allPermissions.push(...managerPermissions)
        } else {
          // 普通用户只有基础权限
          const userPermissions = [
            'room:read',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel'
          ]
          allPermissions.push(...userPermissions)
        }
      }

      // 使用Set去重权限
      userPermissions = new Set(allPermissions)
    }

    // 角色检查 - 检查用户是否有任一要求的角色
    if (roles.length > 0 && !roles.some(role => userRoles.includes(role))) {
      throw forbiddenResponse('Insufficient permissions')
    }

    result.user = {
      id: user.id,
      email: user.email,
      role: primaryRole, // 保持向后兼容
      roles: userRoles,   // 新增：完整角色列表
      permissions: Array.from(userPermissions) // 转换为数组
    }

    return result
  } catch (error: any) {
    if (error.message === 'Token expired') {
      throw unauthorizedResponse('Token expired')
    } else if (error.message === 'Invalid token') {
      throw unauthorizedResponse('Invalid token')
    } else {
      throw error
    }
  }
}

/**
 * 可选认证中间件（不强制要求认证）
 */
export async function optionalAuthMiddleware(event: any): Promise<AuthenticatedRequest> {
  return authMiddleware(event, { required: false })
}

/**
 * 管理员权限中间件
 */
export async function adminAuthMiddleware(event: any): Promise<AuthenticatedRequest> {
  return authMiddleware(event, { roles: ['ADMIN'] })
}

/**
 * 用户权限中间件（管理员和用户）
 */
export async function userAuthMiddleware(event: any): Promise<AuthenticatedRequest> {
  return authMiddleware(event, { roles: ['ADMIN', 'USER'] })
}

/**
 * 资源所有者检查中间件
 */
export async function resourceOwnerMiddleware(
  event: any,
  resourceUserId: string
): Promise<AuthenticatedRequest> {
  const auth = await userAuthMiddleware(event)

  if (!auth.user) {
    throw unauthorizedResponse('Authentication required')
  }

  // 管理员可以访问所有资源
  if (auth.user.role === 'ADMIN') {
    return auth
  }

  // 检查是否为资源所有者
  if (auth.user.id !== resourceUserId) {
    throw forbiddenResponse('Access denied: not the resource owner')
  }

  return auth
}

/**
 * 权限检查工具函数
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * 管理员权限检查
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'ADMIN'
}

/**
 * 用户权限检查
 */
export function isUser(userRole: string): boolean {
  return userRole === 'USER'
}

/**
 * 检查用户是否有权限访问特定资源
 */
export async function canAccessResource(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string = 'read'
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        include: {
          role: {
            select: { code: true, level: true }
          }
        }
      }
    }
  })

  if (!user || !user.userRoles || user.userRoles.length === 0) return false

  // 检查是否有管理员角色 - 如果有管理员角色，拥有所有权限
  const hasAdminRole = user.userRoles.some((ur: any) => ur.role?.code === 'ADMIN')
  if (hasAdminRole) return true

  
  // 根据资源类型和操作检查权限
  switch (resourceType) {
    case 'reservation':
      return await canAccessReservation(userId, resourceId, action)
    case 'room':
      return await canAccessRoom(userId, resourceId, action)
    case 'user':
      return userId === resourceId && ['read', 'update'].includes(action)
    default:
      return false
  }
}

/**
 * 检查预约访问权限
 */
async function canAccessReservation(
  userId: string,
  reservationId: string,
  action: string
): Promise<boolean> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { organizerId: true }
  })

  if (!reservation) return false

  // 用户只能访问自己的预约
  return reservation.organizerId === userId
}

/**
 * 检查会议室访问权限
 */
async function canAccessRoom(
  userId: string,
  roomId: string,
  action: string
): Promise<boolean> {
  // 所有用户都可以查看和预约会议室
  if (['read', 'create'].includes(action)) return true

  // 只有管理员可以修改或删除会议室
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        include: {
          role: {
            select: { code: true, level: true }
          }
        }
      }
    }
  })

  if (!user || !user.userRoles || user.userRoles.length === 0) return false

  // 检查是否有管理员角色
  const hasAdminRole = user.userRoles.some((ur: any) => ur.role?.code === 'ADMIN')

  return hasAdminRole && ['update', 'delete'].includes(action)
}

/**
 * 生成权限上下文
 */
export function createPermissionContext(user: any) {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    permissions: {
      isAdmin: user.role === 'ADMIN',
      isUser: user.role === 'USER',
      canManageUsers: user.role === 'ADMIN',
      canManageRooms: user.role === 'ADMIN',
      canManageSystem: user.role === 'ADMIN',
      canCreateReservations: ['ADMIN', 'USER'].includes(user.role),
      canManageOwnReservations: ['ADMIN', 'USER'].includes(user.role)
    }
  }
}