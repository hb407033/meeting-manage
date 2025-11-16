import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getOrganizationTree,
  getUserOrganizationPath,
  canUserAccessOrganization,
  getOrganizationPath,
  filterByUserOrganization
} from '~/server/services/organization-service'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
const mockPrisma = {
  organization: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn()
  },
  user: {
    findUnique: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn()
  },
  userRole: {
    findFirst: vi.fn()
  }
} as any

// Mock the Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

describe('组织架构数据隔离测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrganizationTree', () => {
    it('应该返回组织架构树', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: 'org1',
          name: '总公司',
          code: 'ROOT',
          level: 0,
          path: '/ROOT',
          parentId: null,
          isActive: true
        }
      ])

      mockPrisma.user.count.mockResolvedValue(5)

      const result = await getOrganizationTree()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('总公司')
      expect(result[0].userCount).toBe(5)
    })

    it('应该支持过滤非活跃组织', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([])

      const result = await getOrganizationTree(null, { includeInactive: false })

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          parentId: null,
          isActive: true
        },
        orderBy: [
          { level: 'asc' },
          { name: 'asc' }
        ]
      })
    })
  })

  describe('getUserOrganizationPath', () => {
    it('应该返回用户的组织路径', async () => {
      const userId = 'user1'

      mockPrisma.user.findUnique.mockResolvedValue({
        organizationId: 'org1',
        organization: {
          id: 'org1',
          name: '总公司',
          code: 'ROOT',
          level: 0,
          path: '/ROOT',
          parentId: null,
          isActive: true
        }
      })

      const result = await getUserOrganizationPath(userId)

      expect(result).toEqual(['org1'])
    })

    it('应该返回空数组当用户没有组织时', async () => {
      const userId = 'user1'

      mockPrisma.user.findUnique.mockResolvedValue({
        organizationId: null
      })

      const result = await getUserOrganizationPath(userId)

      expect(result).toEqual([])
    })
  })

  describe('canUserAccessOrganization', () => {
    it('应该允许管理员访问所有组织', async () => {
      const userId = 'user1'
      const targetOrgId = 'org2'

      mockPrisma.user.findUnique.mockResolvedValue({
        organizationId: 'org1'
      })

      mockPrisma.userRole.findFirst.mockResolvedValue({
        role: { code: 'ADMIN', isActive: true }
      })

      const result = await canUserAccessOrganization(userId, targetOrgId)

      expect(result).toBe(true)
    })

    it('应该允许用户访问自己组织', async () => {
      const userId = 'user1'
      const targetOrgId = 'org1'

      mockPrisma.user.findUnique.mockResolvedValue({
        organizationId: 'org1'
      })

      mockPrisma.userRole.findFirst.mockResolvedValue(null)

      const result = await canUserAccessOrganization(userId, targetOrgId)

      expect(result).toBe(true)
    })

    it('应该拒绝用户访问其他组织', async () => {
      const userId = 'user1'
      const targetOrgId = 'org2'

      mockPrisma.user.findUnique.mockResolvedValue({
        organizationId: 'org1'
      })

      mockPrisma.userRole.findFirst.mockResolvedValue(null)

      const result = await canUserAccessOrganization(userId, targetOrgId)

      expect(result).toBe(false)
    })
  })

  describe('filterByUserOrganization', () => {
    it('应该过滤出用户可访问的数据', async () => {
      const userId = 'user1'
      const data = [
        { id: 1, name: '数据1', organizationId: 'org1' },
        { id: 2, name: '数据2', organizationId: 'org2' },
        { id: 3, name: '数据3', organizationId: null }
      ]

      // Mock getUserOrganizationPath to return ['org1']
      vi.doMock('~/server/services/organization-service', async () => {
        const actual = await vi.importActual('~/server/services/organization-service')
        return {
          ...actual,
          getUserOrganizationPath: vi.fn().mockResolvedValue(['org1'])
        }
      })

      const result = await filterByUserOrganization(userId, data)

      expect(result).toHaveLength(2)
      expect(result.map(item => item.id)).toEqual([1, 3])
    })

    it('应该返回空数组当没有用户ID时', async () => {
      const data = [{ id: 1, name: '数据1', organizationId: 'org1' }]

      const result = await filterByUserOrganization('', data)

      expect(result).toHaveLength(0)
    })
  })

  describe('getOrganizationPath', () => {
    it('应该返回组织的完整路径', async () => {
      const organizationId = 'org1'

      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        id: 'org1',
        name: '子公司',
        code: 'SUB',
        level: 1,
        path: '/ROOT/SUB',
        parentId: 'root-org',
        isActive: true
      }).mockResolvedValueOnce({
        id: 'root-org',
        name: '总公司',
        code: 'ROOT',
        level: 0,
        path: '/ROOT',
        parentId: null,
        isActive: true
      })

      mockPrisma.user.count.mockResolvedValue(3)

      const result = await getOrganizationPath(organizationId)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('总公司')
      expect(result[1].name).toBe('子公司')
    })
  })
})