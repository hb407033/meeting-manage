import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isDevelopmentEnvironment,
  isDevAutoLoginEnabled,
  getDevUserConfig,
  isDevAutoLoginSafe
} from '~/server/utils/environment'

describe('环境检测工具函数', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isDevelopmentEnvironment', () => {
    it('当NODE_ENV为development时应该返回true', () => {
      process.env.NODE_ENV = 'development'

      const result = isDevelopmentEnvironment()

      expect(result).toBe(true)
    })

    it('当NODE_ENV为production时应该返回false', () => {
      process.env.NODE_ENV = 'production'

      const result = isDevelopmentEnvironment()

      expect(result).toBe(false)
    })

    it('当NODE_ENV未设置时应该返回false', () => {
      delete process.env.NODE_ENV

      const result = isDevelopmentEnvironment()

      expect(result).toBe(false)
    })

    it('当DEV_AUTO_LOGIN_ENABLED为true时应该返回true', () => {
      process.env.NODE_ENV = 'production'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'

      const result = isDevelopmentEnvironment()

      expect(result).toBe(true)
    })
  })

  describe('isDevAutoLoginEnabled', () => {
    beforeEach(() => {
      // Mock useRuntimeConfig
      vi.mocked(useRuntimeConfig).mockReturnValue({
        devAutoLoginEnabled: true,
        public: {
          devAutoLoginEnabled: true,
          isDevelopment: true
        }
      } as any)
    })

    it('在开发环境且启用自动登录时应该返回true', () => {
      process.env.NODE_ENV = 'development'

      const result = isDevAutoLoginEnabled()

      expect(result).toBe(true)
    })

    it('在生产环境下应该返回false', () => {
      process.env.NODE_ENV = 'production'

      const result = isDevAutoLoginEnabled()

      expect(result).toBe(false)
    })

    it('在开发环境但自动登录禁用时应该返回false', () => {
      process.env.NODE_ENV = 'development'

      vi.mocked(useRuntimeConfig).mockReturnValue({
        devAutoLoginEnabled: false,
        public: {
          devAutoLoginEnabled: false,
          isDevelopment: true
        }
      } as any)

      const result = isDevAutoLoginEnabled()

      expect(result).toBe(false)
    })
  })

  describe('getDevUserConfig', () => {
    beforeEach(() => {
      vi.mocked(useRuntimeConfig).mockReturnValue({
        devUserEmail: 'test@example.com',
        devUserName: '测试用户',
        devUserRole: 'ADMIN'
      } as any)
    })

    it('应该返回正确的开发用户配置', () => {
      const config = getDevUserConfig()

      expect(config).toEqual({
        email: 'test@example.com',
        name: '测试用户',
        role: 'ADMIN'
      })
    })

    it('当配置不存在时应该使用默认值', () => {
      vi.mocked(useRuntimeConfig).mockReturnValue({} as any)

      const config = getDevUserConfig()

      expect(config).toEqual({
        email: 'dev@meeting-manage.local',
        name: '开发测试用户',
        role: 'ADMIN'
      })
    })
  })

  describe('isDevAutoLoginSafe', () => {
    it('在生产环境下应该返回false', () => {
      process.env.NODE_ENV = 'production'

      const result = isDevAutoLoginSafe()

      expect(result).toBe(false)
    })

    it('当数据库URL包含prod时应该返回false', () => {
      process.env.NODE_ENV = 'development'
      process.env.DATABASE_URL = 'mysql://user:pass@prod-db:3306/db'

      const result = isDevAutoLoginSafe()

      expect(result).toBe(false)
    })

    it('当Redis URL包含prod时应该返回false', () => {
      process.env.NODE_ENV = 'development'
      process.env.REDIS_URL = 'redis://prod-redis:6379'

      const result = isDevAutoLoginSafe()

      expect(result).toBe(false)
    })

    it('当主机包含生产域名时应该返回false', () => {
      process.env.NODE_ENV = 'development'
      process.env.HOST = 'meeting-manage.com'

      const result = isDevAutoLoginSafe()

      expect(result).toBe(false)
    })

    it('在安全的开发环境下应该返回true', () => {
      process.env.NODE_ENV = 'development'
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db'
      process.env.REDIS_URL = 'redis://localhost:6379'
      process.env.HOST = 'localhost'

      const result = isDevAutoLoginSafe()

      expect(result).toBe(true)
    })
  })
})