import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMenuStore } from '../../app/stores/menu'

describe('Menu Store', () => {
  let menuStore: ReturnType<typeof useMenuStore>

  const mockCanAccess = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    menuStore = useMenuStore()
    vi.clearAllMocks()
  })

  describe('Cache Management', () => {
    it('should initialize with empty state', () => {
      expect(menuStore.filteredMainMenu).toEqual([])
      expect(menuStore.filteredUserMenu).toEqual([])
      expect(menuStore.lastUpdated).toBe(0)
      expect(menuStore.userPermissions).toEqual([])
      expect(menuStore.userRole).toBe('')
      expect(menuStore.loading).toBe(false)
      expect(menuStore.error).toBe(null)
    })

    it('should detect when cache is expired', () => {
      // Set lastUpdated to past time
      menuStore.lastUpdated = Date.now() - (35 * 60 * 1000) // 35 minutes ago
      expect(menuStore.isCacheExpired).toBe(true)
    })

    it('should detect when cache is fresh', () => {
      // Set lastUpdated to recent time
      menuStore.lastUpdated = Date.now() - (10 * 60 * 1000) // 10 minutes ago
      expect(menuStore.isCacheExpired).toBe(false)
    })

    it('should detect when refresh is needed', () => {
      // Empty menu should need refresh
      expect(menuStore.needsRefresh).toBe(true)

      // Add some menu data
      menuStore.filteredMainMenu = [{ key: 'test', label: 'Test', items: [] }]
      menuStore.lastUpdated = Date.now()
      expect(menuStore.needsRefresh).toBe(false)
    })

    it('should clear cache properly', () => {
      // Set some state
      menuStore.filteredMainMenu = [{ key: 'test', label: 'Test', items: [] }]
      menuStore.filteredUserMenu = [{ key: 'profile', label: 'Profile' }]
      menuStore.userPermissions = ['test:read']
      menuStore.userRole = 'USER'
      menuStore.lastUpdated = Date.now()

      menuStore.clearCache()

      // Check state is reset
      expect(menuStore.filteredMainMenu).toEqual([])
      expect(menuStore.filteredUserMenu).toEqual([])
      expect(menuStore.userPermissions).toEqual([])
      expect(menuStore.userRole).toBe('')
      expect(menuStore.lastUpdated).toBe(0)
    })
  })

  describe('refreshMenuCache', () => {
    it('should refresh menu cache with user permissions', async () => {
      const userPermissions = ['reservation:read', 'room:read']
      const userRole = 'USER'

      // Mock canAccess to return true for read permissions
      mockCanAccess.mockImplementation((resource, action) => {
        return action === 'read'
      })

      await menuStore.refreshMenuCache(userPermissions, userRole, mockCanAccess)

      expect(menuStore.loading).toBe(false)
      expect(menuStore.error).toBe(null)
      expect(menuStore.userPermissions).toEqual(userPermissions)
      expect(menuStore.userRole).toBe(userRole)
      expect(menuStore.lastUpdated).toBeGreaterThan(0)
      expect(menuStore.filteredMainMenu.length).toBeGreaterThan(0)
    })

    it('should not refresh if permissions have not changed and cache is fresh', async () => {
      const userPermissions = ['reservation:read']
      const userRole = 'USER'

      mockCanAccess.mockReturnValue(true)

      // First refresh
      await menuStore.refreshMenuCache(userPermissions, userRole, mockCanAccess)
      const firstUpdated = menuStore.lastUpdated

      // Second refresh with same permissions
      await menuStore.refreshMenuCache(userPermissions, userRole, mockCanAccess)

      // Should not have updated again
      expect(menuStore.lastUpdated).toBe(firstUpdated)
    })

    it('should handle errors gracefully', async () => {
      const userPermissions = ['invalid:permission']
      const userRole = 'USER'

      mockCanAccess.mockImplementation(() => {
        throw new Error('Permission check failed')
      })

      await menuStore.refreshMenuCache(userPermissions, userRole, mockCanAccess)

      expect(menuStore.loading).toBe(false)
      expect(menuStore.error).toBe('Permission check failed')
    })

    it('should set loading state during refresh', async () => {
      const userPermissions = ['reservation:read']
      const userRole = 'USER'

      mockCanAccess.mockReturnValue(true)

      // Create a promise that resolves after a delay
      let resolvePromise: () => void
      const delayPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      // Mock filter functions to use our delay
      vi.doMock('~/config/menu-config', () => ({
        filterMenuSections: vi.fn().mockImplementation(() => delayPromise),
        filterMenuByPermission: vi.fn().mockImplementation(() => delayPromise)
      }))

      const refreshPromise = menuStore.refreshMenuCache(userPermissions, userRole, mockCanAccess)

      // Should be loading
      expect(menuStore.loading).toBe(true)

      // Resolve the promise
      resolvePromise!()
      await refreshPromise

      // Should not be loading anymore
      expect(menuStore.loading).toBe(false)
    })
  })

  describe('onPermissionsChanged', () => {
    it('should refresh cache when permissions change', async () => {
      const oldPermissions = ['reservation:read']
      const newPermissions = ['reservation:read', 'room:manage']
      const userRole = 'USER'

      mockCanAccess.mockReturnValue(true)

      // Initialize with old permissions
      await menuStore.refreshMenuCache(oldPermissions, userRole, mockCanAccess)
      const firstUpdated = menuStore.lastUpdated

      // Change permissions
      await menuStore.onPermissionsChanged(newPermissions, userRole, mockCanAccess)

      // Should have updated
      expect(menuStore.lastUpdated).toBeGreaterThan(firstUpdated)
      expect(menuStore.userPermissions).toEqual(newPermissions)
    })
  })

  describe('Cache TTL Management', () => {
    it('should allow setting custom cache TTL', () => {
      const customTTL = 60 * 60 * 1000 // 1 hour

      menuStore.setCacheTTL(customTTL)

      expect(menuStore.cacheTTL).toBe(customTTL)
    })

    it('should respect custom TTL when checking expiry', () => {
      const customTTL = 5 * 60 * 1000 // 5 minutes
      menuStore.setCacheTTL(customTTL)

      // Set lastUpdated to 6 minutes ago
      menuStore.lastUpdated = Date.now() - (6 * 60 * 1000)

      expect(menuStore.isCacheExpired).toBe(true)
    })
  })

  describe('Getters', () => {
    it('should return cached menus through getters', () => {
      const mockMainMenu = [{ key: 'test', label: 'Test', items: [] }]
      const mockUserMenu = [{ key: 'profile', label: 'Profile' }]

      menuStore.filteredMainMenu = mockMainMenu
      menuStore.filteredUserMenu = mockUserMenu

      expect(menuStore.getCachedMainMenu).toEqual(mockMainMenu)
      expect(menuStore.getCachedUserMenu).toEqual(mockUserMenu)
    })
  })
})