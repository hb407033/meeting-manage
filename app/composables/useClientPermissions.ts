import { hasPermission, hasRole } from './usePermissions'

export const useClientPermissions = () => {
  const { user } = useAuth()

  /**
   * 检查当前用户是否有指定权限
   * @param permission 权限代码
   * @returns 是否有权限
   */
  const hasPermission = async (permission: string): Promise<boolean> => {
    if (!user.value?.id) return false
    return await hasPermission(user.value.id, permission)
  }

  /**
   * 检查当前用户是否有指定角色
   * @param role 角色代码
   * @returns 是否有角色
   */
  const hasRole = async (role: string): Promise<boolean> => {
    if (!user.value?.id) return false
    return await hasRole(user.value.id, role)
  }

  /**
   * 检查资源访问权限
   * @param resource 资源类型
   * @param action 操作类型
   * @returns 是否有访问权限
   */
  const canAccess = async (resource: string, action?: string): Promise<boolean> => {
    if (!user.value?.id) return false

    // 构建权限代码
    const permissionCode = action ? `${resource}:${action}` : `${resource}:read`
    return await hasPermission(user.value.id, permissionCode)
  }

  return {
    hasPermission,
    hasRole,
    canAccess
  }
}