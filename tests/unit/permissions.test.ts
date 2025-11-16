import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hasPermission,
  hasRole,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  getUserRoles,
  clearUserPermissionCache
} from '~/composables/usePermissions'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
const mockPrisma = {
  userRole: {
    findMany: vi.fn()
  },
  role: {
    findMany: vi.fn()
  },
  permission: {
    findMany: vi.fn()
  }
} as any

// Mock the Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

describe('权限系统测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearUserPermissionCache()
  })

  describe('hasPermission', () => {
    it('应该返回用户具有的权限', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'ADMIN',
          level: 100,
          permissions: [{
            permission: {
              code: 'user:read',
              isActive: true
            }
          }]
        }
      }])

      mockPrisma.permission.findMany.mockResolvedValue([
        { code: 'user:read', isActive: true },
        { code: 'user:create', isActive: true }
      ])

      const result = await hasPermission(userId, 'user:read')
      expect(result).toBe(true)
    })

    it('应该返回用户不具有的权限', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'USER',
          level: 10,
          permissions: [{
            permission: {
              code: 'room:read',
              isActive: true
            }
          }]
        }
      }])

      const result = await hasPermission(userId, 'user:delete')
      expect(result).toBe(false)
    })

    it('应该处理无效的用户ID', async () => {
      const result = await hasPermission('', 'user:read')
      expect(result).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('应该返回用户具有的角色', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'MANAGER',
          level: 50,
          permissions: []
        }
      }])

      const result = await hasRole(userId, 'MANAGER')
      expect(result).toBe(true)
    })

    it('应该返回用户不具有的角色', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'USER',
          level: 10,
          permissions: []
        }
      }])

      const result = await hasRole(userId, 'ADMIN')
      expect(result).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('应该返回用户具有的任一权限', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'USER',
          level: 10,
          permissions: [{
            permission: {
              code: 'room:read',
              isActive: true
            }
          }]
        }
      }])

      const result = await hasAnyPermission(userId, ['user:delete', 'room:read'])
      expect(result).toBe(true)
    })

    it('应该返回用户没有任何权限', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'USER',
          level: 10,
          permissions: [{
            permission: {
              code: 'room:read',
              isActive: true
            }
          }]
        }
      }])

      const result = await hasAnyPermission(userId, ['user:delete', 'user:create'])
      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('应该返回用户具有的所有权限', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'MANAGER',
          level: 50,
          permissions: [
            {
              permission: {
                code: 'user:read',
                isActive: true
              }
            },
            {
              permission: {
                code: 'room:read',
                isActive: true
              }
            }
          ]
        }
      }])

      const result = await hasAllPermissions(userId, ['user:read', 'room:read'])
      expect(result).toBe(true)
    })

    it('应该返回用户缺少某些权限', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'USER',
          level: 10,
          permissions: [{
            permission: {
              code: 'room:read',
              isActive: true
            }
          }]
        }
      }])

      const result = await hasAllPermissions(userId, ['user:read', 'room:read'])
      expect(result).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    it('应该返回用户的所有权限', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'MANAGER',
          level: 50,
          permissions: [
            {
              permission: {
                id: 'perm1',
                code: 'user:read',
                name: '查看用户',
                resource: 'user',
                action: 'read',
                module: '用户管理',
                isActive: true
              }
            }
          ]
        }
      }])

      const result = await getUserPermissions(userId)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('user:read')
    })

    it('应该返回空数组当用户没有权限时', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([])

      const result = await getUserPermissions(userId)
      expect(result).toHaveLength(0)
    })
  })

  describe('getUserRoles', () => {
    it('应该返回用户的所有角色', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          id: 'role1',
          name: '部门经理',
          code: 'MANAGER',
          level: 50,
          permissions: []
        }
      }])

      const result = await getUserRoles(userId)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('MANAGER')
    })
  })

  describe('权限缓存', () => {
    it('应该缓存权限结果', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'USER',
          level: 10,
          permissions: [{
            permission: {
              code: 'room:read',
              isActive: true
            }
          }]
        }
      }])

      // 第一次调用
      await hasPermission(userId, 'room:read')
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledTimes(1)

      // 第二次调用应该使用缓存
      await hasPermission(userId, 'room:read')
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledTimes(1)
    })

    it('应该能够清除缓存', async () => {
      const userId = 'user1'

      mockPrisma.userRole.findMany.mockResolvedValue([{
        role: {
          code: 'USER',
          level: 10,
          permissions: [{
            permission: {
              code: 'room:read',
              isActive: true
            }
          }]
        }
      }])

      // 第一次调用
      await hasPermission(userId, 'room:read')
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledTimes(1)

      // 清除缓存
      clearUserPermissionCache(userId)

      // 再次调用应该重新查询数据库
      await hasPermission(userId, 'room:read')
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledTimes(2)
    })
  })
})