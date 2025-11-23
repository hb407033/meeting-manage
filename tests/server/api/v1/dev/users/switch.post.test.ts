import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { $fetch } from 'ofetch'

// Mock环境检测
vi.mock('~/server/utils/environment', () => ({
  isDevAutoLoginEnabled: () => true,
  isDevAutoLoginSafe: () => true
}))

// MockJWT工具
vi.mock('~/server/utils/jwt', () => ({
  generateTokenPair: (payload: any) => ({
    accessToken: `access-${payload.userId}`,
    refreshToken: `refresh-${payload.userId}`
  })
}))

// Mock数据库服务
vi.mock('~/server/services/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

describe('开发环境用户切换API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/v1/dev/users/switch', () => {
    it('成功切换用户应该返回token和用户信息', async () => {
      const { prisma } = await import('~/server/services/database')
      const mockUser = {
        id: 'user-1',
        name: '开发测试用户',
        email: 'dev@meeting-manage.local',
        isDevUser: true,
        userRoles: [
          {
            role: {
              name: 'ADMIN',
              rolePermissions: [
                {
                  permission: {
                    code: 'user:view'
                  }
                }
              ]
            }
          }
        ]
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser)

      const response = await $fetch('/api/v1/dev/users/switch', {
        method: 'POST',
        body: { userId: 'user-1' }
      })

      expect(response).toEqual({
        success: true,
        tokens: {
          accessToken: 'access-user-1',
          refreshToken: 'refresh-user-1'
        },
        user: {
          id: 'user-1',
          name: '开发测试用户',
          email: 'dev@meeting-manage.local',
          roles: ['ADMIN'],
          isDevUser: true
        }
      })

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          lastLoginAt: expect.any(Date),
          lastLoginIP: expect.any(String)
        }
      })
    })

    it('当用户不存在时应该返回404错误', async () => {
      const { prisma } = await import('~/server/services/database')
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(
        $fetch('/api/v1/dev/users/switch', {
          method: 'POST',
          body: { userId: 'nonexistent-user' }
        })
      ).rejects.toThrow('用户不存在')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-user' }
      })
    })

    it('当用户不是开发用户时应该返回403错误', async () => {
      const { prisma } = await import('~/server/services/database')
      const mockUser = {
        id: 'user-1',
        name: '普通用户',
        email: 'user@company.com',
        isDevUser: false,
        userRoles: []
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      await expect(
        $fetch('/api/v1/dev/users/switch', {
          method: 'POST',
          body: { userId: 'user-1' }
        })
      ).rejects.toThrow('仅允许切换开发用户')
    })

    it('当缺少userId参数时应该返回400错误', async () => {
      await expect(
        $fetch('/api/v1/dev/users/switch', {
          method: 'POST',
          body: {}
        })
      ).rejects.toThrow('缺少用户ID参数')
    })

    it('当安全检查失败时应该返回403错误', async () => {
      // 临时Mock安全检查失败
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginEnabled: () => true,
        isDevAutoLoginSafe: () => false
      }))

      await expect(
        $fetch('/api/v1/dev/users/switch', {
          method: 'POST',
          body: { userId: 'user-1' }
        })
      ).rejects.toThrow('仅在开发环境下可用')
    })

    it('当自动登录未启用时应该返回403错误', async () => {
      // 临时Mock自动登录未启用
      vi.doMock('~/server/utils/environment', () => ({
        isDevAutoLoginEnabled: () => false,
        isDevAutoLoginSafe: () => true
      }))

      await expect(
        $fetch('/api/v1/dev/users/switch', {
          method: 'POST',
          body: { userId: 'user-1' }
        })
      ).rejects.toThrow('开发环境自动登录未启用')
    })

    it('应该正确提取用户权限', async () => {
      const { prisma } = await import('~/server/services/database')
      const { generateTokenPair } = await import('~/server/utils/jwt')

      const mockUser = {
        id: 'user-1',
        name: '开发测试用户',
        email: 'dev@meeting-manage.local',
        isDevUser: true,
        userRoles: [
          {
            role: {
              name: 'MANAGER',
              rolePermissions: [
                {
                  permission: {
                    code: 'room:view'
                  }
                },
                {
                  permission: {
                    code: 'reservation:view'
                  }
                }
              ]
            }
          }
        ]
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser)

      await $fetch('/api/v1/dev/users/switch', {
        method: 'POST',
        body: { userId: 'user-1' }
      })

      expect(vi.mocked(generateTokenPair)).toHaveBeenCalledWith({
        userId: 'user-1',
        email: 'dev@meeting-manage.local',
        roles: ['MANAGER'],
        permissions: ['room:view', 'reservation:view']
      })
    })

    it('应该正确设置cookie', async () => {
      const { prisma } = await import('~/server/services/database')
      const mockUser = {
        id: 'user-1',
        name: '开发测试用户',
        email: 'dev@meeting-manage.local',
        isDevUser: true,
        userRoles: []
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser)

      // Mock setCookie函数
      const setCookieMock = vi.fn()
      global.setCookie = setCookieMock

      await $fetch('/api/v1/dev/users/switch', {
        method: 'POST',
        body: { userId: 'user-1' }
      })

      expect(setCookieMock).toHaveBeenCalledWith(
        expect.any(Object), // event object
        'auth_token',
        'access-user-1',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 3600
        })
      )

      expect(setCookieMock).toHaveBeenCalledWith(
        expect.any(Object), // event object
        'refresh_token',
        'refresh-user-1',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 604800
        })
      )
    })
  })
})