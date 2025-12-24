/**
 * 权限菜单状态管理
 * 提供菜单缓存、权限过滤和性能优化功能
 */

import { defineStore } from 'pinia'
import type { MenuItem, MenuSection } from '~/config/menu-config'
import {
  mainMenuConfig,
  userMenuConfig,
  filterMenuByPermission,
  filterMenuSections
} from '../config/menu-config'

export interface MenuCache {
  filteredMainMenu: MenuSection[]
  filteredUserMenu: MenuItem[]
  lastUpdated: number
  userPermissions: string[]
  userRole: string
}

export const useMenuStore = defineStore('menu', {
  state: (): MenuCache & {
    loading: boolean
    error: string | null
    cacheTTL: number  // 缓存生存时间(毫秒)
  } => ({
    filteredMainMenu: [],
    filteredUserMenu: [],
    lastUpdated: 0,
    userPermissions: [],
    userRole: '',
    loading: false,
    error: null,
    cacheTTL: 30 * 60 * 1000  // 30分钟TTL
  }),

  getters: {
    /**
     * 检查缓存是否已过期
     */
    isCacheExpired(): boolean {
      const now = Date.now()
      return (now - this.lastUpdated) > this.cacheTTL
    },

    /**
     * 检查是否需要刷新缓存
     */
    needsRefresh(): boolean {
      return this.filteredMainMenu.length === 0 || this.isCacheExpired
    },

    /**
     * 获取缓存的权限菜单
     */
    getCachedMainMenu(): MenuSection[] {
      return this.filteredMainMenu
    },

    /**
     * 获取缓存的用户菜单
     */
    getCachedUserMenu(): MenuItem[] {
      return this.filteredUserMenu
    }
  },

  actions: {
    /**
     * 根据用户权限过滤菜单并缓存结果
     * @param userPermissions 用户权限列表
     * @param userRole 用户角色
     * @param canAccess 权限检查函数
     */
    async refreshMenuCache(
      userPermissions: string[],
      userRole: string,
      canAccess: (resource: string, action?: string) => boolean
    ): Promise<void> {
      try {
        this.loading = true
        this.error = null

        // 检查权限是否发生变化
        const permissionsChanged =
          JSON.stringify(this.userPermissions) !== JSON.stringify(userPermissions) ||
          this.userRole !== userRole

        // 如果权限没有变化且缓存未过期，则不重新计算
        if (!permissionsChanged && !this.isCacheExpired) {
          return
        }

        // 模拟异步处理(如果需要从API获取菜单配置)
        await new Promise(resolve => setTimeout(resolve, 0))

        // 根据权限过滤菜单
        this.filteredMainMenu = filterMenuSections(mainMenuConfig, canAccess)
        this.filteredUserMenu = filterMenuByPermission(userMenuConfig, canAccess)

        // 更新缓存信息
        this.userPermissions = [...userPermissions]
        this.userRole = userRole
        this.lastUpdated = Date.now()

        console.log('🗂️ Menu cache refreshed:', {
          mainSections: this.filteredMainMenu.length,
          userItems: this.filteredUserMenu.length,
          permissions: userPermissions.length,
          role: userRole
        })

      } catch (error) {
        console.error('Failed to refresh menu cache:', error)
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.loading = false
      }
    },

    /**
     * 强制清除缓存
     */
    clearCache(): void {
      this.filteredMainMenu = []
      this.filteredUserMenu = []
      this.userPermissions = []
      this.userRole = ''
      this.lastUpdated = 0
      this.error = null

      console.log('🗂️ Menu cache cleared')
    },

    /**
     * 设置缓存TTL
     * @param ttl 缓存生存时间(毫秒)
     */
    setCacheTTL(ttl: number): void {
      this.cacheTTL = ttl
      console.log('🗂️ Menu cache TTL set to', ttl, 'ms')
    },

    /**
     * 权限变更时自动刷新缓存
     * @param userPermissions 新的用户权限
     * @param userRole 新的用户角色
     * @param canAccess 权限检查函数
     */
    async onPermissionsChanged(
      userPermissions: string[],
      userRole: string,
      canAccess: (resource: string, action?: string) => boolean
    ): Promise<void> {
      console.log('🔐 Permissions changed, refreshing menu cache')
      await this.refreshMenuCache(userPermissions, userRole, canAccess)
    },

    /**
     * 预加载菜单缓存(可选)
     * @param canAccess 权限检查函数
     */
    async preloadMenu(
      canAccess: (resource: string, action?: string) => boolean
    ): Promise<void> {
      if (this.needsRefresh && !this.loading) {
        // 这里可以从用户store获取权限信息
        // 为了简化，我们只清除缓存，让下次访问时重新加载
        this.clearCache()
      }
    }
  }
})