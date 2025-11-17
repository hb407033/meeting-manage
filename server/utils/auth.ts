import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '~~/server/api/middleware/auth'

/**
 * 从事件中获取当前用户信息
 * 这是一个便捷函数，用于从请求事件中提取用户信息
 */
export async function getCurrentUser(event: any): Promise<AuthenticatedRequest['user'] | null> {
  try {
    const auth = await optionalAuthMiddleware(event)
    return auth.user || null
  } catch (error) {
    // 如果认证失败，返回 null 而不是抛出错误
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
 * 检查用户是否有特定角色
 */
export async function hasRole(event: any, role: string): Promise<boolean> {
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