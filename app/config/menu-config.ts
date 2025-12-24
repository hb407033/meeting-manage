/**
 * 权限菜单配置
 * 基于RBAC的动态菜单配置，支持细粒度权限控制
 */

export interface MenuItem {
  key: string
  label: string
  icon?: string
  permissions?: string[]  // 所需权限列表，空数组表示所有已认证用户可访问
  children?: MenuItem[]
  route?: string
  badge?: string
}

export interface MenuSection {
  key: string
  label: string
  items: MenuItem[]
}

/**
 * 主菜单配置
 * 权限说明：
 * - 空permissions数组: 所有已认证用户可访问
 * - 具体权限: 用户必须拥有该权限才可访问
 * - 多个权限: 用户拥有任一权限即可访问(OR逻辑)
 */
export const mainMenuConfig: MenuSection[] = [
  {
    key: 'dashboard',
    label: '主导航',
    items: [
      {
        key: 'home',
        label: '首页',
        icon: 'i-heroicons-home',
        permissions: [],  // 所有已认证用户
        route: '/dashboard'
      }
    ]
  },
  {
    key: 'reservations',
    label: '预约管理',
    items: [
      {
        key: 'quick-reservation',
        label: '快速预约',
        icon: 'i-heroicons-calendar-days',
        permissions: ['reservation:create'],
        route: '/reservations/create'
      },
      {
        key: 'reservation-list',
        label: '预约列表',
        icon: 'i-heroicons-list-bullet',
        permissions: ['reservation:read'],
        route: '/reservations'
      },
      {
        key: 'detailed-reservation',
        label: '详细预约配置',
        icon: 'i-heroicons-cog-6-tooth',
        permissions: ['reservation:create', 'reservation:edit'],
        route: '/reservations/detailed'
      },
      {
        key: 'my-reservations',
        label: '我的预约',
        icon: 'i-heroicons-user',
        permissions: ['reservation:readOwn'],
        route: '/reservations/my'
      },
      {
        key: 'reservation-calendar',
        label: '预约日历',
        icon: 'i-heroicons-calendar',
        permissions: ['reservation:read'],
        route: '/reservations/calendar'
      }
    ]
  },
  {
    key: 'rooms',
    label: '会议室管理',
    items: [
      {
        key: 'room-availability',
        label: '会议室可用时间',
        icon: 'i-heroicons-clock',
        permissions: ['room:read'],
        route: '/availability'
      },
      {
        key: 'room-management',
        label: '会议室管理',
        icon: 'i-heroicons-building-office-2',
        permissions: ['room:manage'],
        route: '/admin/rooms'
      },
      {
        key: 'room-search',
        label: '会议室搜索',
        icon: 'i-heroicons-magnifying-glass',
        permissions: ['room:read'],
        route: '/rooms/search'
      }
    ]
  },
  {
    key: 'analytics',
    label: '数据分析',
    items: [
      {
        key: 'dashboard-analytics',
        label: '预约仪表盘',
        icon: 'i-heroicons-chart-bar',
        permissions: ['analytics:view'],
        route: '/analytics'
      },
      {
        key: 'usage-analytics',
        label: '使用情况分析',
        icon: 'i-heroicons-presentation-chart-bar',
        permissions: ['analytics:advanced'],
        route: '/analytics/usage'
      }
    ]
  },
  {
    key: 'system',
    label: '系统管理',
    items: [
      {
        key: 'user-management',
        label: '用户管理',
        icon: 'i-heroicons-users',
        permissions: ['user:manage'],
        route: '/admin/users'
      },
      {
        key: 'permission-management',
        label: '权限管理',
        icon: 'i-heroicons-shield-check',
        permissions: ['permission:manage'],
        route: '/admin/permissions'
      },
      {
        key: 'system-settings',
        label: '系统配置',
        icon: 'i-heroicons-cog-6-tooth',
        permissions: ['system:configure'],
        route: '/admin/settings'
      },
      {
        key: 'audit-log',
        label: '审计日志',
        icon: 'i-heroicons-document-text',
        permissions: ['audit:read'],
        route: '/admin/audit'
      },
      {
        key: 'audit-test',
        label: '审计测试',
        icon: 'i-heroicons-beaker',
        permissions: ['audit:test'],
        route: '/admin/audit-test',
        badge: 'TEST'
      }
    ]
  }
]

/**
 * 用户菜单配置
 */
export const userMenuConfig: MenuItem[] = [
  {
    key: 'profile',
    label: '个人资料',
    icon: 'i-heroicons-user',
    permissions: [],
    route: '/profile'
  },
  {
    key: 'settings',
    label: '设置',
    icon: 'i-heroicons-cog-6-tooth',
    permissions: [],
    route: '/settings'
  }
]

/**
 * 检查用户是否有权限访问菜单项
 * @param menuItem 菜单项配置
 * @param canAccess 权限检查函数
 * @returns 是否有权限访问
 */
export function hasMenuPermission(
  menuItem: MenuItem,
  canAccess: (resource: string, action?: string) => boolean
): boolean {
  // 如果没有指定权限要求，所有已认证用户都可以访问
  if (!menuItem.permissions || menuItem.permissions.length === 0) {
    return true
  }

  // 检查是否有任一所需权限(OR逻辑)
  return menuItem.permissions.some(permission => {
    const [resource, action] = permission.split(':')
    return canAccess(resource, action)
  })
}

/**
 * 过滤用户有权限访问的菜单项
 * @param menuItems 菜单项列表
 * @param canAccess 权限检查函数
 * @returns 过滤后的菜单项列表
 */
export function filterMenuByPermission(
  menuItems: MenuItem[],
  canAccess: (resource: string, action?: string) => boolean
): MenuItem[] {
  return menuItems
    .filter(item => hasMenuPermission(item, canAccess))
    .map(item => ({
      ...item,
      // 递归过滤子菜单
      children: item.children
        ? filterMenuByPermission(item.children, canAccess)
        : undefined
    }))
    .filter(item =>
      // 保留有权限的项目，或者有权限子菜单的项目
      hasMenuPermission(item, canAccess) ||
      (item.children && item.children.length > 0)
    )
}

/**
 * 过滤菜单段配置
 * @param sections 菜单段配置
 * @param canAccess 权限检查函数
 * @returns 过滤后的菜单段配置，移除空菜单段
 */
export function filterMenuSections(
  sections: MenuSection[],
  canAccess: (resource: string, action?: string) => boolean
): MenuSection[] {
  return sections
    .map(section => ({
      ...section,
      items: filterMenuByPermission(section.items, canAccess)
    }))
    .filter(section => section.items.length > 0)  // 移除空的菜单段
}