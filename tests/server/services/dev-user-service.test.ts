import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ensureDevUserExists,
  validateDevUserPermissions,
  getDevUsers,
  cleanupDevUsers,
  resetDevUserPassword
} from '~/server/services/dev-user-service'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn()
}))

describe('开发用户服务', () => {
  let prismaMock: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Prisma Client
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn()
      },
      role: {
        findUnique: vi.fn(),
        create: vi.fn()
      },
      userRole: {
        create: vi.fn()
      },
      $disconnect: vi.fn()
    }

    // Mock the PrismaClient constructor
    vi.mocked(PrismaClient).mockImplementation(() => prismaMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ensureDevUserExists', () => {
    it('当用户已存在时应该返回用户信息', async () => {
      // Mock环境检测
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginEnabled: () => true,
        isDevAutoLoginSafe: () => true,
        getDevUserConfig: () => ({
          email: 'dev@meeting-manage.local',
          name: '开发测试用户',
          role: 'ADMIN'
        })
      }))

      const mockUser = {
        id: 'user-1',
        email: 'dev@meeting-manage.local',
        name: '开发测试用户',
        isDevUser: true,
        userRoles: [
          {
            role: {
              name: 'ADMIN'
            }
          }
        ]
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser)

      const result = await ensureDevUserExists()

      expect(result).toEqual({
        id: 'user-1',
        email: 'dev@meeting-manage.local',
        name: '开发测试用户',
        roles: ['ADMIN'],
        isDevUser: true
      })

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'dev@meeting-manage.local' },
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      })
    })

    it('当用户不存在时应该创建新用户', async () => {
      // Mock环境检测和用户创建
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginEnabled: () => true,
        isDevAutoLoginSafe: () => true,
        getDevUserConfig: () => ({
          email: 'new-dev@meeting-manage.local',
          name: '新开发用户',
          role: 'USER'
        })
      }))

      // Mock用户不存在
      prismaMock.user.findUnique.mockResolvedValue(null)

      // Mock角色存在
      const mockRole = {
        id: 'role-1',
        name: 'USER'
      }
      prismaMock.role.findUnique.mockResolvedValue(mockRole)

      // Mock用户创建
      const createdUser = {
        id: 'user-2',
        email: 'new-dev@meeting-manage.local',
        name: '新开发用户',
        isDevUser: true
      }
      prismaMock.user.create.mockResolvedValue(createdUser)

      // Mock用户角色创建
      const userRole = {
        id: 'ur-1',
        userId: 'user-2',
        roleId: 'role-1'
      }
      prismaMock.userRole.create.mockResolvedValue(userRole)

      const result = await ensureDevUserExists()

      expect(result).toEqual({
        id: 'user-2',
        email: 'new-dev@meeting-manage.local',
        name: '新开发用户',
        roles: ['USER'],
        isDevUser: true
      })

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new-dev@meeting-manage.local',
          name: '新开发用户',
          password: 'dev123456',
          passwordHash: expect.any(String),
          isDevUser: true,
          devUserNote: '开发环境自动登录用户 - 角色: USER',
          authMethod: 'LOCAL',
          isActive: true,
          organizationId: null
        }
      })
    })

    it('当安全检查失败时应该返回null', async () => {
      // Mock安全检查失败
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginEnabled: () => true,
        isDevAutoLoginSafe: () => false
      }))

      const result = await ensureDevUserExists()

      expect(result).toBeNull()
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('validateDevUserPermissions', () => {
    it('管理员用户应该拥有所有权限', () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@dev.com',
        name: '管理员',
        roles: ['ADMIN'],
        isDevUser: true
      }

      const result = validateDevUserPermissions(adminUser)

      expect(result).toBe(true)
    })

    it('经理用户应该拥有大部分权限', () => {
      const managerUser = {
        id: 'manager-1',
        email: 'manager@dev.com',
        name: '经理',
        roles: ['MANAGER'],
        isDevUser: true
      }

      const result = validateDevUserPermissions(managerUser)

      expect(result).toBe(true)
    })

    it('普通用户应该拥有基础权限', () => {
      const normalUser = {
        id: 'user-1',
        email: 'user@dev.com',
        name: '普通用户',
        roles: ['USER'],
        isDevUser: true
      }

      const result = validateDevUserPermissions(normalUser)

      expect(result).toBe(true)
    })

    it('非开发用户不应该有权限', () => {
      const nonDevUser = {
        id: 'nondev-1',
        email: 'nondev@company.com',
        name: '非开发用户',
        roles: ['USER'],
        isDevUser: false
      }

      const result = validateDevUserPermissions(nonDevUser)

      expect(result).toBe(false)
    })
  })

  describe('getDevUsers', () => {
    it('应该返回所有开发用户列表', async () => {
      const mockDevUsers = [
        {
          id: 'user-1',
          email: 'dev1@meeting-manage.local',
          name: '开发用户1',
          isDevUser: true,
          userRoles: [
            {
              role: {
                name: 'ADMIN'
              }
            }
          ]
        },
        {
          id: 'user-2',
          email: 'dev2@meeting-manage.local',
          name: '开发用户2',
          isDevUser: true,
          userRoles: [
            {
              role: {
                name: 'USER'
              }
            }
          ]
        }
      ]

      prismaMock.user.findMany.mockResolvedValue(mockDevUsers)

      const result = await getDevUsers()

      expect(result).toEqual([
        {
          id: 'user-1',
          email: 'dev1@meeting-manage.local',
          name: '开发用户1',
          roles: ['ADMIN'],
          isDevUser: true
        },
        {
          id: 'user-2',
          email: 'dev2@meeting-manage.local',
          name: '开发用户2',
          roles: ['USER'],
          isDevUser: true
        }
      ])

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          isDevUser: true
        },
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      })
    })

    it('当数据库错误时应该返回空数组', async () => {
      prismaMock.user.findMany.mockRejectedValue(new Error('数据库连接失败'))

      const result = await getDevUsers()

      expect(result).toEqual([])
    })
  })

  describe('cleanupDevUsers', () => {
    it('应该删除所有开发用户', async () => {
      // Mock安全检查通过
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginSafe: () => true
      }))

      prismaMock.user.deleteMany.mockResolvedValue({ count: 5 })

      await cleanupDevUsers()

      expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
        where: {
          isDevUser: true
        }
      })
    })

    it('当安全检查失败时应该抛出错误', async () => {
      // Mock安全检查失败
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginSafe: () => false
      }))

      await expect(cleanupDevUsers()).rejects.toThrow('仅限开发环境下才能执行清理操作')
    })
  })

  describe('resetDevUserPassword', () => {
    it('应该重置指定开发用户的密码', async () => {
      // Mock安全检查通过
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginSafe: () => true
      }))

      // Mock bcrypt
      vi.mock('bcryptjs', () => ({
        default: {
          hash: vi.fn().mockResolvedValue('hashed-password')
        }
      }))

      prismaMock.user.updateMany.mockResolvedValue({ count: 1 })

      await resetDevUserPassword('dev@meeting-manage.local')

      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: {
          email: 'dev@meeting-manage.local',
          isDevUser: true
        },
        data: {
          password: 'dev123456',
          passwordHash: 'hashed-password'
        }
      })
    })

    it('当安全检查失败时应该抛出错误', async () => {
      // Mock安全检查失败
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginSafe: () => false
      }))

      await expect(resetDevUserPassword('dev@meeting-manage.local')).rejects.toThrow(
        '仅限开发环境下才能重置密码'
      )
    })
  })
})