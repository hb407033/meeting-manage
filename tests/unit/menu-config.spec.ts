import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  mainMenuConfig,
  userMenuConfig,
  hasMenuPermission,
  filterMenuByPermission,
  filterMenuSections
} from '../../app/config/menu-config'

describe('Menu Configuration', () => {
  // Mock canAccess function
  const mockCanAccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasMenuPermission', () => {
    it('should return true for menu items without permissions', () => {
      const menuItem = {
        key: 'home',
        label: '首页',
        permissions: []
      }

      expect(hasMenuPermission(menuItem, mockCanAccess)).toBe(true)
      expect(mockCanAccess).not.toHaveBeenCalled()
    })

    it('should return true if user has required permission', () => {
      const menuItem = {
        key: 'rooms',
        label: '会议室管理',
        permissions: ['room:read']
      }

      mockCanAccess.mockReturnValue(true)

      expect(hasMenuPermission(menuItem, mockCanAccess)).toBe(true)
      expect(mockCanAccess).toHaveBeenCalledWith('room', 'read')
    })

    it('should return false if user does not have required permission', () => {
      const menuItem = {
        key: 'rooms',
        label: '会议室管理',
        permissions: ['room:manage']
      }

      mockCanAccess.mockReturnValue(false)

      expect(hasMenuPermission(menuItem, mockCanAccess)).toBe(false)
      expect(mockCanAccess).toHaveBeenCalledWith('room', 'manage')
    })

    it('should return true if user has any of multiple permissions (OR logic)', () => {
      const menuItem = {
        key: 'detailed-reservation',
        label: '详细预约配置',
        permissions: ['reservation:create', 'reservation:edit']
      }

      // User has create permission but not edit permission
      mockCanAccess.mockImplementation((resource, action) => {
        if (resource === 'reservation' && action === 'create') return true
        if (resource === 'reservation' && action === 'edit') return false
        return false
      })

      expect(hasMenuPermission(menuItem, mockCanAccess)).toBe(true)
    })

    it('should return false if user has none of multiple permissions', () => {
      const menuItem = {
        key: 'system-settings',
        label: '系统配置',
        permissions: ['system:configure']
      }

      mockCanAccess.mockReturnValue(false)

      expect(hasMenuPermission(menuItem, mockCanAccess)).toBe(false)
    })
  })

  describe('filterMenuByPermission', () => {
    it('should filter menu items based on permissions', () => {
      const menuItems: any[] = [
        {
          key: 'home',
          label: '首页',
          permissions: []
        },
        {
          key: 'rooms',
          label: '会议室管理',
          permissions: ['room:read']
        },
        {
          key: 'system',
          label: '系统管理',
          permissions: ['system:configure']
        }
      ]

      // User can access home and rooms, but not system
      mockCanAccess.mockImplementation((resource, action) => {
        if (resource === 'room' && action === 'read') return true
        if (resource === 'system' && action === 'configure') return false
        return false
      })

      const filtered = filterMenuByPermission(menuItems, mockCanAccess)

      expect(filtered).toHaveLength(2)
      expect(filtered.map(item => item.key)).toEqual(['home', 'rooms'])
    })

    it('should handle nested menu items', () => {
      const menuItems: any[] = [
        {
          key: 'reservations',
          label: '预约管理',
          permissions: [],
          children: [
            {
              key: 'create',
              label: '创建预约',
              permissions: ['reservation:create']
            },
            {
              key: 'list',
              label: '预约列表',
              permissions: ['reservation:read']
            }
          ]
        }
      ]

      // User can only read reservations
      mockCanAccess.mockImplementation((resource, action) => {
        if (resource === 'reservation' && action === 'create') return false
        if (resource === 'reservation' && action === 'read') return true
        return false
      })

      const filtered = filterMenuByPermission(menuItems, mockCanAccess)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].children).toHaveLength(1)
      expect(filtered[0].children![0].key).toBe('list')
    })

    it('should remove items with no accessible children', () => {
      const menuItems: any[] = [
        {
          key: 'reservations',
          label: '预约管理',
          permissions: ['reservation:manage'], // User doesn't have this
          children: [
            {
              key: 'create',
              label: '创建预约',
              permissions: ['reservation:create'] // User doesn't have this
            }
          ]
        }
      ]

      mockCanAccess.mockReturnValue(false)

      const filtered = filterMenuByPermission(menuItems, mockCanAccess)

      expect(filtered).toHaveLength(0)
    })
  })

  describe('filterMenuSections', () => {
    it('should filter menu sections and remove empty sections', () => {
      const sections: any[] = [
        {
          key: 'dashboard',
          label: '主导航',
          items: [
            {
              key: 'home',
              label: '首页',
              permissions: []
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
              permissions: ['user:manage']
            }
          ]
        }
      ]

      // User can access dashboard but not system
      mockCanAccess.mockImplementation((resource, action) => {
        if (resource === 'user' && action === 'manage') return false
        return true
      })

      const filtered = filterMenuSections(sections, mockCanAccess)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].key).toBe('dashboard')
    })
  })

  describe('Main Menu Configuration', () => {
    it('should have valid structure', () => {
      expect(mainMenuConfig).toBeInstanceOf(Array)
      expect(mainMenuConfig.length).toBeGreaterThan(0)

      mainMenuConfig.forEach(section => {
        expect(section).toHaveProperty('key')
        expect(section).toHaveProperty('label')
        expect(section).toHaveProperty('items')
        expect(section.items).toBeInstanceOf(Array)
      })
    })

    it('should contain required menu sections', () => {
      const sectionKeys = mainMenuConfig.map(section => section.key)

      expect(sectionKeys).toContain('dashboard')
      expect(sectionKeys).toContain('reservations')
      expect(sectionKeys).toContain('rooms')
      expect(sectionKeys).toContain('system')
    })
  })

  describe('User Menu Configuration', () => {
    it('should have valid structure', () => {
      expect(userMenuConfig).toBeInstanceOf(Array)
      expect(userMenuConfig.length).toBeGreaterThan(0)

      userMenuConfig.forEach(item => {
        expect(item).toHaveProperty('key')
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('route')
      })
    })

    it('should contain profile and settings items', () => {
      const itemKeys = userMenuConfig.map(item => item.key)

      expect(itemKeys).toContain('profile')
      expect(itemKeys).toContain('settings')
    })
  })
})