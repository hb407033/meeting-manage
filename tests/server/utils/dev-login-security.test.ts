import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  performSecurityCheck,
  getSecurityReport,
  withSecurityCheck
} from '~/server/utils/dev-login-security'

describe('开发环境自动登录安全检查', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('performSecurityCheck', () => {
    it('在安全的开发环境下应该通过检查', () => {
      // 设置安全的开发环境
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/dev_db'
      process.env.REDIS_URL = 'redis://localhost:6379'
      process.env.HOST = 'localhost'
      process.env.PORT = '3000'

      const result = performSecurityCheck()

      expect(result.safe).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.recommendations).toBeUndefined()
    })

    it('当NODE_ENV为production时应该失败', () => {
      process.env.NODE_ENV = 'production'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'

      const result = performSecurityCheck()

      expect(result.safe).toBe(false)
      expect(result.reason).toContain('NODE_ENV为production')
      expect(result.recommendations).toContain('设置NODE_ENV=development')
    })

    it('当DEV_AUTO_LOGIN_ENABLED未启用时应该失败', () => {
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'false'

      const result = performSecurityCheck()

      expect(result.safe).toBe(false)
      expect(result.reason).toContain('DEV_AUTO_LOGIN_ENABLED未设置为true')
      expect(result.recommendations).toContain('设置DEV_AUTO_LOGIN_ENABLED=true')
    })

    it('当数据库URL包含生产环境标识时应该失败', () => {
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'
      process.env.DATABASE_URL = 'mysql://user:pass@prod-db:3306/app_db'

      const result = performSecurityCheck()

      expect(result.safe).toBe(false)
      expect(result.reason).toContain('包含生产环境标识')
    })

    it('当主机包含生产域名时应该失败', () => {
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/dev_db'
      process.env.HOST = 'meeting-manage.com'

      const result = performSecurityCheck()

      expect(result.safe).toBe(false)
      expect(result.reason).toContain('包含生产域名')
    })

    it('当使用生产端口时应该失败', () => {
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/dev_db'
      process.env.HOST = 'api.example.com'
      process.env.PORT = '443'

      const result = performSecurityCheck()

      expect(result.safe).toBe(false)
      expect(result.reason).toContain('使用了生产环境端口')
    })

    it('当检测到生产环境指标时应该失败', () => {
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/dev_db'
      process.env.DEPLOY_ENV = 'production'

      const result = performSecurityCheck()

      expect(result.safe).toBe(false)
      expect(result.reason).toContain('DEPLOY_ENV设置为生产环境')
    })

    it('当多个检查失败时应该合并所有错误信息', () => {
      process.env.NODE_ENV = 'production'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'false'
      process.env.DATABASE_URL = 'mysql://user:pass@prod-db:3306/prod_db'

      const result = performSecurityCheck()

      expect(result.safe).toBe(false)
      expect(result.reason).toContain('NODE_ENV为production')
      expect(result.reason).toContain('DEV_AUTO_LOGIN_ENABLED未设置为true')
      expect(result.reason).toContain('包含生产环境标识')
      expect(result.recommendations?.length).toBeGreaterThan(2)
    })
  })

  describe('getSecurityReport', () => {
    it('应该生成完整的安全检查报告', () => {
      // 设置测试环境
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/dev_db'

      const report = getSecurityReport()

      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('environment')
      expect(report).toHaveProperty('checks')
      expect(report).toHaveProperty('overall')

      expect(report.environment).toBe('development')
      expect(report.overall.safe).toBe(true)

      // 检查各个检查项
      expect(report.checks).toHaveProperty('environmentVariables')
      expect(report.checks).toHaveProperty('databaseConnection')
      expect(report.checks).toHaveProperty('hostnameAndDomain')
      expect(report.checks).toHaveProperty('productionIndicators')
      expect(report.checks).toHaveProperty('fileSystemSafety')
    })

    it('在不安全的环境下应该包含错误信息', () => {
      // 设置不安全的测试环境
      process.env.NODE_ENV = 'production'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'false'
      process.env.DATABASE_URL = 'mysql://user:pass@prod-server:3306/prod_db'

      const report = getSecurityReport()

      expect(report.environment).toBe('production')
      expect(report.overall.safe).toBe(false)
      expect(report.overall.reason).toBeDefined()
      expect(report.overall.recommendations).toBeDefined()
      expect(report.overall.recommendations?.length).toBeGreaterThan(0)
    })
  })

  describe('withSecurityCheck', () => {
    it('当安全检查通过时应该正常执行函数', () => {
      // 设置安全环境
      process.env.NODE_ENV = 'development'
      process.env.DEV_AUTO_LOGIN_ENABLED = 'true'

      const mockFn = vi.fn().mockReturnValue('success')
      const wrappedFn = withSecurityCheck(mockFn)

      const result = wrappedFn()

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalled()
    })

    it('当安全检查失败时应该抛出错误', () => {
      // 设置不安全环境
      process.env.NODE_ENV = 'production'

      const mockFn = vi.fn()
      const wrappedFn = withSecurityCheck(mockFn)

      expect(() => wrappedFn()).toThrow('安全检查失败')
      expect(mockFn).not.toHaveBeenCalled()
    })

    it('应该支持自定义失败回调', () => {
      // 设置不安全环境
      process.env.NODE_ENV = 'production'

      const mockFn = vi.fn()
      const mockOnFail = vi.fn()
      const wrappedFn = withSecurityCheck(mockFn, {
        onFail: mockOnFail,
        logFailures: false
      })

      expect(() => wrappedFn()).toThrow()
      expect(mockOnFail).toHaveBeenCalled()
      expect(mockFn).not.toHaveBeenCalled()
    })

    it('应该支持禁用失败日志', () => {
      // 设置不安全环境
      process.env.NODE_ENV = 'production'

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockFn = vi.fn()
      const wrappedFn = withSecurityCheck(mockFn, {
        logFailures: false
      })

      try {
        wrappedFn()
      } catch {
        // 忽略错误
      }

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})