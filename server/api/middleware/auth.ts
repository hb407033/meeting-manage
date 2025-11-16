import { verifyAccessToken, extractUserFromToken } from '~~/server/utils/jwt'
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '~~/server/utils/response'
import { DatabaseService } from '~~/server/services/database'

export interface AuthenticatedRequest {
  user?: {
    id: number
    email: string
    role: string
  }
  headers: {
    authorization?: string
  }
}

export interface AuthOptions {
  required?: boolean
  roles?: string[]
  permissions?: string[]
}

/**
 * 认证中间件
 */
export async function authMiddleware(
  event: any,
  options: AuthOptions = { required: true }
): Promise<AuthenticatedRequest> {
  const { required = true, roles = [], permissions = [] } = options

  // 获取Authorization头
  const authHeader = event.node.req.headers.authorization
  const result: AuthenticatedRequest = {
    headers: {
      authorization: authHeader
    }
  }

  // 如果不需要认证，直接返回
  if (!required) {
    return result
  }

  // 检查Authorization头
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw unauthorizedResponse('Missing or invalid authorization header')
  }

  // 提取token
  const token = authHeader.substring(7)

  try {
    // 验证token
    const payload = verifyAccessToken(token)

    // 从数据库获取用户信息（确保用户仍然存在且活跃）
    const db = new DatabaseService()
    const user = await db.getClient().user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    })

    if (!user || !user.isActive) {
      throw unauthorizedResponse('User not found or inactive')
    }

    // 角色检查
    if (roles.length > 0 && !roles.includes(user.role)) {
      throw forbiddenResponse('Insufficient permissions')
    }

    result.user = {
      id: user.id,
      email: user.email,
      role: user.role
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
  resourceUserId: number
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
  userId: number,
  resourceType: string,
  resourceId: number,
  action: string = 'read'
): Promise<boolean> {
  const db = new DatabaseService()
  const user = await db.getClient().user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user) return false

  // 管理员有所有权限
  if (user.role === 'ADMIN') return true

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
  userId: number,
  reservationId: number,
  action: string
): Promise<boolean> {
  const db = new DatabaseService()
  const reservation = await db.getClient().reservation.findUnique({
    where: { id: reservationId },
    select: { userId: true }
  })

  if (!reservation) return false

  // 用户只能访问自己的预约
  return reservation.userId === userId
}

/**
 * 检查会议室访问权限
 */
async function canAccessRoom(
  userId: number,
  roomId: number,
  action: string
): Promise<boolean> {
  // 所有用户都可以查看和预约会议室
  if (['read', 'create'].includes(action)) return true

  // 只有管理员可以修改或删除会议室
  const db = new DatabaseService()
  const user = await db.getClient().user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  return user?.role === 'ADMIN' && ['update', 'delete'].includes(action)
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